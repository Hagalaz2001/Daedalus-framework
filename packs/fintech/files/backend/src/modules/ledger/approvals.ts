// Maker-checker (four eyes): a posting above a threshold is proposed by one person and executed only after a
// different person approves it. The maker can never approve their own request, whatever their role.
import { type Ledger, LedgerError, type Posting, type Transaction } from "./ledger.ts";

export type Status = "pending" | "approved" | "rejected";
export interface Request {
  id: string;
  maker: string;
  posting: Posting;
  status: Status;
  checker?: string;
  reason?: string;
  tx?: Transaction;
}

export interface Policy {
  /** Largest amount (minor units, per currency) one person may post alone. Anything above needs a checker. */
  soloLimit: Record<string, bigint>;
  /** Who may approve. Authentication and role lookup are the app's job; this is the list the check uses. */
  canApprove: (userId: string) => boolean;
}

const total = (p: Posting) => p.lines.filter((l) => l.direction === "debit").reduce((s, l) => s + l.amount.amount, 0n);

export class Approvals {
  #reqs = new Map<string, Request>();
  constructor(private ledger: Ledger, private policy: Policy) {}

  /** Posts directly when under the limit, otherwise files a request. Unknown currencies have no solo limit (0). */
  submit(maker: string, posting: Posting): { posted: Transaction } | { request: Request } {
    const limit = this.policy.soloLimit[posting.lines[0]?.amount.currency ?? ""] ?? 0n;
    if (total(posting) <= limit) return { posted: this.ledger.post(posting, maker).tx };
    const request: Request = { id: crypto.randomUUID(), maker, posting, status: "pending" };
    this.#reqs.set(request.id, request);
    this.ledger.audit.append(maker, "approval.request", request.id, {
      key: posting.idempotencyKey,
      amount: total(posting),
    });
    return { request };
  }

  approve(id: string, checker: string): Request {
    const r = this.#pending(id);
    if (checker === r.maker) throw new LedgerError("self_approval", "the maker cannot approve their own request");
    if (!this.policy.canApprove(checker)) throw new LedgerError("not_authorised", `${checker} may not approve`);
    // The ledger's idempotency makes a retried approval safe: the same posting is not applied twice.
    const { tx } = this.ledger.post(r.posting, r.maker);
    Object.assign(r, { status: "approved", checker, tx });
    this.ledger.audit.append(checker, "approval.approve", id, { maker: r.maker, tx: tx.id });
    return r;
  }

  reject(id: string, checker: string, reason: string): Request {
    const r = this.#pending(id);
    if (checker === r.maker) {
      throw new LedgerError("self_approval", "the maker cannot reject their own request; withdraw it instead");
    }
    Object.assign(r, { status: "rejected", checker, reason });
    this.ledger.audit.append(checker, "approval.reject", id, { maker: r.maker, reason });
    return r;
  }

  get(id: string): Request | undefined {
    return this.#reqs.get(id);
  }

  #pending(id: string): Request {
    const r = this.#reqs.get(id);
    if (!r) throw new LedgerError("not_found", `request ${id} not found`);
    if (r.status !== "pending") throw new LedgerError("not_pending", `request ${id} is already ${r.status}`);
    return r;
  }
}
