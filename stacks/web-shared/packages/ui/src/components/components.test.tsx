import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Home, Settings } from 'lucide-react'
import { expectNoA11yViolations } from '../testing'
import { AppShell } from './app-shell'
import { Button, IconButton } from './button'
import { Card, CardContent, CardTitle } from './card'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './dialog'
import { Avatar, Badge, EmptyState, ErrorState, PageHeader, SkeletonGroup, Skeleton } from './display'
import { TextField } from './input'
import { ListRow } from './list-row'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Checkbox, SegmentedControl, Switch } from './toggles'

describe('Button', () => {
  it('fires onClick, and is inert while loading', async () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<Button loading onClick={onClick}>Save</Button>)
    const b = screen.getByRole('button', { name: 'Save' })
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
  })
  it('IconButton exposes its label', () => {
    render(<IconButton label="Close" icon={<Home />} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})

describe('TextField', () => {
  it('links label, hint and error to the input', () => {
    render(<TextField label="Email" hint="We never share it" error="Enter a valid email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('We never share it Enter a valid email')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email')
  })
})

describe('toggles', () => {
  it('Checkbox and Switch report changes', async () => {
    const a = vi.fn(), b = vi.fn()
    render(
      <>
        <Checkbox label="Agree" checked={false} onCheckedChange={a} />
        <Switch label="Email me" checked={false} onCheckedChange={b} />
      </>,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agree' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Email me' }))
    expect(a).toHaveBeenCalledWith(true)
    expect(b).toHaveBeenCalledWith(true)
  })
  it('SegmentedControl selects one value', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Range" value="a" onValueChange={onChange} options={[{ value: 'a', label: 'All' }, { value: 'b', label: 'Week' }]} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('Dialog', () => {
  it('opens from its trigger with a title and traps a labelled dialog', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Delete note</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByRole('dialog', { name: 'Delete note' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('states', () => {
  it('EmptyState, ErrorState retry, Skeleton announce', async () => {
    const retry = vi.fn()
    render(
      <>
        <EmptyState title="No notes yet" description="Write the first one" />
        <ErrorState message="Network down" onRetry={retry} />
        <SkeletonGroup>
          <Skeleton className="h-4" />
        </SkeletonGroup>
      </>,
    )
    expect(screen.getByRole('heading', { name: 'No notes yet' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })
})

describe('accessibility basics', () => {
  it('a composed page has no axe violations', async () => {
    const { container } = render(
      <AppShell
        brand="Acme Notes"
        nav={[{ href: '/', label: 'Home', icon: Home }, { href: '/settings', label: 'Settings', icon: Settings }]}
        currentPath="/settings"
        user={{ name: 'Ada Lovelace' }}
        onSignOut={() => {}}
      >
        <PageHeader title="Settings" description="Tune it" actions={<Button>Save</Button>} />
        <Card>
          <CardContent>
            <CardTitle>Profile</CardTitle>
            <Badge tone="success">Active</Badge> <Avatar name="Ada Lovelace" />
            <ListRow title="Row" subtitle="Sub" trailing="2d" />
            <Tabs defaultValue="a">
              <TabsList aria-label="Sections">
                <TabsTrigger value="a">One</TabsTrigger>
                <TabsTrigger value="b">Two</TabsTrigger>
              </TabsList>
              <TabsContent value="a">First</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </AppShell>,
    )
    expect(screen.getAllByRole('link', { current: 'page' }).length).toBeGreaterThan(0)
    await expectNoA11yViolations(container)
  })
})
