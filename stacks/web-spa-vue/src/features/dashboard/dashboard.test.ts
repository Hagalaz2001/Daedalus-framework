import { computeStats, dailyCounts, greeting } from './model/stats'

const DAY = 86_400_000
const now = Date.now()
const at = (ms: number) => new Date(now - ms).toISOString()

describe('dashboard model', () => {
  it('counts notes per window and per day', () => {
    const created = [at(1000), at(2 * DAY), at(20 * DAY)]
    expect(computeStats(created, now)).toEqual({ total: 3, thisWeek: 2, today: 1 })
    const days = dailyCounts(created, 14, now)
    expect(days).toHaveLength(14)
    expect(days.at(-1)).toBe(1)
    expect(days.reduce((a, b) => a + b, 0)).toBe(2)
  })
  it('greets by time of day', () => {
    expect(greeting(8)).toBe('Good morning')
    expect(greeting(20)).toBe('Good evening')
  })
})
