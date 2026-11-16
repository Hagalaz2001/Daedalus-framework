// Contract of the machine interface: `--json` prints exactly one JSON document on stdout and uses documented exit codes.
import { assert, assertEquals } from "jsr:@std/assert@1";

async function cli(...args: string[]) {
  const o = await new Deno.Command(Deno.execPath(), { args: ["run", "-A", "cli.ts", ...args, "--json"], stdout: "piped", stderr: "piped" }).output();
  return { code: o.code, json: JSON.parse(new TextDecoder().decode(o.stdout)) };
}

Deno.test("json: list succeeds with the documented shape", async () => {
  const { code, json } = await cli("list", "stacks");
  assertEquals([code, json.ok, json.command, json.kind], [0, true, "list", "stack"]);
  assert(Array.isArray(json.items) && json.items.every((i: Record<string, string>) => i.id && i.kind === "stack" && "description" in i));
  assert(Array.isArray(json.steps));
});

Deno.test("json: invalid input exits 2 with kind usage", async () => {
  const { code, json } = await cli("new", "somewhere-new", "--yes", "--mobile", "swift");
  assertEquals([code, json.ok, json.error.kind], [2, false, "usage"]);
  assert(json.error.message.includes("--mobile"));
});

Deno.test("json: unknown item and unknown project exit 2", async () => {
  assertEquals((await cli("describe", "stack", "nope")).code, 2);
  assertEquals((await cli("check", Deno.makeTempDirSync())).code, 2);
});

Deno.test("json: docs search returns ranked paths", async () => {
  const { json } = await cli("docs", "architecture boundaries");
  assertEquals(json.ok, true);
  assert(json.results.length > 0 && typeof json.results[0].path === "string" && typeof json.results[0].score === "number");
});

Deno.test("json: a Postgres-only module is refused with --db mongodb (exit 2) before anything is written", async () => {
  const dir = `${Deno.makeTempDirSync()}/never-created`;
  const { code, json } = await cli("new", dir, "--yes", "--db", "mongodb", "--modules", "jobs", "--backend", "hono");
  assertEquals([code, json.error.kind], [2, "usage"]);
  assert(json.error.message.includes("--db postgres"));
  assertEquals(Deno.statSync(dir.replace("/never-created", "")).isDirectory, true);
  assertEquals((() => { try { Deno.statSync(dir); return true; } catch { return false; } })(), false);
});

Deno.test("json: --db mongodb needs the backend", async () => {
  const { code } = await cli("new", `${Deno.makeTempDirSync()}/x`, "--yes", "--db", "mongodb", "--backend", "none");
  assertEquals(code, 2);
});
