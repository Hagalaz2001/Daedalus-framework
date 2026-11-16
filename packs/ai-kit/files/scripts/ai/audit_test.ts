// deno-lint-ignore-file no-import-prefix
import { assertEquals } from "jsr:@std/assert@1";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classify, licenseReport } from "./audit.ts";

Deno.test("classify licences", () => {
  for (const l of ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause", "MIT OR GPL-3.0", "(MIT AND CC-BY-3.0)", "0BSD"]) {
    assertEquals(classify(l), "ok", l);
  }
  for (const l of ["GPL-3.0", "AGPL-3.0-only", "SSPL-1.0", "BUSL-1.1", "UNLICENSED", "GPL-2.0 OR LGPL-3.0"]) {
    assertEquals(classify(l), "blocked", l);
  }
  assertEquals(classify(undefined), "unknown");
});

Deno.test("scans node_modules including scopes and nested", () => {
  const nm = join(mkdtempSync(join(tmpdir(), "audit-")), "node_modules");
  const add = (dir: string, j: object) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify(j));
  };
  add(join(nm, "a"), { name: "a", version: "1.0.0", license: "MIT" });
  add(join(nm, "@s", "b"), { name: "@s/b", version: "2.0.0", license: "AGPL-3.0" });
  add(join(nm, "a", "node_modules", "c"), { name: "c", version: "3.0.0" });
  assertEquals(licenseReport(nm), { blocked: ["@s/b@2.0.0: AGPL-3.0"], unknown: ["c@3.0.0"] });
  assertEquals(licenseReport(nm, ["@s/b"]).blocked, []);
});
