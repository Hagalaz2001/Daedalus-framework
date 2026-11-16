# Specs

Spec-driven development: write what and why first, review it, then plan, then tasks, then code. The agent works from the
spec, so a reviewed spec is the cheapest place to catch a wrong idea. The templates follow the approach of
[GitHub Spec Kit](https://github.com/github/spec-kit) and [OpenSpec](https://github.com/Fission-AI/OpenSpec) (both MIT);
the text is original.

```
deno task spec:new <slug> [title]   # specs/NNN-slug/{spec.md, acceptance.md}
deno task spec:plan <id|slug>       # plan.md (refuses while [NEEDS CLARIFICATION] remains)
deno task spec:tasks <id|slug>      # tasks.md, one task pair per acceptance id
deno task spec:check                # every spec is complete and every AC has a task
```

Workflow: `spec:new`, fill `spec.md` and `acceptance.md` with the agent (skill `spec-new`), a human approves
(`Status: approved`), `spec:plan`, review, `spec:tasks`, implement task by task (skill `spec-implement`), PR. Small
fixes do not need a spec. Anything touching money, auth, personal data or the contract does.

`constitution.md` holds the rules every spec must respect.
