// Parsing of `deno audit` output for `deno task check`. Deno's own --ignore only matches CVE ids, which most npm
// advisories lack, so the text report is parsed for GHSA ids instead.
export interface AuditDecision {
  ok: boolean;
  /** Advisory ids found in the report. */
  reported: string[];
  /** Reported ids that no stack declared. */
  unexpected: string[];
}

// deno-lint-ignore no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;
export const stripAnsi = (s: string) => s.replace(ANSI, "");

/** Advisory ids (GHSA-...) mentioned in a `deno audit` report. */
export const reportedAdvisories = (
  text: string,
): string[] => [...new Set([...stripAnsi(text).matchAll(/advisories\/(GHSA-[a-z0-9-]+)/g)].map((m) => m[1]))];

/**
 * Passes when deno audit succeeded, or when it failed only because of advisories a stack declared in stack.json
 * `audit.ignore`. A failure with no parsable advisory (network, registry error) stays a failure.
 */
export function decideAudit(exitOk: boolean, text: string, allowed: string[]): AuditDecision {
  const reported = reportedAdvisories(text);
  const unexpected = reported.filter((id) => !allowed.includes(id));
  return { ok: exitOk || (reported.length > 0 && unexpected.length === 0), reported, unexpected };
}
