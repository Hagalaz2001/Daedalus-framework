import type { Db } from "../../shared/db/client.ts";
import { featureFlags } from "./schema.ts";

type Flag = Pick<typeof featureFlags.$inferSelect, "key" | "enabled" | "rolloutPercent">;

/** FNV-1a: a small stable hash, so a user keeps the same answer for a flag across requests and servers. */
function bucket(key: string, userId: string): number {
  let h = 2166136261;
  for (const ch of `${key}:${userId}`) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0;
  return h % 100;
}

/** Pure evaluation: off unless enabled; partial rollouts need a user to bucket. */
export function evaluate(flag: Flag, userId?: string): boolean {
  if (!flag.enabled) return false;
  if (flag.rolloutPercent >= 100) return true;
  return userId !== undefined && bucket(flag.key, userId) < flag.rolloutPercent;
}

export async function evaluateAll(db: Db, userId: string): Promise<Record<string, boolean>> {
  const rows = await db.select().from(featureFlags);
  return Object.fromEntries(rows.map((f) => [f.key, evaluate(f, userId)]));
}

/** For server code: `if (await isEnabled(db, "new-checkout", user.id)) ...`. Unknown flags are off. */
export async function isEnabled(db: Db, key: string, userId?: string): Promise<boolean> {
  const all = await db.select().from(featureFlags);
  const flag = all.find((f) => f.key === key);
  return flag ? evaluate(flag, userId) : false;
}
