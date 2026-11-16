# AI-assisted workflow

Agents do the typing; people keep the decisions. The gates (marked) need a person.

```mermaid
flowchart TD
  H["Human states the intent<br/>problem, users, constraints"] --> P["Agent drafts a plan<br/>PLAN.md: contract changes, screens, risks, tests"]
  P --> G1{{"GATE 1: human approves the plan"}}
  G1 --> C["Agent updates the contract and tokens, runs sync"]
  C --> A1["Backend agent<br/>module, migration, tests"]
  C --> A2["Web agent<br/>feature, screens, tests"]
  C --> A3["Mobile agent<br/>feature, screens, tests"]
  A1 --> D["Design review<br/>screenshots against DESIGN.md, states, contrast, copy"]
  A2 --> D
  A3 --> D
  D --> K["deno task check<br/>everything, in every app"]
  K -- fails --> A1
  K --> G2{{"GATE 2: human reviews the diff and the running app"}}
  G2 -- changes --> P
  G2 --> G3{{"GATE 3: human approves merge, deploy, spending and data deletion"}}
```

Parallel agents each own separate folders (one app or one module) so they do not collide. Details, briefs and a
checklist against low-quality output: [../AI-WORKFLOW.md](../AI-WORKFLOW.md).
