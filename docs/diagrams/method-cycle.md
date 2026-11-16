# The Method cycle

One change travels from an idea to a shipped, measured result. Humans decide at the diamonds; agents do the work
between them. See [METHOD.md](../METHOD.md).

```mermaid
flowchart LR
  I["1. Intent<br/>one sentence: who, what, how we judge it"] --> S["2. Spec<br/>specs/NNN-name, approved by a human"]
  S --> P["3. Plan<br/>contract first, tasks per app"]
  P --> B["4. Build in parallel<br/>one agent per app folder"]
  B --> G{"5. Gate<br/>checks, design review, security"}
  G -- fails --> B
  G -- passes --> D["6. Demo<br/>real browser, emulator or window"]
  D -- changes requested --> B
  D -- accepted --> H{"7. Ship<br/>a named human approves"}
  H -- approved --> SH["Deploy and tag release"]
  SH --> L["8. Learn<br/>retro, metrics, update rules"]
  L --> I
```

Rules of thumb: a small fix may skip steps 2 and 3, but never step 5. Nothing leaves step 7 without a person.
