export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string // ISO yyyy-mm-dd
  author: string
  readingMinutes: number
}

export interface Post extends PostMeta {
  body: string
}

export const readingMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 220))

export const formatPostDate = (iso: string) => new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso))

/** Newest first. */
export const byDateDesc = (a: PostMeta, b: PostMeta) => b.date.localeCompare(a.date)
