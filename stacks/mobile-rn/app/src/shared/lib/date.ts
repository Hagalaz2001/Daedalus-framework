const DAY = 86_400_000;

export function formatDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < DAY && d.getDate() === now.getDate()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export const isWithinDays = (iso: string, days: number, now = new Date()) => now.getTime() - new Date(iso).getTime() < days * DAY;
