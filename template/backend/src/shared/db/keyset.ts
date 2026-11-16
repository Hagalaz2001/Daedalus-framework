import { desc, lt, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * Keyset pagination on a UUIDv7 primary key: ids sort by creation time, so "next page" is `id < cursor` and the
 * cursor is just the last id. Stable under inserts, O(log n) at any depth (OFFSET is neither).
 * Query with `limit + 1` rows, then `slicePage` (shared/http/pagination.ts) splits off the extra row to learn whether
 * there is a next page.
 */
export const keyset = (idColumn: PgColumn, cursor: string | undefined): { where: SQL | undefined; order: SQL } => ({
  where: cursor ? lt(idColumn, cursor) : undefined,
  order: desc(idColumn),
});
