# Observability and analytics module

Status: thin.

**Traces, metrics and logs (OpenTelemetry).** Deno exports OpenTelemetry itself; no SDK to wire:

```
OTEL_DENO=true OTEL_SERVICE_NAME=app-backend OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 deno task start
```

Point the endpoint at any OTLP/HTTP collector (Grafana Tempo/Loki, SigNoz, Jaeger, Honeycomb...). The module adds the
route pattern, request id, user id and organization id to each request's span, so you can answer "which route got slow
for which tenant". The base already writes JSON logs with the request id; with `OTEL_DENO=true` Deno exports console
output as OTel logs too.

**Product analytics.** `await track("note_created", user.id, { length })` sends to PostHog (`POSTHOG_KEY`, optionally
`POSTHOG_HOST` for EU or self-hosted) and/or Plausible (`PLAUSIBLE_DOMAIN`, `PLAUSIBLE_HOST`). Without keys it does
nothing and it never throws. Track outcomes (signed up, paid), not clicks, and send ids rather than personal data.

Use it with the error tracking module: the request id ties a trace, a log line, an audit row and an error report
together.
