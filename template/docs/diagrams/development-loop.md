# Daily development loop

```mermaid
flowchart LR
  A["Change the source of truth<br/>contracts/openapi.yaml or design/tokens.json"] --> B["deno task sync<br/>regenerate clients and themes"]
  B --> C["Implement per app<br/>backend module, web, mobile, desktop"]
  C --> D["deno task check<br/>sync, boundaries, lint, types, tests, audit"]
  D -- fails --> C
  D -- passes --> E["Review<br/>diff, screenshots for UI, contract and migration changes"]
  E -- changes requested --> C
  E -- approved --> F["Commit and push<br/>small commits, one concern each"]
  F --> G["CI runs the same checks"]
```

Rules that keep the loop short: never edit generated files (change the source and sync); every screen has loading,
empty and error states; every feature ships tests; a schema change ships with its migration and a refreshed ERD.
