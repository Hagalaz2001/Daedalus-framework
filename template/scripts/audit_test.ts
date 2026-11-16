import { assertEquals } from "jsr:@std/assert@1";
import { decideAudit, reportedAdvisories } from "./audit.ts";

const report =
  "\u001b[31mvuln\u001b[0m  https://github.com/advisories/GHSA-abcd-2345-wxyz\n  https://github.com/advisories/GHSA-abcd-2345-wxyz\n  https://github.com/advisories/GHSA-qqqq-2345-wxyz";

Deno.test("reportedAdvisories strips colour and de-duplicates", () => {
  assertEquals(reportedAdvisories(report), ["GHSA-abcd-2345-wxyz", "GHSA-qqqq-2345-wxyz"]);
});

Deno.test("a failing audit passes only when every advisory is declared", () => {
  assertEquals(decideAudit(false, report, ["GHSA-abcd-2345-wxyz", "GHSA-qqqq-2345-wxyz"]).ok, true);
  assertEquals(decideAudit(false, report, ["GHSA-abcd-2345-wxyz"]).unexpected, ["GHSA-qqqq-2345-wxyz"]);
  assertEquals(decideAudit(false, report, ["GHSA-abcd-2345-wxyz"]).ok, false);
});

Deno.test("a failure with no advisory (network error) stays a failure", () => {
  assertEquals(decideAudit(false, "error: could not reach registry", ["GHSA-abcd-2345-wxyz"]).ok, false);
  assertEquals(decideAudit(true, "", []).ok, true);
});
