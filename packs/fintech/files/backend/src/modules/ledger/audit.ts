// Append-only audit trail with a hash chain: each event commits to the previous one, so editing or deleting a past
// event is detectable by verifyChain. Store it in a table the application role can only INSERT into (see ledger.sql) and
// anchor the latest hash somewhere the application cannot write (a separate account, WORM bucket, or a signed log).
import { createHash } from "node:crypto";

export interface AuditEvent {
  seq: number;
  at: string;
  actor: string;
  action: string;
  subject: string;
  data: unknown;
  prevHash: string;
  hash: string;
}

export const GENESIS = "0".repeat(64);

/** Stable JSON: sorted keys, bigint as string. Same input always gives the same bytes. */
export function canonical(v: unknown): string {
  if (typeof v === "bigint") return JSON.stringify(v.toString());
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${
      Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
        .join(",")
    }}`;
  }
  return JSON.stringify(v) ?? "null";
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const hashOf = (e: Omit<AuditEvent, "hash">) => sha256(canonical(e));

export class AuditLog {
  #events: AuditEvent[] = [];
  constructor(private now: () => Date = () => new Date()) {}

  append(actor: string, action: string, subject: string, data: unknown): AuditEvent {
    if (!actor) throw new Error("audit: every event needs an actor");
    const body = {
      seq: this.#events.length + 1,
      at: this.now().toISOString(),
      actor,
      action,
      subject,
      data: JSON.parse(canonical(data)),
      prevHash: this.#events.at(-1)?.hash ?? GENESIS,
    };
    const ev: AuditEvent = Object.freeze({ ...body, hash: hashOf(body) });
    this.#events.push(ev);
    return ev;
  }

  get events(): readonly AuditEvent[] {
    return this.#events;
  }
}

/** Returns the sequence number of the first broken event, or null when the whole chain is intact. */
export function verifyChain(events: readonly AuditEvent[]): number | null {
  let prev = GENESIS;
  for (const [i, e] of events.entries()) {
    const { hash, ...body } = e;
    if (e.seq !== i + 1 || e.prevHash !== prev || hashOf(body) !== hash) return e.seq;
    prev = hash;
  }
  return null;
}
