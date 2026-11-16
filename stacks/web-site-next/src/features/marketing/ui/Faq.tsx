import { ChevronDown } from 'lucide-react'
import { faqs } from '../model/content'

/** Native <details>: keyboard and screen-reader support for free, works without JavaScript. */
export function Faq() {
  return (
    <div className="divide-y divide-border border-y border-border">
      {faqs.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="size-5 shrink-0 text-text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
          </summary>
          <p className="max-w-2xl pb-5 text-text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  )
}
