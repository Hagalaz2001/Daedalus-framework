import { Button, Dialog, DialogTitle, DialogTrigger, IconButton, SheetContent } from '@app/ui'
import { Menu } from 'lucide-react'

interface Item {
  href: string
  label: string
  current: boolean
}

/** Phone navigation: a side sheet with the same links. Hidden from md up (the header shows them inline). */
export default function SiteMenu({ nav, appUrl }: { nav: Item[]; appUrl: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <IconButton label="Menu" icon={<Menu />} className="md:hidden" />
      </DialogTrigger>
      <SheetContent>
        <DialogTitle>Menu</DialogTitle>
        <nav aria-label="Mobile" className="flex flex-col">
          {nav.map((n) => (
            <a key={n.href} href={n.href} aria-current={n.current ? 'page' : undefined} className="flex min-h-12 items-center border-b border-border text-lg font-medium aria-[current=page]:text-primary">
              {n.label}
            </a>
          ))}
        </nav>
        <Button asChild size="lg" className="mt-4">
          <a href={appUrl}>Open the app</a>
        </Button>
      </SheetContent>
    </Dialog>
  )
}
