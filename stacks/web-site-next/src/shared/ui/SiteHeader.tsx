'use client'

import { Button, Dialog, DialogClose, DialogTitle, DialogTrigger, IconButton, SheetContent, ThemeToggle } from '@app/ui'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { siteConfig } from '../lib/site'
import { Container } from './Container'

export function SiteHeader() {
  const pathname = usePathname()
  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? ('page' as const) : undefined)
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/85 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">
        Skip to content
      </a>
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {siteConfig.nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={current(n.href)}
              className="inline-flex h-11 items-center rounded-md px-3.5 text-[0.95rem] font-medium text-text-muted transition-colors hover:text-text aria-[current=page]:text-text aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button asChild className="hidden sm:inline-flex">
            <a href={siteConfig.appUrl}>Open the app</a>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <IconButton label="Menu" icon={<Menu />} className="md:hidden" />
            </DialogTrigger>
            <SheetContent>
              <DialogTitle>Menu</DialogTitle>
              <nav aria-label="Mobile" className="flex flex-col">
                {siteConfig.nav.map((n) => (
                  <DialogClose asChild key={n.href}>
                    <Link href={n.href} aria-current={current(n.href)} className="flex min-h-12 items-center border-b border-border text-lg font-medium aria-[current=page]:text-primary">
                      {n.label}
                    </Link>
                  </DialogClose>
                ))}
              </nav>
              <Button asChild size="lg" className="mt-4">
                <a href={siteConfig.appUrl}>Open the app</a>
              </Button>
            </SheetContent>
          </Dialog>
        </div>
      </Container>
    </header>
  )
}
