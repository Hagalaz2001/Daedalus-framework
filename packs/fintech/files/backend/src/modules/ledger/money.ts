// Money is an integer count of minor units (cents, pence, yen) plus an ISO 4217 currency. Never a float.
// bigint avoids overflow; JSON and the database carry the amount as a string or int8.

export interface Money {
  readonly amount: bigint;
  readonly currency: string;
}

/** Decimal places per currency. Add the currencies you support; unknown currencies are rejected on purpose. */
export const EXPONENT: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CHF: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0,
  KRW: 0,
  KWD: 3,
  BHD: 3,
};

const exponent = (currency: string): number => {
  const e = EXPONENT[currency];
  if (e === undefined) throw new RangeError(`unsupported currency ${currency}`);
  return e;
};

/** Accepts a bigint, a safe integer number, or an integer string. Rejects 1.5, NaN, Infinity and unsafe integers. */
export function money(amount: bigint | number | string, currency: string): Money {
  exponent(currency);
  if (typeof amount === "number") {
    if (!Number.isSafeInteger(amount)) {
      throw new RangeError(`amount must be a safe integer of minor units, got ${amount}`);
    }
    amount = BigInt(amount);
  } else if (typeof amount === "string") {
    if (!/^-?\d+$/.test(amount)) throw new RangeError(`amount must be an integer string, got "${amount}"`);
    amount = BigInt(amount);
  }
  return Object.freeze({ amount, currency });
}

/** "12.34" USD -> 1234n. Refuses more decimals than the currency has: rounding is a business decision, not a parse step. */
export function parseMajor(text: string, currency: string): Money {
  const e = exponent(currency);
  const m = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!m) throw new RangeError(`not a decimal amount: "${text}"`);
  const frac = m[3] ?? "";
  if (frac.length > e) throw new RangeError(`"${text}" has more than ${e} decimals for ${currency}`);
  const minor = BigInt(m[2] + frac.padEnd(e, "0"));
  return money(m[1] ? -minor : minor, currency);
}

export function formatMajor(m: Money): string {
  const e = exponent(m.currency);
  const neg = m.amount < 0n;
  const digits = (neg ? -m.amount : m.amount).toString().padStart(e + 1, "0");
  const whole = digits.slice(0, digits.length - e);
  return `${neg ? "-" : ""}${e ? `${whole}.${digits.slice(-e)}` : whole} ${m.currency}`;
}

const same = (a: Money, b: Money) => {
  if (a.currency !== b.currency) throw new RangeError(`currency mismatch: ${a.currency} vs ${b.currency}`);
};
export const add = (a: Money, b: Money): Money => (same(a, b), money(a.amount + b.amount, a.currency));
export const sub = (a: Money, b: Money): Money => (same(a, b), money(a.amount - b.amount, a.currency));
export const negate = (a: Money): Money => money(-a.amount, a.currency);
export const isZero = (a: Money) => a.amount === 0n;
export const equals = (a: Money, b: Money) => a.currency === b.currency && a.amount === b.amount;

/**
 * Splits money by integer weights with the largest-remainder method: the parts always add up to the total, nothing is
 * lost or invented. Ties go to the earlier part. Negative totals split by magnitude.
 */
export function allocate(total: Money, weights: bigint[]): Money[] {
  if (!weights.length || weights.some((w) => w < 0n)) {
    throw new RangeError("weights must be a non-empty list of non-negative integers");
  }
  const sum = weights.reduce((a, b) => a + b, 0n);
  if (sum === 0n) throw new RangeError("weights sum to zero");
  const sign = total.amount < 0n ? -1n : 1n;
  const abs = sign * total.amount;
  const parts = weights.map((w) => (abs * w) / sum);
  let left = abs - parts.reduce((a, b) => a + b, 0n);
  const order = weights.map((w, i) => ({ i, r: (abs * w) % sum })).sort((
    a,
    b,
  ) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  for (const { i } of order) {
    if (left === 0n) break;
    parts[i] = parts[i]! + 1n;
    left -= 1n;
  }
  return parts.map((p) => money(sign * p, total.currency));
}
