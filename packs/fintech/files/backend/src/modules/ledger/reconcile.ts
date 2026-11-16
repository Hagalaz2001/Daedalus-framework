// Reconciliation: compare what the ledger says about one account with an external statement (bank, card processor).
// Pure function: feed it internal and external records, run it as a scheduled job, alert a human on any difference.
// It reports; it never "fixes" the ledger. Corrections are reviewed postings (reversal + new entry), by a person.
import type { Ledger } from "./ledger.ts";

export interface External {
  ref: string;
  amount: bigint; // signed minor units from the account owner's point of view, same convention as `internal`
  currency: string;
}
export interface Internal extends External {
  txId: string;
}
export interface Report {
  matched: number;
  missingExternally: Internal[]; // we booked it, the counterparty did not report it
  missingInternally: External[]; // the counterparty reported it, we did not book it
  amountMismatch: { ref: string; internal: bigint; external: bigint }[];
  duplicates: string[]; // refs that appear twice on one side
  ok: boolean;
}

export function reconcile(internal: Internal[], external: External[]): Report {
  const dup = new Set<string>();
  const index = <T extends External>(rows: T[]) => {
    const m = new Map<string, T>();
    for (const r of rows) {
      if (m.has(r.ref)) dup.add(r.ref);
      m.set(r.ref, r);
    }
    return m;
  };
  const inn = index(internal);
  const ext = index(external);
  const rep: Report = {
    matched: 0,
    missingExternally: [],
    missingInternally: [],
    amountMismatch: [],
    duplicates: [],
    ok: false,
  };
  for (const [ref, i] of inn) {
    const e = ext.get(ref);
    if (!e) rep.missingExternally.push(i);
    else if (e.amount !== i.amount || e.currency !== i.currency) {
      rep.amountMismatch.push({ ref, internal: i.amount, external: e.amount });
    } else rep.matched++;
  }
  for (const [ref, e] of ext) if (!inn.has(ref)) rep.missingInternally.push(e);
  rep.duplicates = [...dup];
  rep.ok = !rep.missingExternally.length && !rep.missingInternally.length && !rep.amountMismatch.length &&
    !rep.duplicates.length;
  return rep;
}

/** The ledger's side of the comparison for one account: signed amounts from the account's debit/credit lines. */
export function internalRows(ledger: Ledger, accountId: string): Internal[] {
  const rows: Internal[] = [];
  for (const t of ledger.transactions) {
    if (!t.ref) continue;
    for (const l of t.lines) {
      if (l.accountId === accountId) {
        rows.push({
          ref: t.ref + (t.reverses ? "#rev" : ""),
          amount: l.direction === "debit" ? l.amount.amount : -l.amount.amount,
          currency: l.amount.currency,
          txId: t.id,
        });
      }
    }
  }
  return rows;
}
