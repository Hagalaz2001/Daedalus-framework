export const steps = [
  { id: 'welcome', title: 'Welcome aboard', body: 'Notes are plain text, saved to your account, and searchable. That is the whole idea.' },
  { id: 'first', title: 'Write your first note', body: 'Anything works: a to-do, a link, a half-formed thought.' },
  { id: 'done', title: 'You are set', body: 'Find everything under Notes, and change how the app looks in Settings.' },
] as const

export type StepId = (typeof steps)[number]['id']
