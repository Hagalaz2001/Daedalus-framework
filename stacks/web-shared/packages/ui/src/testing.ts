// Shared by every app's tests: fail when axe finds a violation (colour contrast needs a real browser, so it is off).
import axe from 'axe-core'

export async function expectNoA11yViolations(container: Element) {
  const { violations } = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  const msg = violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`).join('\n')
  if (violations.length) throw new Error(`Accessibility violations:\n${msg}`)
}
