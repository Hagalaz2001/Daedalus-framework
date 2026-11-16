// deno-lint-ignore-file no-import-prefix
import { assertEquals } from "jsr:@std/assert@1";
import { ccCandidates, nasmFormat } from "./run.ts";

Deno.test("CC from the environment is tried first and split into arguments", () => {
  assertEquals(ccCandidates("zig cc")[0], ["zig", "cc"]);
  assertEquals(ccCandidates(undefined)[0], ["cc"]);
});

Deno.test("NASM output format follows the host OS", () => {
  assertEquals(nasmFormat("windows"), "win64");
  assertEquals(nasmFormat("darwin"), "macho64");
  assertEquals(nasmFormat("linux"), "elf64");
});
