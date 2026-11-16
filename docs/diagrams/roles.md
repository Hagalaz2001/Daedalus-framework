# Roles and responsibilities

Who decides, who does, who reviews. One person can wear several hats; an AI agent never wears the Owner hat.

```mermaid
flowchart TB
  subgraph Humans
    O["Owner / Steersman<br/>decides scope and design direction<br/>signs off every ship"]
    R["Reviewer<br/>reads the diff, checks screenshots<br/>a human, with an AI as a second pair of eyes"]
    T["Team lead (optional)<br/>keeps the flight on track<br/>unblocks, owns the metrics"]
  end
  subgraph Builders["Builders: AI agents, one folder each"]
    BE["backend-dev<br/>contract, API, database"]
    WE["web-dev<br/>React or Vue app, website"]
    MO["mobile-dev<br/>Flutter or React Native"]
    DS["desktop-dev<br/>Rust desktop app"]
  end
  O -- "intent and spec" --> Builders
  Builders -- "pull request" --> R
  R -- "approve or request changes" --> O
  T -. "cadence and retro" .-> O
  T -. "cadence and retro" .-> R
```

| Who | Decides | Does | Reviews |
|---|---|---|---|
| Owner | What and why, scope, trade-offs, ship | Writes the intent, approves the spec | The demo and the release notes |
| Builders | Nothing outward-facing | Plan, code, tests, regenerate clients | Their own output with `deno task check` |
| Reviewer | Approve or reject a change | Reads diffs, looks at screenshots | Every pull request |
| Team lead | Cadence, who reviews what | Unblocks, runs the retro | The metrics trend |
