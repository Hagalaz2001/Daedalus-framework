import { render, screen } from './testing'
import userEvent from '@testing-library/user-event'
import { Home, Settings } from '@lucide/vue'
import { defineComponent, h, ref } from 'vue'
import {
  AppShell, Avatar, Badge, Button, Card, CardContent, CardTitle, Checkbox, Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger,
  EmptyState, ErrorState, IconButton, ListRow, PageHeader, SegmentedControl, Skeleton, SkeletonGroup, Switch, Tabs, TabsContent, TabsList, TabsTrigger, TextField,
} from './index'
import { expectNoA11yViolations } from './testing'

describe('Button', () => {
  it('fires click, and is inert while loading', async () => {
    const onClick = vi.fn()
    const { rerender } = render(Button, { slots: { default: 'Save' }, attrs: { onClick } })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    await rerender({ loading: true })
    const b = screen.getByRole('button', { name: 'Save' })
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
  })
  it('IconButton exposes its label', () => {
    render(IconButton, { props: { label: 'Close' }, slots: { default: () => h(Home) } })
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})

describe('TextField', () => {
  it('links label, hint and error to the input and supports v-model', async () => {
    const Host = defineComponent({
      setup() {
        const v = ref('')
        return () => h('div', [h(TextField, { label: 'Email', hint: 'We never share it', error: 'Enter a valid email', modelValue: v.value, 'onUpdate:modelValue': (x: string) => (v.value = x) }), h('output', v.value)])
      },
    })
    render(Host)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('We never share it Enter a valid email')
    await userEvent.type(input, 'user@example.com')
    expect(screen.getByRole('status')).toHaveTextContent('user@example.com')
  })
})

describe('toggles', () => {
  it('Checkbox, Switch and SegmentedControl report changes', async () => {
    const a = vi.fn(), b = vi.fn(), c = vi.fn()
    render({
      render: () => h('div', [
        h(Checkbox, { label: 'Agree', modelValue: false, 'onUpdate:modelValue': a }),
        h(Switch, { label: 'Email me', modelValue: false, 'onUpdate:modelValue': b }),
        h(SegmentedControl, { label: 'Range', modelValue: 'a', 'onUpdate:modelValue': c, options: [{ value: 'a', label: 'All' }, { value: 'b', label: 'Week' }] }),
      ]),
    })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Agree' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Email me' }))
    await userEvent.click(screen.getByRole('button', { name: 'Week' }))
    expect(a).toHaveBeenCalledWith(true)
    expect(b).toHaveBeenCalledWith(true)
    expect(c).toHaveBeenCalledWith('b')
  })
})

describe('Dialog', () => {
  it('opens from its trigger with a title and closes on Escape', async () => {
    render({
      render: () =>
        h(Dialog, null, () => [
          h(DialogTrigger, { asChild: true }, () => h(Button, null, () => 'Open')),
          h(DialogContent, null, () => [h(DialogTitle, null, () => 'Delete note'), h(DialogDescription, null, () => 'This cannot be undone.')]),
        ]),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByRole('dialog', { name: 'Delete note' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('states', () => {
  it('EmptyState, ErrorState retry and SkeletonGroup announce', async () => {
    const retry = vi.fn()
    render({
      render: () => h('div', [
        h(EmptyState, { title: 'No notes yet', description: 'Write the first one' }),
        h(ErrorState, { message: 'Network down', retryable: true, onRetry: retry }),
        h(SkeletonGroup, null, () => h(Skeleton, { class: 'h-4' })),
      ]),
    })
    expect(screen.getByRole('heading', { name: 'No notes yet' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })
})

describe('accessibility basics', () => {
  it('a composed page has no axe violations', async () => {
    const { container } = render({
      render: () =>
        h(
          AppShell,
          { brand: 'Acme Notes', nav: [{ href: '/', label: 'Home', icon: Home }, { href: '/settings', label: 'Settings', icon: Settings }], currentPath: '/settings', user: { name: 'Ada Lovelace' }, signOut: true },
          () => [
            h(PageHeader, { title: 'Settings', description: 'Tune it' }, { actions: () => h(Button, null, () => 'Save') }),
            h(Card, null, () => h(CardContent, null, () => [
              h(CardTitle, null, () => 'Profile'),
              h(Badge, { tone: 'success' }, () => 'Active'),
              h(Avatar, { name: 'Ada Lovelace' }),
              h(ListRow, { title: 'Row', subtitle: 'Sub' }),
              h(Tabs, { defaultValue: 'a' }, () => [
                h(TabsList, { 'aria-label': 'Sections' }, () => [h(TabsTrigger, { value: 'a' }, () => 'One'), h(TabsTrigger, { value: 'b' }, () => 'Two')]),
                h(TabsContent, { value: 'a' }, () => 'First'),
              ]),
            ])),
          ],
        ),
    })
    expect(screen.getAllByRole('link', { current: 'page' }).length).toBeGreaterThan(0)
    await expectNoA11yViolations(container)
  })
})
