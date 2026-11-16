# Auth flows

Accounts are Better Auth under `/api/auth/*`. The same endpoints serve every client; only how the session is carried
differs.

## Web: session cookie

```mermaid
sequenceDiagram
  participant B as Browser app
  participant A as API
  B->>A: POST /api/auth/sign-in/email (credentials: include)
  A-->>B: 200 and Set-Cookie session_token (HttpOnly, Secure, SameSite)
  B->>A: GET /notes (cookie sent automatically)
  A-->>B: 200 notes of the caller's organization
  B->>A: POST /api/auth/sign-out
  A-->>B: cookie cleared
```

Same-site hosting (app and API under one parent domain) keeps cookies first-party; otherwise list the app's origin in
`AUTH_TRUSTED_ORIGINS`.

## Mobile and desktop: bearer token

```mermaid
sequenceDiagram
  participant M as Native app
  participant S as Secure storage
  participant A as API
  M->>A: POST /api/auth/sign-in/email
  A-->>M: 200 and header set-auth-token
  M->>S: store the token
  M->>A: GET /notes with Authorization Bearer token
  A-->>M: 200 notes
  M->>A: PUT /push/tokens (optional, push module)
```

Tokens live in the platform's secure storage (Keychain, Keystore), never in plain preferences or logs.

## OAuth (auth-extras module)

```mermaid
sequenceDiagram
  participant C as Client
  participant A as API
  participant P as Provider (GitHub, Google)
  C->>A: POST /api/auth/sign-in/social { provider, callbackURL }
  A-->>C: authorization URL
  C->>P: user signs in and consents
  P-->>A: GET /api/auth/callback/provider?code=...
  A->>P: exchange the code for tokens
  A-->>C: redirect to callbackURL, session cookie set
```

Native apps run the same exchange in an in-app browser and return to the app through its URL scheme; the session then
continues as a bearer token. A new user gets a personal organization on first sign-in, whichever method they used.
