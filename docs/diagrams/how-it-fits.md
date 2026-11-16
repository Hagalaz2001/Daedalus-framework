# How the pieces fit

```mermaid
flowchart LR
  subgraph Sources["You edit these"]
    C["contracts/openapi.yaml<br/>the contract"]
    T["design/tokens.json<br/>the tokens"]
  end
  SY["deno task sync"]
  C --> SY
  T --> SY
  subgraph Generated["Generated, never edited"]
    TS["packages/api_ts<br/>TypeScript client"]
    DA["Dart client"]
    TH["Theme file per app"]
  end
  SY --> TS
  SY --> DA
  SY --> TH
  subgraph Stacks["Stacks: one app each"]
    W["web-spa, web-spa-vue,<br/>web-site-astro, web-site-next"]
    M["mobile-flutter, mobile-rn"]
    D["desktop-gpui, desktop-tauri"]
    BE["Hono backend"]
  end
  TS --> W
  TS --> M
  TS --> BE
  DA --> M
  TH --> W
  TH --> M
  TH --> D
  MOD["Modules<br/>email, payments, rbac ..."] -. "add-module" .-> BE
  PK["Packs<br/>ai-kit, fintech, healthcare ..."] -. "add-pack" .-> Stacks
  ST["Studio<br/>design drafts from your UI kit"] -. "writes tokens and screens" .-> T
  MCP["MCP server and CLI<br/>daedalus mcp"] -. "lets AI tools drive" .-> SY
```

Read it left to right: you change a contract or a token, `sync` regenerates everything that depends on it, and the
stacks consume the result. Modules extend the backend, packs add whole capabilities, and Studio and MCP are two more
ways to drive the same files.
