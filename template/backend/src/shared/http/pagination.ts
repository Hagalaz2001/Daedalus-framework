export const DEFAULT_LIMIT = 20;

/** `limit`/`cursor` as validated by the contract (the query middleware has already applied defaults and bounds). */
export function pageParams(query: Record<string, unknown>) {
  return { limit: Number(query["limit"] ?? DEFAULT_LIMIT), cursor: query["cursor"] as string | undefined };
}

/** Rows fetched with `limit + 1`: the extra row only says whether another page exists; the cursor is the last id. */
export function slicePage<T extends { id: string }>(rows: T[], limit: number) {
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items.at(-1)?.id : undefined };
}
