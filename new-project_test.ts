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
