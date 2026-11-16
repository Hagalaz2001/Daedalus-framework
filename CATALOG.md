# Open-source catalog

Proven projects to reach for before building anything yourself. Stars, last activity and license
were checked on GitHub on 2026-11-07. Optional
Agents: prefer an entry here over writing it from scratch, and check its current documentation.

## 1. Design quality (priority)

| Project | License | Status | Use it for |
|---|---|---|---|
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0, 105k★ | Optional | Design director workflow for web and native iOS/Android: shape, critique, audit, polish, typeset |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT, 146k★ | Optional | Style/palette/font-pairing catalog incl. Flutter; brand, banner, logo, slides |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT, 54k★ | Optional | Motion and interaction craft |
| [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) | MIT, 8.5k★ | Optional | Anti-slop rules for UI, copy, mobile layout, code comments |
| [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) | MIT | Optional | 67 design-system styles |
| [anthropics/skills](https://github.com/anthropics/skills) | per skill | Optional | frontend-design, canvas-design (posters/graphics), theme-factory |
| [google-labs-code/design.md](https://github.com/google-labs-code/design.md) | Apache-2.0, 29k★ | Reference | The DESIGN.md format (YAML tokens + prose); impeccable reads and writes it |
| Figma | | Optional | Design-to-code from Figma files |

UI building blocks (pick per project, then record the choice in DESIGN.md):

| Web | License | Flutter | License |
|---|---|---|---|
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) (127k★): copy-in components on Radix + Tailwind | MIT | Material 3 + `app_core` theme (default) | BSD |
| [radix-ui/primitives](https://github.com/radix-ui/primitives) (19k★): accessible headless parts | MIT | [nank1ro/flutter-shadcn-ui](https://github.com/nank1ro/flutter-shadcn-ui) (2.8k★): shadcn look for Flutter | MIT |
| [adobe/react-spectrum](https://github.com/adobe/react-spectrum) (React Aria, 16k★) | Apache-2.0 | [sunarya-thito/shadcn_flutter](https://github.com/sunarya-thito/shadcn_flutter) (84+ components) | BSD-3 |
| [motiondivision/motion](https://github.com/motiondivision/motion) (35k★): animation | MIT | [rive-app/rive-flutter](https://github.com/rive-app/rive-flutter): interactive animation | MIT |
| [lucide-icons/lucide](https://github.com/lucide-icons/lucide) (26k★): line icons, also on pub.dev | ISC | [phosphor-icons](https://github.com/phosphor-icons/homepage): icons for web and Flutter | MIT |

## 2. Parallel AI agents

| Project | License | Status | Use it for |
|---|---|---|---|
| Claude Code worktrees (`claude --worktree <name>`) | | Built in| One isolated session per feature |
| Template subagents `backend-dev`, `web-dev`, `mobile-dev`, `design-reviewer` | | Optional | One feature built on three sides at once |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | Optional | brainstorm → plan → subagent-driven development → TDD |
| [BloopAI/vibe-kanban](https://github.com/BloopAI/vibe-kanban) | Apache-2.0, 29k★ | Optional | Kanban board that runs many agents in their own worktrees |
| [dagger/container-use](https://github.com/dagger/container-use) | Apache-2.0, 4k★ | Optional | Each agent in its own container + branch |
| [smtg-ai/claude-squad](https://github.com/smtg-ai/claude-squad) | AGPL-3.0, 8.7k★ | Optional (needs tmux, Mac/Linux) | Terminal manager for parallel agents |
| [wshobson/agents](https://github.com/wshobson/agents) | MIT, 42k★ | Reference | Specialist subagent definitions to copy from |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | MIT, 26k★ | Reference | 100+ subagents by category |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 57k★ | Reference | The main index of skills, hooks, tools |
| [mattpocock/skills](https://github.com/mattpocock/skills) | MIT | Reference | TypeScript-focused skills |

## 3. Agent tools (MCP)

| Server | Status | Use it for |
|---|---|---|
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Optional | Agents open the web app, click through it, screenshot |
| [upstash/context7](https://github.com/upstash/context7) | Optional | Current docs for any library ("use context7") |
| Dart and Flutter MCP | Optional | Analyzer, tests, pub, running app |
| [github/github-mcp-server](https://github.com/github/github-mcp-server) | Optional | Only for projects hosted on GitHub |
| Supabase MCP | Optional | If a project uses Supabase |

## 4. Building blocks for a complete system

| Need | Project | License | Notes |
|---|---|---|---|
| API server | [honojs/hono](https://github.com/honojs/hono) | MIT | In the template |
| Database / ORM | [drizzle-team/drizzle-orm](https://github.com/drizzle-team/drizzle-orm) | Apache-2.0 | Typed SQL, Postgres or SQLite |
| Auth | [better-auth/better-auth](https://github.com/better-auth/better-auth) | MIT | Email, OAuth, 2FA, orgs; works with Hono + Drizzle |
| Backend as a service | [supabase/supabase](https://github.com/supabase/supabase) | Apache-2.0 | Postgres + auth + storage + realtime; Flutter and JS SDKs |
| Admin panels | [refinedev/refine](https://github.com/refinedev/refine) | MIT | CRUD admin apps on React |
| Background jobs | [triggerdotdev/trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Apache-2.0 | Durable jobs, schedules, retries |
| Payments / billing | [polarsource/polar](https://github.com/polarsource/polar) | Apache-2.0 | Subscriptions and checkout |
| Flutter tooling | [VeryGoodOpenSource/very_good_cli](https://github.com/VeryGoodOpenSource/very_good_cli) | MIT | Test coverage, package templates |
| Avoid | pocketbase/pocketbase | MIT | **Archived** on GitHub as of this check; don't start new projects on it |

Not included on purpose: anything that runs hooks or downloaded programs on every edit, or that needs broad
repository tokens. Add these per project when needed.

## Tooling decision: Deno

Every JS/TS part of a project runs on Deno 2 (package manager, task runner, test runner; `deno.json` workspace,
`deno.lock`), not npm or pnpm. Any npm package from the lists above is used as is (`deno install`, `deno run -A npm:<tool>`).
Policy and checks: README, section "Deno only".
