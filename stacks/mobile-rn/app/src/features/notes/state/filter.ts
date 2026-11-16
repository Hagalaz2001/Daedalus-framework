import { isWithinDays } from "@/shared/lib/date";
import type { Note } from "../data/notes-api";

export type Range = "all" | "today" | "week";
export type Sort = "newest" | "oldest";

export function filterNotes(notes: readonly Note[], query: string, range: Range, sort: Sort, now = new Date()): Note[] {
  const q = query.trim().toLowerCase();
  const days = range === "today" ? 1 : range === "week" ? 7 : Infinity;
  return notes
    .filter((n) => (q ? n.text.toLowerCase().includes(q) : true) && isWithinDays(n.createdAt, days, now))
    .sort((a, b) => (sort === "newest" ? 1 : -1) * (Date.parse(b.createdAt) - Date.parse(a.createdAt)));
}
