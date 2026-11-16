// Consent records, append-only: a new decision supersedes the older one for the same subject and purpose.
// Legal bases other than consent (treatment, contract, legal obligation) are a separate decision: ask counsel.

export interface ConsentRecord {
  subjectId: string;
  /** A specific, named purpose, e.g. "research-study-12", "marketing-email". Never "everything". */
  purpose: string;
  decision: "granted" | "withdrawn";
  decidedAt: string; // ISO 8601
  expiresAt?: string;
  /** How it was captured (form version, channel), for evidence. */
  evidence: string;
}

export function hasConsent(
  records: readonly ConsentRecord[],
  subjectId: string,
  purpose: string,
  at: Date = new Date(),
): boolean {
  const latest = records
    .filter((r) => r.subjectId === subjectId && r.purpose === purpose && Date.parse(r.decidedAt) <= at.getTime())
    .sort((a, b) => Date.parse(b.decidedAt) - Date.parse(a.decidedAt))[0];
  if (!latest || latest.decision !== "granted") return false;
  return !latest.expiresAt || Date.parse(latest.expiresAt) > at.getTime();
}
