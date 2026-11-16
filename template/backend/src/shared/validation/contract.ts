import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { parse } from "@std/yaml";
import type { Context, MiddlewareHandler } from "hono";
import { badRequest } from "../errors/problem.ts";
import type { AppEnv } from "../http/types.ts";

export interface FieldProblem {
  path: string;
  message: string;
}

type Json = Record<string, unknown>;
type Check = (data: unknown) => FieldProblem[];

const METHODS = ["get", "post", "put", "patch", "delete"];
const ptr = (...parts: string[]) =>
  parts.map((p) => encodeURIComponent(p.replaceAll("~", "~0").replaceAll("/", "~1"))).join("/");

/**
 * contracts/openapi.yaml loaded at boot and used as the validator: request bodies and query strings are checked
 * against the very JSON Schemas the clients are generated from, so there is no second copy (zod, hand-written
 * types) that can drift. Ajv (MIT) is the JSON Schema engine.
 */
export class Contract {
  private strict = new Ajv2020({ strict: false, allErrors: true });
  private coercing = new Ajv2020({ strict: false, allErrors: true, coerceTypes: "array", useDefaults: true });
  private checks = new Map<string, Check>();
  private queries = new Map<string, ValidateFunction>();

  constructor(readonly doc: Json) {
    for (const ajv of [this.strict, this.coercing]) {
      addFormats.default(ajv);
      ajv.addSchema({ $id: "contract", ...doc });
    }
  }

  static async load(file = new URL("../../../../contracts/openapi.yaml", import.meta.url)) {
    return new Contract(parse(await Deno.readTextFile(file)) as Json);
  }

  /** Every `[METHOD, "/path/{param}"]` the contract declares. */
  operations(): [string, string][] {
    return Object.entries(this.doc["paths"] as Json).flatMap(([path, item]) =>
      Object.keys(item as Json).filter((m) => METHODS.includes(m)).map((m) =>
        [m.toUpperCase(), path] as [string, string]
      )
    );
  }

  /** Hono path (`/notes/:id`) to contract path (`/notes/{id}`). */
  static toContractPath = (honoPath: string) => honoPath.replace(/:(\w+)/g, "{$1}");

  /** Path parameters of a request. Global middleware cannot use `c.req.param()` (it belongs to the "*" route), so match the pattern. */
  static pathParams(pattern: string, pathname: string): Record<string, string> {
    const url = pathname.split("/");
    return Object.fromEntries(
      pattern.split("/").flatMap((seg, i) =>
        seg.startsWith(":") ? [[seg.slice(1), decodeURIComponent(url[i] ?? "")]] : []
      ),
    );
  }

  /** The operation a request is routed to: the first matched route that the contract declares (`/admin/resources` before `/admin/:resource`). */
  operationOf(c: Context<AppEnv>): { pattern: string; path: string } | undefined {
    for (const r of c.req.matchedRoutes) {
      const path = Contract.toContractPath(r.path);
      if (this.has(c.req.method, path)) return { pattern: r.path, path };
    }
  }

  has(method: string, path: string) {
    const item = (this.doc["paths"] as Json)[path] as Json | undefined;
    return !!item?.[method.toLowerCase()];
  }

  private operation(method: string, path: string): Json {
    return ((this.doc["paths"] as Json)[path] as Json)[method.toLowerCase()] as Json;
  }

  private compile(key: string, ajv: Ajv2020, schemaPath: string): Check {
    let check = this.checks.get(key);
    if (!check) {
      const validate = ajv.getSchema(`contract#/${schemaPath}`);
      if (!validate) throw new Error(`Contract has no schema at ${schemaPath}`);
      check = (data) => validate(data) ? [] : toProblems(validate.errors);
      this.checks.set(key, check);
    }
    return check;
  }

  /** Problems with the JSON body (`undefined` = no body sent); null when the operation declares no JSON body. */
  validateBody(method: string, path: string, body: unknown): FieldProblem[] | null {
    const spec = this.operation(method, path)["requestBody"] as Json | undefined;
    if (!(spec?.["content"] as Json | undefined)?.["application/json"]) return null;
    if (body === undefined) return spec?.["required"] ? [{ path: "", message: "a JSON body is required" }] : [];
    const at = ptr("paths", path, method.toLowerCase(), "requestBody", "content", "application/json", "schema");
    return this.compile(`body ${method} ${path}`, this.strict, at)(body);
  }

  /** Coerces and checks query or path parameters (`?limit=5` becomes the number 5, defaults are filled in). */
  validateParams(method: string, path: string, where: "query" | "path", values: Record<string, unknown>) {
    const value = structuredClone(values);
    const key = `${where} ${method} ${path}`;
    let validate = this.queries.get(key);
    if (!validate) {
      const params = [
        ...(((this.doc["paths"] as Json)[path] as Json)["parameters"] as Json[] ?? []),
        ...(this.operation(method, path)["parameters"] as Json[] ?? []),
      ].map((p) => this.resolve(p)).filter((p) => p["in"] === where);
      validate = this.coercing.compile({
        type: "object",
        properties: Object.fromEntries(params.map((p) => [p["name"], p["schema"]])),
        required: params.filter((p) => p["required"]).map((p) => p["name"]),
      });
      this.queries.set(key, validate);
    }
    const ok = validate(value);
    return { value, problems: ok ? [] : toProblems(validate.errors) };
  }

  private resolve(node: Json): Json {
    const ref = node["$ref"] as string | undefined;
    return ref ? ref.slice(2).split("/").reduce<Json>((acc, k) => acc[k] as Json, this.doc) : node;
  }

  /** For contract tests: does this response body match what the contract promises? */
  validateResponse(method: string, path: string, status: number, body: unknown, mediaType = "application/json") {
    const response = (this.operation(method, path)["responses"] as Json)[String(status)] as Json | undefined;
    const base = !response
      ? undefined
      : response["$ref"]
      ? String(response["$ref"]).slice(2)
      : `paths/${ptr(path)}/${method.toLowerCase()}/responses/${status}`;
    const schema = response &&
      ((this.resolve(response)["content"] as Json | undefined)?.[mediaType] as Json | undefined)?.["schema"];
    if (!base || !schema) {
      return [{ path: "", message: `the contract has no ${mediaType} response ${status} for ${method} ${path}` }];
    }
    return this.compile(
      `res ${method} ${path} ${status} ${mediaType}`,
      this.strict,
      `${base}/content/${ptr(mediaType)}/schema`,
    )(body);
  }
}

function toProblems(
  errors: { instancePath: string; params: Record<string, unknown>; message?: string }[] | null | undefined,
) {
  return (errors ?? []).map((e) => ({
    path: e.instancePath.slice(1) || String(e.params["missingProperty"] ?? ""),
    message: e.message ?? "invalid",
  }));
}

/** Rejects requests that do not match the contract, before the route handler runs. */
export const contractMiddleware = (contract: Contract): MiddlewareHandler<AppEnv> => async (c, next) => {
  const op = contract.operationOf(c);
  if (op) {
    const { path, pattern } = op;
    if (c.req.method !== "GET" && c.req.method !== "DELETE") {
      const raw = await c.req.text();
      let body: unknown;
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          throw badRequest("Request body is not valid JSON");
        }
      }
      const problems = contract.validateBody(c.req.method, path, body);
      if (problems?.length) throw badRequest("Request body does not match the contract", problems);
      c.set("body", body);
    }
    const pathCheck = contract.validateParams(
      c.req.method,
      path,
      "path",
      Contract.pathParams(pattern, new URL(c.req.url).pathname),
    );
    if (pathCheck.problems.length) throw badRequest("Path parameters do not match the contract", pathCheck.problems);
    const { value, problems } = contract.validateParams(
      c.req.method,
      path,
      "query",
      Object.fromEntries(new URL(c.req.url).searchParams),
    );
    if (problems.length) throw badRequest("Query string does not match the contract", problems);
    c.set("query", value);
  }
  await next();
};
