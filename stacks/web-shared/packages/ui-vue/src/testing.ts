// Test helpers shared by every Vue app: a small `render` (no extra test-utils dependency), Testing Library queries,
// and an axe check. Colour contrast needs a real browser, so that rule is off.
import { screen, waitFor, within } from '@testing-library/dom'
import axe from 'axe-core'
import { createApp, h, nextTick, shallowRef, type Component, type Plugin } from 'vue'

export { screen, waitFor, within }

const mounted = new Set<() => void>()

export interface RenderOptions {
  props?: Record<string, unknown>
  /** Extra attributes and listeners, e.g. { onClick }. */
  attrs?: Record<string, unknown>
  slots?: Record<string, string | ((...args: never[]) => unknown)>
  global?: { plugins?: (Plugin | [Plugin, ...unknown[]])[] }
}

/** Mounts a component into document.body. Call `cleanup()` after each test (the apps' test setup does). */
export function render(component: Component, options: RenderOptions = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  // shallow: props such as query objects hold refs that must stay refs
  const props = shallowRef({ ...options.props, ...options.attrs } as Record<string, unknown>)
  const app = createApp({ render: () => h(component, props.value, options.slots as never) })
  for (const p of options.global?.plugins ?? []) {
    if (Array.isArray(p)) app.use(p[0], ...p.slice(1))
    else app.use(p)
  }
  app.mount(container)
  const unmount = () => {
    if (!container.isConnected) return
    app.unmount()
    container.remove()
  }
  mounted.add(unmount)
  return {
    container,
    unmount,
    rerender: async (next: Record<string, unknown>) => {
      props.value = { ...props.value, ...next }
      await nextTick()
    },
  }
}

export function cleanup() {
  mounted.forEach((u) => u())
  mounted.clear()
}

export async function expectNoA11yViolations(container: Element) {
  const { violations } = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  const msg = violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`).join('\n')
  if (violations.length) throw new Error(`Accessibility violations:\n${msg}`)
}
