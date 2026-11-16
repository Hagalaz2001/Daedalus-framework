# infra pack (status: starter)

Examples to adapt, not a production platform. Read `DISCLAIMER.md`: you are responsible for what you deploy, its cost
and its security. Nothing here deploys anything.

| Path                                      | What                                                                                                                                                         | Verified                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `docker-compose.yml`                      | Backend (built from `backend/Dockerfile`) + PostgreSQL 17 with health checks; set `POSTGRES_PASSWORD` first                                                  | YAML parses; compose not started in the blueprint tests |
| `infra/github-actions/ci.example.yml`     | Deno check pipeline with minimal permissions                                                                                                                 | YAML parses                                             |
| `infra/github-actions/deploy.example.yml` | Manual-approval deploy skeleton using an environment with required reviewers                                                                                 | YAML parses; deploy step is a placeholder               |
| `infra/opentofu/`                         | OpenTofu (MPL-2.0) example creating a Docker network and a Postgres container locally                                                                        | not run                                                 |
| `infra/helm/app/`                         | Helm chart skeleton: Deployment, Service, probes, resources, non-root                                                                                        | not run (no helm)                                       |
| `infra/observability/`                    | OpenTelemetry Collector (Apache-2.0) receiving OTLP, exporting metrics to Prometheus (Apache-2.0), traces to Jaeger (Apache-2.0), Grafana OSS for dashboards | YAML parses; not started                                |

Licence note: Grafana, Loki and Tempo are AGPL-3.0. Running their unmodified images next to your app is fine; do not
copy their source into your product, and check with your lawyer if you modify or offer them as a service.

Start locally: `export POSTGRES_PASSWORD=<choose one>`, `deno task infra:up`, and in another terminal
`deno task infra:obs` (Grafana http://localhost:3000, Jaeger http://localhost:16686, Prometheus http://localhost:9090;
send OTLP to localhost:4318). Default Grafana credentials are for local use only: change them before exposing anything.
