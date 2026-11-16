// Protected health information must not leak by accident. Phi<T> hides the value from every implicit conversion:
// string templates, JSON.stringify, console.log and util.inspect all show "[PHI]". The only way to read it is
// reveal(), which is easy to grep for in review. This catches mistakes; it does not make a system compliant.

const INSPECT = Symbol.for("Deno.customInspect");

export class Phi<T> {
  readonly #value: T;
  constructor(value: T) {
    this.#value = value;
  }
  /** Explicit, reviewable access. Every call site should be justified. */
  reveal(): T {
    return this.#value;
  }
  toString(): string {
    return "[PHI]";
  }
  toJSON(): string {
    return "[PHI]";
  }
  [INSPECT](): string {
    return "[PHI]";
  }
  [Symbol.toPrimitive](): string {
    return "[PHI]";
  }
}

export const phi = <T>(value: T): Phi<T> => new Phi(value);

/** Copy of `obj` with the listed top-level fields replaced by "[REDACTED]". For logs and error context. */
export function redact<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly (keyof T)[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const k of fields) if (k in out) out[k as string] = "[REDACTED]";
  return out;
}
