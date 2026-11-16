import { assert, assertEquals, assertThrows } from "@std/assert";
import { sql } from "drizzle-orm";
import { seed } from "../../../scripts/seed.ts";
import { ConfigError, loadConfig } from "../config/config.ts";
import { Contract } from "../validation/contract.ts";
import { createTestApp } from "../testing.ts";

const t = await createTestApp();

Deno.test("every route is in the contract and every contract operation has a route", () => {
  const infra = ["/api/auth/*", "/docs", "/openapi.json"];
  const routes = new Set(
    t.app.routes.filter((r) => r.method !== "ALL" && !infra.includes(r.path)).map((r) =>
      `${r.method} ${Contract.toContractPath(r.path)}`
    ),
  );
  const documented = new Set(t.deps.contract.operations().map(([m, p]) => `${m} ${p}`));
  const sorted = (s: Set<string>) =>
    [...s].filter((x) => !x.startsWith("GET /api/auth") && !x.startsWith("POST /api/auth")).sort();
  assertEquals(sorted(routes), sorted(documented));
});

Deno.test("migrations create the base schema", async () => {
  const rows = await t.db.execute(sql`select table_name from information_schema.tables where table_schema = 'public'`);
  const names = (rows as unknown as { rows: { table_name: string }[] }).rows.map((r) => r.table_name);
  for (
    const table of [
      "user",
      "session",
      "organization",
      "member",
      "invitation",
      "audit_log",
      "files",
      "notifications",
      "notes",
    ]
  ) {
    assert(names.includes(table), `missing table ${table}`);
  }
});

Deno.test("health, readiness, docs and the contract are served", async () => {
  assertEquals(await (await t.app.request("/health")).json(), { status: "ok" });
  assertEquals((await t.app.request("/ready")).status, 200);
  const docs = await t.app.request("/docs");
  assertEquals(docs.status, 200);
  assert(docs.headers.get("content-security-policy")?.includes("cdn.jsdelivr.net"));
  assertEquals((await (await t.app.request("/openapi.json")).json()).openapi, "3.1.0");
});

Deno.test("unknown routes and malformed JSON are problem+json with a request id", async () => {
  const missing = await t.app.request("/nope", { headers: { "x-request-id": "req-123" } });
  assertEquals(missing.status, 404);
  assertEquals(missing.headers.get("content-type"), "application/problem+json");
  const body = await missing.json();
  assertEquals([body.type, body.status, body.requestId], ["about:blank", 404, "req-123"]);
  assertEquals(t.deps.contract.validateResponse("GET", "/notes", 401, body, "application/problem+json"), []);

  const user = await t.signUp();
  const bad = await t.app.request("/notes", { method: "POST", headers: user.headers, body: "{nope" });
  assertEquals(bad.status, 400);
});

Deno.test("API responses carry security headers and no CSP relaxations", async () => {
  const res = await t.app.request("/health");
  assertEquals(res.headers.get("x-content-type-options"), "nosniff");
  assertEquals(res.headers.get("content-security-policy")?.startsWith("default-src 'none'"), true);
  assert(res.headers.get("x-request-id"));
});

Deno.test("CORS only allows trusted origins", async () => {
  const ok = await t.app.request("/health", { headers: { origin: "http://localhost:5173" } });
  assertEquals(ok.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const bad = await t.app.request("/health", { headers: { origin: "https://evil.example" } });
  assertEquals(bad.headers.get("access-control-allow-origin"), null);
});

Deno.test("rate limit answers 429 problem+json with Retry-After", async () => {
  const limited = await createTestApp({ RATE_LIMIT_PER_MINUTE: "2" });
  await limited.app.request("/health");
  await limited.app.request("/health");
  const res = await limited.app.request("/health");
  assertEquals(res.status, 429);
  assert(res.headers.get("retry-after"));
  assertEquals((await res.json()).title, "Too Many Requests");
  await limited.close();
});

Deno.test("config is validated at boot and reports every problem", () => {
  const err = assertThrows(() => loadConfig({ APP_ENV: "production", PORT: "abc" }), ConfigError);
  assertEquals(err.problems.length, 4);
  assertEquals(loadConfig({}).env, "development");
});

Deno.test("seed creates fake data once and the seeded user can sign in", async () => {
  const fresh = await createTestApp();
  assertEquals((await seed(fresh.db, fresh.deps.auth, fresh.deps.config)).created, true);
  assertEquals((await seed(fresh.db, fresh.deps.auth, fresh.deps.config)).created, false);
  const res = await fresh.app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: fresh.json,
    body: JSON.stringify({ email: "ada@example.com", password: "password1234" }),
  });
  const token = res.headers.get("set-auth-token")!;
  const me = await (await fresh.app.request("/me", { headers: { authorization: `Bearer ${token}` } })).json();
  assertEquals(me.organizations.map((o: { role: string }) => o.role).sort(), ["owner", "owner"]);
  const notes = await fresh.app.request("/notes", {
    headers: {
      authorization: `Bearer ${token}`,
      "x-organization-id": me.organizations.find((o: { name: string }) => o.name === "Acme Notes").id,
    },
  });
  assertEquals((await notes.json()).length, 12);
  await fresh.close();
});

addEventListener("unload", () => void t.close());
