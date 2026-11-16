import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { validateGitInput } from "./git-setup.ts";
import { scanFile } from "./secret-scan.ts";

Deno.test("validateGitInput accepts normal input", () => {
  validateGitInput({ name: "Ada Lovelace", email: "ada@example.com", remote: "git@example.com:acme/shop.git" });
});

Deno.test("validateGitInput rejects shell syntax and option injection", () => {
  assertThrows(() => validateGitInput({ remote: "x & calc" }));
  assertThrows(() => validateGitInput({ remote: "$(id)" }));
  assertThrows(() => validateGitInput({ remote: "--upload-pack=evil" }));
  assertThrows(() => validateGitInput({ email: "a@example.com & calc" }));
  assertThrows(() => validateGitInput({ name: "--exec=x" }));
});

Deno.test("scanFile blocks env files and key patterns, allows .env.example", () => {
  assertEquals(scanFile(".env", null).length, 1);
  assertEquals(scanFile(".env.example", "KEY=").length, 0);
  assertEquals(scanFile("a.ts", "const k = 'AKIA" + "ABCDEFGHIJKLMNOP';").length, 1);
  assertEquals(scanFile("a.ts", "nothing here").length, 0);
});
