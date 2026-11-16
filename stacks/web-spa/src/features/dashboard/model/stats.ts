export interface Stats {
  total: number
  thisWeek: number
  today: number
}

const DAY = 86_400_000

export function computeStats(createdAt: string[], now = Date.now()): Stats {
  const age = (s: string) => now - new Date(s).getTime()
  return { total: createdAt.length, thisWeek: createdAt.filter((s) => age(s) <= 7 * DAY).length, today: createdAt.filter((s) => age(s) <= DAY).length }
}

/** Notes per day for the last `days` days, oldest first (the last item is today, a rolling 24 h bucket). */
export function dailyCounts(createdAt: string[], days = 14, now = Date.now()): number[] {
  const counts = new Array<number>(days).fill(0)
  for (const s of createdAt) {
    const back = Math.floor((now - new Date(s).getTime()) / DAY)
    if (back >= 0 && back < days) counts[days - 1 - back]! += 1
  }
  return counts
}

export function greeting(hour = new Date().getHours()): string {
  return hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}
