// KYC, AML and sanctions screening are interfaces only. This pack does not implement them and does not decide who may
// be onboarded. Plug in a licensed provider (identity verification, sanctions and PEP lists, transaction monitoring)
// and keep a human compliance officer in charge of every decision that blocks, freezes or reports a customer.
// Whether and how you must do KYC/AML depends on your licence and jurisdiction: ask a compliance professional.

export type CheckStatus = "clear" | "review" | "blocked";
export interface CheckResult {
  status: CheckStatus;
  /** Provider's own case or reference id, stored for the audit trail. */
  providerRef: string;
  /** Reasons in words a compliance officer can read. Never store raw documents here. */
  reasons: string[];
}

export interface KycProvider {
  /** Start verification for a customer. Return a reference; results arrive by webhook or polling. */
  startVerification(customerId: string, level: "basic" | "enhanced"): Promise<{ providerRef: string }>;
  getResult(providerRef: string): Promise<CheckResult>;
}

export interface SanctionsScreener {
  screen(subject: { customerId: string; name: string; country?: string }): Promise<CheckResult>;
}

export interface TransactionMonitor {
  /** Called after posting. A "review" result opens a case for a human; it must not silently freeze funds. */
  assess(
    tx: { id: string; ref?: string; amount: bigint; currency: string; counterparty?: string },
  ): Promise<CheckResult>;
}

/** What the application must do when a check is not "clear". Humans resolve cases; code only routes them. */
export interface CaseQueue {
  open(kind: "kyc" | "sanctions" | "monitoring", subjectId: string, result: CheckResult): Promise<{ caseId: string }>;
}
