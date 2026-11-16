---
name: plan-project
description: Turn a product brief into this project's PLAN.md milestones, DESIGN.md direction and first contract. Use at the start of a new project, when PLAN.md is still the template, or when the user describes what the product should do.
---

# Plan the project

**Planning is a 10-minute job, not a research project.** Decide from what you already know: name
fonts from Google Fonts (no downloading or probing font files), pick colors by reasoning about the
audience (check contrast with simple arithmetic, not tooling), and don't install or download
anything beyond the project's own `deno task sync` / `deno task check`. Where a choice is uncertain, make a
sensible one and write it under "Decisions" so the maintainer can change it later.

1. **Understand the brief.** From the user's description (ask only for what is missing and matters):
   who uses the website, who uses the app, the one job each must do well, and what "done" looks like.
2. **Design direction.** Fill in DESIGN.md (audience in order of use, tone, the one visual idea,
   palette with roles) and set `design/tokens.json` to match. Use
   `.agents/README.md` and, for a new visual identity, any installed design skill.
   Never ship the template's default blue without deciding it fits.
3. **System architecture (the whole product).** Decide and write under "Decisions":
   - **Apps per audience.** One program per audience when their data or trust differs (a multi-app system has
     four: hospital, care home, public, admin). Websites are React (or another JS framework when the
     brief needs it, e.g. Next.js for SEO-heavy public sites); phone apps are Flutter for Android and
     iOS only. **Never Flutter web.** Add apps with `deno task add-app <stack> <name>`.
   - **Data.** PostgreSQL through Drizzle (`backend/src/db/schema.ts`), Supabase in production via
     `DATABASE_URL`; the local PGlite database needs no setup. List the tables.
   - **Accounts.** If people sign in: Supabase Auth (supabase-js on web, supabase_flutter on mobile,
     the backend verifies the JWT) or Better Auth (see `docs/CATALOG.md`). Roles per app.
   - **Everything else** a real product needs (file storage, email, payments, background jobs, admin):
     pick from `docs/CATALOG.md`; never build these from scratch.
4. **Milestones with dates.** Write PLAN.md: Product section, then 3–8 milestones. Each is shippable
   on its own (contract + database + backend + web + mobile), ordered so the most important user
   journey works first. M1 includes the database tables and, if there are accounts, sign-in.
   Give each milestone concrete checkbox items a reviewer can verify. **Size:** 3–6 items per
   milestone, each item about an hour of agent work or less (one screen, one resource, one rule),
   so one session can finish a milestone; M1 is the smallest (design, database, one real resource
   end to end). Split anything bigger into more milestones. The **last milestone is always
   "Testing and handover"** (keep the template's items).
   Dates: headings are `### M<n> — <name> · <start> → <end>` (YYYY-MM-DD). Start on the next working
   day unless the brief gives a start date. Planning rule: building takes 1–2 weeks with AI
   (simple product ~1 week, a multi-app system ~2), then testing ~1 week; working days
   Monday–Friday. Split the build time across the build milestones by size; milestones don't
   overlap. Then run `deno task timeline`.
5. **First contract.** Replace the example `notes` resource in `contracts/openapi.yaml` with M1's
   real resource, run `deno task sync`, and fix the example code that no longer compiles (or remove the
   notes feature in all three apps).
6. **Record.** Fill AGENTS.md "This project", add maintainer decisions to PLAN.md "Decisions", run
   `deno task check`, commit per the `git-workflow` skill (`docs: plan <product>`).

Then hand over to `next-milestone`.
