---
name: project-deck
description: Build this project's presentation deck (PowerPoint) for the team and its stakeholders - what it is, who it serves, the screens, the timeline planned vs actual, how it was verified, and what's next. Use when a project's last milestone is done, or when asked for a deck, slides, presentation or handover.
---

# Project deck

Output: `docs/deck/<project>-<YYYY-MM-DD>.pptx`, 8–14 slides, 16:9. Use the PowerPoint skill
(`anthropic-skills:pptx`) for building and checking the file; if it isn't available, use
`pptxgenjs` from a script in `docs/deck/` and render each slide to an image to look at it.

## Sources (read, don't invent)

- `PLAN.md`: product, milestones with planned and finished dates, decisions.
- `DESIGN.md` + `design/tokens.json`: the deck uses the product's own palette and fonts.
- `docs/screens/**`: real screenshots. If a key screen has none, take one (Playwright MCP for web at
  1280px and 390px; emulator `adb exec-out screencap -p` for mobile). Never use mockups or AI images
  of the app.
- `docs/TIMELINE.md` (run `deno task timeline` first), `CHANGELOG.md`, `git log --oneline`.

## Slides

1. Title: product name, one-line purpose, date, maintainer.
2. The problem and who it is for (the audiences, in DESIGN.md's order).
3. The system: apps per audience, database, accounts, a simple diagram (boxes and arrows).
4–8. One slide per main journey: a real screenshot (web and phone side by side when both exist)
   with a one-sentence caption of what the person achieves.
9. Timeline: planned vs actual per milestone (a bar chart or table drawn from PLAN.md).
10. Quality: what was tested (checks, journeys, devices) and what was not.
11. Decisions and trade-offs worth stakeholders knowing.
12. Next steps: deploy, remaining risks, version 1.1 ideas.

## Rules

- Plain language, no filler, no emoji, no "revolutionary"; numbers only from the sources.
- Look at every slide image before finishing: no overflowing text, no clipped screenshots,
  readable at a glance.
- Commit the deck: `docs: project deck vX.Y.Z`. Mention it in PLAN.md Status.
