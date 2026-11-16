/** "rgb(14, 17, 22)" or "rgba(14, 17, 22, 1)" -> "#0e1116". Undefined for anything else (oklch, transparent). */
export function cssColorToHex(css: string): string | undefined {
  const m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(css.trim())
  if (!m) return undefined
  if (m[4] !== undefined && parseFloat(m[4]) === 0) return undefined
  return `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`
}
