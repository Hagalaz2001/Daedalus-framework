import { desc, lt, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export const DEFAULT_LIMIT = 20;

/** `limit`/`cursor` as validated by the contract (the query middleware has already applied defaults and bounds). */
export function pageParams(query: Record<string, unknown>) {
  return { limit: Number(query["limit"] ?? DEFAULT_LIMIT), cursor: query["cursor"] as string | undefined };
}

/**
 * Keyset pagination on a UUIDv7 primary key: ids sort by creation time, so "next page" is `id < cursor` and the
 * cursor is just the last id. Stable under inserts, O(log n) at any depth (OFFSET is neither).
 * Query with `limit + 1` rows, then `slicePage` splits off the extra row to learn whether there is a next page.
 */
export const keyset = (idColumn: PgColumn, cursor: string | undefined): { where: SQL | undefined; order: SQL } => ({
  where: cursor ? lt(idColumn, cursor) : undefined,
  order: desc(idColumn),
});

export function slicePage<T extends { id: string }>(rows: T[], limit: number) {
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items.at(-1)?.id : undefined };
}
