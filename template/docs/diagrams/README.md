# Diagrams

Mermaid diagrams, rendered by GitHub and most editors. Kept small; the text next to each says what to trust.

| Diagram                                   | Shows                                                    | Kept in sync by                                                             |
| ----------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Generator flow](generator-flow.md)       | How `daedalus new` and `add-module` build a project      | By hand: update with the generator                                          |
| [Development loop](development-loop.md)   | The daily cycle from contract to commit                  | By hand                                                                     |
| [AI-assisted workflow](ai-workflow.md)    | Who does what between a human's intent and a merge       | By hand                                                                     |
| [System architecture](architecture.md)    | Clients, API, modules and backing services               | By hand                                                                     |
| [Request lifecycle](request-lifecycle.md) | The backend middleware chain, in order                   | By hand: mirrors `backend/src/app.ts`                                       |
| [Auth flows](auth-flows.md)               | Cookie (web), bearer (mobile, desktop) and OAuth sign-in | By hand                                                                     |
| [Deployment pipeline](deployment.md)      | From pull request to production                          | By hand                                                                     |
| [Database](database.md)                   | Every table or collection and its relations              | **Generated**: `deno task --cwd backend diagrams`; `check` fails when stale |
