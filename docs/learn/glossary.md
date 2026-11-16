# Glossary

Plain-language meanings of the words used in Daedalus. Alphabetical.

| Word | Meaning |
|---|---|
| **ADR** (architecture decision record) | A short note explaining why you chose something, kept in `docs/adr/`. Future you will thank you. |
| **Agent** | An AI assistant that can read files, run commands and edit code on its own, within the limits you set. |
| **AGENTS.md** | The rule book for AI assistants in your project: what to read first, what never to do. |
| **API** | The set of requests a server understands, such as "give me this user's notes". |
| **Backend** | The server side: stores data, checks who is signed in, answers the apps. In Daedalus it is `backend/`, built with Hono. |
| **Boundary lint** | A check that stops one feature from reaching into another feature's insides. `deno task lint:boundaries`. |
| **Builder** | In the [Method](../METHOD.md), an AI agent that builds one app folder. |
| **CI** | Continuous integration: a robot that runs your checks on every change, on a server. |
| **Contract** | The file `contracts/openapi.yaml` listing every request and response. Both apps and server are generated from it. |
| **Definition of Done** | The list of things that must be true before a change counts as finished. |
| **Deno** | The program that runs all JavaScript and TypeScript in Daedalus. It replaces Node, npm, pnpm and yarn here. |
| **DORA metrics** | Four numbers about delivery health: lead time, deployment frequency, change failure rate, time to restore. |
| **Feature** | One user-visible capability, kept in its own folder (`features/notes/`) with its screens, logic and tests. |
| **Flight** | A 1 to 2 week work period in the Method; like a sprint. |
| **Gate** | A check a change must pass before moving on. A red gate sends it back. |
| **Generated code** | Files written by a tool (the API client, theme files). Never edit them; change the source and run `deno task sync`. |
| **Hono** | The small web framework the backend uses. |
| **MCP** | Model Context Protocol: a standard way for AI tools to call tools such as `daedalus add-app`. Start it with `daedalus mcp`. |
| **Migration** | A saved database change (add a table, add a column) that can be replayed on any machine. |
| **Module** | An optional backend feature you add later, such as email or payments. `daedalus add-module`. |
| **OpenAPI** | The standard format of the contract file. |
| **Owner (Steersman)** | The human who decides what gets built and signs off every release. |
| **Pack** | A bundle of files and rules for a whole area (AI delivery kit, fintech, healthcare). `daedalus add-pack`. |
| **Preset** | A ready-made set of tokens, such as `clean`, `editorial` or `playful`. Chosen with `--ui`. |
| **Pull request (PR)** | A proposal to merge a change, which a reviewer reads and approves. |
| **Reviewer** | The person who reads a change and decides whether it is good enough. |
| **Spec** | A short document saying what and why before any code is written. `deno task spec:new`. |
| **Stack** | The set of tools for one kind of app, such as `web-spa` (React web app) or `mobile-rn` (React Native). |
| **Studio** | Daedalus's design tool: drafts colour directions and screens from your UI kit. `deno task studio`. |
| **Sync** | `deno task sync`: regenerates the API client and theme files from the contract and the tokens. |
| **Tokens** | The file `design/tokens.json` with colours, radii, spacing and fonts shared by every app. |
| **Workspace** | A folder holding several related projects that Deno installs together (the root `deno.json`). |
