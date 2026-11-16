# 0001. Contract-first, feature-first architecture on every stack

- Status: accepted
- Date: 2026-11-17

## Context

A product often needs a website, a mobile app and a backend that must agree on data and look. Separate hand-written
clients drift from the API, themes drift from the brand, and each app invents its own folder layout. AI agents make this
worse unless the rules are explicit and checked.

## Decision

1. `contracts/openapi.yaml` is the only description of the API. Clients are generated per stack; apps never hand-write
   HTTP calls.
2. `design/tokens.json` is the only description of colours, radii, spacing and fonts. Each stack generates its theme
   file from it.
3. Every app is organised feature-first (`features/<name>` with ui, state, data, model). Features expose a public entry
   and are imported only through it; shared code never imports features. `deno task lint:boundaries` enforces this for
   TypeScript and Dart, the Rust compiler enforces it for Rust.
4. UI code is not shared between stacks. Web is React + TypeScript, mobile is Flutter or React Native, desktop is Rust
   (GPUI or Tauri).
5. The toolchain is Deno (installs, tasks, workspaces, lockfile). Flutter and Rust use their own tools, invoked from
   `deno task check` and `deno task sync`.
6. `.blueprint.json` records which stacks a project uses; `deno task sync` and `deno task check` read it.

## Consequences

- A change to the contract or the tokens reaches every app through `deno task sync`; a drift fails `deno task check`.
- Adding an app of any stack is `deno task add-app`, not copy and paste.
- Cross-stack code reuse is limited to generated code. Teams accept some duplication of UI for native quality.
- Changing these rules needs a new ADR that supersedes this one.
