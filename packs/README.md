# Packs

A pack adds one capability or domain to a generated project: files, `deno task` tasks, checks and rules for agents.
Apply packs when generating (`--packs ai-kit,fintech`) or later (`deno task add-pack <name>`). Read `DISCLAIMER.md`:
packs for regulated domains are aids, not advice or certification.

| Pack            | Status                          | What                                                                                                                                                     | Needs                               |
| --------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `ai-kit`        | full                            | Spec-driven development, agent guard hooks, secret/licence/SAST/SBOM checks, role agents and playbooks, PR template, delivery metrics                    | nothing (on by default)             |
| `fintech`       | full (core), checklists starter | Integer money, double-entry ledger, idempotency, maker-checker, audit hash chain, reconciliation, SQL triggers, PCI/SOC 2/ISO 27001/retention checklists | backend                             |
| `systems`       | full                            | C (Unity), C++ (doctest), Rust no_std + Embassy, x86-64 NASM, ARM64 GAS, analysis and QEMU notes                                                         | per sample, see `deno task systems` |
| `healthcare`    | starter                         | PHI tagging, consent records, FHIR client, HIPAA/GDPR checklists                                                                                         | backend                             |
| `data-ml`       | starter                         | uv Python, LLM evaluation harness, versioned prompts, pgvector RAG                                                                                       | uv                                  |
| `infra`         | starter                         | Compose, GitHub Actions, OpenTofu, Helm, OpenTelemetry/Prometheus/Jaeger/Grafana                                                                         | backend, Docker                     |
| `game`          | starter                         | Godot 4 skeleton and CI example                                                                                                                          | Godot                               |
| `eu-compliance` | starter                         | GDPR, AI Act, Cyber Resilience Act, Accessibility Act checklists, DPIA template                                                                          | nothing                             |

**full** = code that is tested here and meant to be used as is (still reviewed by you). **starter** = a skeleton or
checklist to adapt; parts were not run by this repository's tests (each README says which).

## Layout and `pack.json`

```
packs/<name>/
  pack.json      manifest (below)
  README.md      what it is, status, what is verified, what is missing
  rules.md       short rules for AGENTS.md (optional)
  files/         copied into the project root, same relative paths; never overwrites an existing file
```

Keys the generator uses (see the overlay contract in the root README): `files` (folder, default `files`), `tasks`,
`workspace`, `install`, `sync`, `check`, `requires` (`backend`, `stacks`, `modules`). Commands are a string or
`{ "cwd": "...", "run": "..." }`.

Keys for people and tooling (the generator ignores them):

| Key           | Meaning                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Folder name; lowercase letters, digits, `-`                                                                                  |
| `status`      | `full` or `starter`                                                                                                          |
| `description` | One or two sentences                                                                                                         |
| `stacks`      | `["any"]` or stack ids the pack is written for                                                                               |
| `default`     | `true` when new projects should include it (only `ai-kit`)                                                                   |
| `rules`       | File inside the pack whose text is appended to the project's `AGENTS.md` under `## Pack: <name>`                             |
| `adds`        | Summary the tests verify: `files` (paths under `files/`), `skills`, `agents` (names under `.claude/`), `checks` (task names) |

Rules for pack authors: no proprietary names or personal data, licence of everything copied in recorded in
`THIRD_PARTY_NOTICES.md`, Deno for JavaScript and TypeScript, tests next to the code, no file that already exists in
`template/` or in another pack, tasks named uniquely (`topic:verb`). `packs_test.ts` enforces the schema, the path and
task collisions, and that JSON and YAML files parse. Run it with `deno test -A packs/`.
