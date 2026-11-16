# Request lifecycle

The order of middleware in `backend/src/app.ts`. Any step can end the request with an RFC 9457 problem response; the
error handler turns anything thrown into `application/problem+json` carrying the request id.

```mermaid
flowchart TD
  R["Incoming request"] --> A["1 Request id<br/>X-Request-Id, accepted or generated"]
  A --> B["2 Request log<br/>one JSON line when the response is done"]
  B --> C["3 Security headers<br/>CSP default-src none, HSTS, nosniff"]
  C --> D["4 CORS<br/>trusted origins only, credentials allowed"]
  D --> E["5 Rate limit<br/>per client, 429 with Retry-After"]
  E --> F{"/api/auth/*, /docs, /openapi.json?"}
  F -- "auth" --> BA["Better Auth handler<br/>stricter rate limit"]
  F -- "no" --> G["6 Session<br/>cookie or bearer token -> user or anonymous"]
  G --> H["7 Idempotency-Key<br/>replay a stored response or claim the key"]
  H --> I["8 Contract validation<br/>path, query and JSON body against openapi.yaml, defaults applied"]
  I --> J["9 Module middleware<br/>permissions, audit, tracing, when installed"]
  J --> K["10 Route handler<br/>requireTenant, service, repository, Postgres"]
  K --> L["Response"]
  I -- "invalid" --> X["400 problem+json with field errors"]
  K -- "thrown error" --> Y["Error handler<br/>AppError keeps its status, anything else is a logged 500"]
```

Handlers never parse input or check types: by step 10 the body and query already match the contract.
