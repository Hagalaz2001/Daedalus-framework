export interface Plan {
  id: string
  name: string
  blurb: string
  monthly: number
  yearly: number // per month, billed yearly
  features: string[]
  featured?: boolean
  cta: string
}

export const plans: Plan[] = [
  { id: 'free', name: 'Free', blurb: 'For a personal notebook.', monthly: 0, yearly: 0, cta: 'Start free', features: ['Unlimited notes', 'Search across everything', 'Light and dark themes', 'Export to Markdown'] },
  { id: 'pro', name: 'Pro', blurb: 'For people who live in their notes.', monthly: 9, yearly: 7, cta: 'Try Pro for 14 days', featured: true, features: ['Everything in Free', 'Version history, 90 days', 'Attachments up to 2 GB', 'Priority support'] },
  { id: 'team', name: 'Team', blurb: 'Shared notebooks with roles.', monthly: 14, yearly: 12, cta: 'Talk to us', features: ['Everything in Pro', 'Shared notebooks', 'Roles and audit log', 'Single sign-on'] },
]

export const faqs = [
  { q: 'Can I export my notes?', a: 'Yes. Every plan, including Free, exports everything to plain Markdown files in one click. Your notes are never locked in.' },
  { q: 'What happens if I cancel Pro?', a: 'Your account drops to Free. Nothing is deleted; version history older than the Free limit simply stops being available.' },
  { q: 'Is there a discount for students or non-profits?', a: 'Yes, half price. Write to us from your school or organisation address and we will switch it on.' },
  { q: 'Do you train AI models on my notes?', a: 'No. Notes are stored encrypted at rest and are never used for model training.' },
]

export const features = {
  search: { title: 'Search that keeps up with you', body: 'Results appear as you type, across every note, with the matching line shown in context.' },
  capture: { title: 'One keystroke to capture', body: 'Open the quick box from anywhere, type, press Enter. Organise later, or never.' },
  own: { title: 'Yours to take with you', body: 'Plain text underneath. Export everything to Markdown whenever you like.' },
}
