// deno-lint-ignore-file no-import-prefix
import { assertEquals, assertFalse } from "jsr:@std/assert@1";
import { type ConsentRecord, hasConsent } from "./consent.ts";
import { phi, redact } from "./phi.ts";

Deno.test("Phi hides its value from every implicit conversion", () => {
  const name = phi("Jane Synthetic");
  assertEquals(`${name}`, "[PHI]");
  assertEquals(String(name), "[PHI]");
  assertEquals(JSON.stringify({ name }), '{"name":"[PHI]"}');
  assertEquals(Deno.inspect({ name }), "{ name: [PHI] }");
  assertEquals("x" + name, "x[PHI]");
  assertEquals(name.reveal(), "Jane Synthetic");
});

Deno.test("redact replaces only the listed fields and does not mutate", () => {
  const rec = { id: "1", name: "Jane", dob: "1990-01-01" };
  assertEquals(redact(rec, ["name", "dob"]), { id: "1", name: "[REDACTED]", dob: "[REDACTED]" });
  assertEquals(rec.name, "Jane");
});

const rec = (decision: "granted" | "withdrawn", decidedAt: string, expiresAt?: string): ConsentRecord => ({
  subjectId: "p1",
  purpose: "research",
  decision,
  decidedAt,
  expiresAt,
  evidence: "form v2",
});

Deno.test("consent: latest decision wins, expiry and purpose respected", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  assertFalse(hasConsent([], "p1", "research", now));
  assertEquals(hasConsent([rec("granted", "2026-01-01T00:00:00Z")], "p1", "research", now), true);
  assertFalse(
    hasConsent(
      [rec("granted", "2026-01-01T00:00:00Z"), rec("withdrawn", "2026-02-01T00:00:00Z")],
      "p1",
      "research",
      now,
    ),
  );
  assertEquals(
    hasConsent(
      [rec("withdrawn", "2026-01-01T00:00:00Z"), rec("granted", "2026-02-01T00:00:00Z")],
      "p1",
      "research",
      now,
    ),
    true,
  );
  assertFalse(hasConsent([rec("granted", "2026-01-01T00:00:00Z", "2026-05-01T00:00:00Z")], "p1", "research", now));
  assertFalse(hasConsent([rec("granted", "2026-01-01T00:00:00Z")], "p1", "marketing", now));
  assertFalse(
    hasConsent([rec("granted", "2026-07-01T00:00:00Z")], "p1", "research", now),
    "future decisions do not count yet",
  );
});
