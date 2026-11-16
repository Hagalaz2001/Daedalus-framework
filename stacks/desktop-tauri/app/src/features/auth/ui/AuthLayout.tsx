import { ThemeToggle } from '@app/ui'
import type { ReactNode } from 'react'
import { appName } from '@/shared/lib/config'

/** Split screen: form on the left, a quiet brand panel on wide screens. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-semibold tracking-tight">{appName}</span>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-text-muted">{footer}</div>}
        </div>
      </main>
      <aside aria-hidden className="relative hidden overflow-hidden bg-primary text-on-primary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklab,var(--color-on-primary)_22%,transparent),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-16">
          <div className="relative mt-8 h-72">
            {[
              ['left-4 top-10 -rotate-6', 'w-56', 'bg-on-primary/15'],
              ['left-40 top-0 rotate-3', 'w-60', 'bg-on-primary/25'],
              ['left-24 top-32 -rotate-2', 'w-64', 'bg-on-primary'],
            ].map(([pos, w, bg], i) => (
              <div key={i} className={`absolute ${pos} ${w} space-y-2.5 rounded-lg p-5 ${bg} ${i === 2 ? 'text-primary shadow-xl shadow-scrim/30' : ''}`}>
                <div className={`h-2.5 w-2/3 rounded-full ${i === 2 ? 'bg-primary' : 'bg-on-primary/60'}`} />
                <div className={`h-2 rounded-full ${i === 2 ? 'bg-primary/25' : 'bg-on-primary/30'}`} />
                <div className={`h-2 w-4/5 rounded-full ${i === 2 ? 'bg-primary/25' : 'bg-on-primary/30'}`} />
              </div>
            ))}
          </div>
          <p className="max-w-md font-display text-4xl leading-tight font-medium tracking-tight">Write it down once. Find it when it matters.</p>
        </div>
      </aside>
    </div>
  )
}
