# Design and AI skills

Agents read this folder for design rules. Third-party skills are not bundled with Daedalus (their licences
differ); `skills-lock.json` lists the sources a team chose and `deno task skills:update` restores them into
`.agents/skills/`.

## Rules that apply with or without installed skills

1. Direction first: audience, tone and the one visual idea live in `DESIGN.md`.
2. One primary action per screen; hierarchy from size, weight and space, not from decoration.
3. Spacing on the 4 px grid from `design/tokens.json`; no raw colours.
4. Every screen has loading, empty and error states; error copy says what happened and what to do.
5. Contrast meets WCAG 2.2 AA; touch targets are at least 44 px; focus is visible; every control has a label.
6. Copy is plain and specific. No filler, no exclamation marks, no emoji as icons.
7. Avoid the generic look: decorative gradients and glows, card-in-card layouts, everything centred, uppercase
   tracked micro-labels, stock hero copy.
8. Web, mobile and desktop feel like one product while each follows its platform's conventions.
