'use client'

import type { LucideIcon } from 'lucide-react'
import { LogOut } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Avatar } from './display'
import { IconButton } from './button'
import { ThemeToggle } from './theme-toggle'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

/** The router's link component (react-router, next/link). Defaults to a plain anchor. */
export type LinkComponent = ComponentType<{ href: string; className?: string; children: ReactNode; 'aria-current'?: 'page' }>
const Anchor: LinkComponent = ({ href, ...p }) => <a href={href} {...p} />

const isActive = (current: string, href: string) => current === href || (href !== '/' && current.startsWith(`${href}/`))

/**
 * Sidebar on desktop, top bar + bottom tab bar on phones. Pass `children` as the page.
 * Put at most 5 items in `nav` (the phone tab bar holds 5).
 */
export function AppShell({
  brand,
  nav,
  currentPath,
  linkAs: Link = Anchor,
  user,
  onSignOut,
  children,
}: {
  brand: ReactNode
  nav: NavItem[]
  currentPath: string
  linkAs?: LinkComponent
  user?: { name: string; email?: string; profileHref?: string }
  onSignOut?: () => void
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface-muted/60 px-4 py-6 lg:flex">
        <div className="px-3 font-display text-xl font-semibold tracking-tight">{brand}</div>
        <nav aria-label="Sidebar" className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = isActive(currentPath, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center gap-3 rounded-md px-3 text-[0.95rem] font-medium transition-colors',
                  active ? 'bg-primary/12 text-primary' : 'text-text-muted hover:bg-surface-muted hover:text-text',
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-1 border-t border-border pt-4">
          {user && (
            <Link href={user.profileHref ?? '#'} className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1.5 hover:bg-surface-muted">
              <Avatar name={user.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                {user.email && <span className="block truncate text-xs text-text-muted">{user.email}</span>}
              </span>
            </Link>
          )}
          <ThemeToggle />
          {onSignOut && <IconButton label="Sign out" icon={<LogOut />} onClick={onSignOut} />}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
          <div className="font-display text-lg font-semibold tracking-tight">{brand}</div>
          <div className="flex items-center">
            <ThemeToggle />
            {onSignOut && <IconButton label="Sign out" icon={<LogOut />} onClick={onSignOut} />}
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-28 sm:px-8 lg:pt-12 lg:pb-16">
          {children}
        </main>
        <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {nav.map((item) => {
            const active = isActive(currentPath, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium', active ? 'text-primary' : 'text-text-muted')}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
