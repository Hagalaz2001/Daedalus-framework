# Design direction

The product's visual and verbal direction. Agents read this before any UI or copy work; the values
themselves live in `design/tokens.json` (run `deno task sync` after changing them). When a mockup or
showcase file exists, it wins and this file gets corrected.

## Who the interface is for

<!-- List the audiences in order of how often they touch it, with the conditions they use it under
     (device, hurry, age, stress). The most constrained audience sets the floor for everything. -->

1. …

## Identity

<!-- One paragraph on tone (e.g. calm, plain and accountable) and the one visual idea the design
     spends its contrast on. Everything else stays quiet. -->

## Palette

| Token | Hex | Role |
|---|---|---|
| primary | `#2563eb` | The single accent. Actions and focus only. |
| text | `#0f172a` | Primary text |
| textMuted | `#475569` | Secondary text |
| surface / surfaceMuted | `#ffffff` / `#f8fafc` | Backgrounds |
| border | `#e2e8f0` | Lines and dividers |
| success / warning / danger | | State only, always with an icon or label |

## Type, spacing, shape

- Font: Inter (web via `font-sans`, Flutter via `AppFonts.sans`; bundle the font in both apps).
- 4px grid (`AppSpace` / Tailwind spacing). Radius: 4 / 8 / 12.
- One primary action per screen.

## Platform notes

- **Web:** desktop-first or mobile-first? Breakpoints that matter.
- **iOS / Android:** where each follows its own platform conventions (navigation, back, sheets).

## Copy

<!-- Voice rules, words to avoid, how errors are phrased. The antislop-copywriting skill applies. -->
