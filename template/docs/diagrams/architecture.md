# System architecture

```mermaid
flowchart LR
  subgraph Clients
    W1["Web app (React SPA)"]
    W2["Website (SSR/SSG)"]
    M1["Mobile (Flutter)"]
    M2["Mobile (React Native)"]
    D1["Desktop (GPUI / Tauri)"]
  end
  subgraph Backend["Backend (Hono on Deno)"]
    API["HTTP API<br/>contract validation, auth, tenancy"]
    MOD["Feature modules<br/>notes, plus installed ones"]
    AUTH["Better Auth<br/>/api/auth/*"]
    WORK["Job workers"]
  end
  subgraph Services
    DB[("PostgreSQL or MongoDB<br/>PGlite or a managed mongod locally")]
    S3[("Object storage<br/>S3-compatible")]
    MAIL["Email provider"]
    PUSH["Push: Expo, FCM, web push"]
    PAY["Stripe"]
    OBS["Telemetry and error tracking"]
  end
  W1 & W2 & M1 & M2 & D1 -->|"typed client from contracts/openapi.yaml"| API
  W1 & W2 & M1 & M2 & D1 -->|"sign in"| AUTH
  API --> MOD
  API --> AUTH
  MOD --> DB
  AUTH --> DB
  WORK --> DB
  MOD -->|"signed URLs"| S3
  MOD --> WORK
  WORK --> MAIL
  WORK --> PUSH
  MOD --> PAY
  API -.-> OBS
```

One contract feeds every client, so adding a client never changes the backend. Bytes of files go straight between
clients and object storage; the API only hands out signed URLs. Jobs, mail, push, payments and telemetry appear when
their module is installed ([../MODULES.md](../MODULES.md)).
