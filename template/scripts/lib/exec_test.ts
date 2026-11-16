import { assertEquals } from "jsr:@std/assert@1";
import { isGitRemote, runArgs, shell, tailOf } from "./exec.ts";

Deno.test("runArgs passes metacharacters as plain text", () => {
  const r = runArgs(Deno.execPath(), ["eval", "console.log(Deno.args[0])", "x & calc $(id) %PATH%"], { capture: true });
  assertEquals(r.ok, true);
  assertEquals(r.stdout.trim(), "x & calc $(id) %PATH%");
});

Deno.test("shell captures output and exit code", () => {
  const r = shell("exit 3", { capture: true });
  assertEquals([r.ok, r.code], [false, 3]);
});

Deno.test("tailOf keeps the last lines", () => {
  assertEquals(tailOf("a\nb\nc\n", 2), "b\nc");
});

Deno.test("isGitRemote accepts urls and rejects shell syntax", () => {
  for (const ok of ["https://example.com/a/b.git", "git@example.com:a/b.git"]) assertEquals(isGitRemote(ok), true);
  for (const bad of ["x & calc", "$(id)", "-oProxyCommand=x", "a b", "a;b", "a`b`", "%PATH%"]) {
    assertEquals(isGitRemote(bad), false);
  }
});
