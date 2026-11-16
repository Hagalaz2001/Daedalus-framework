# Auth extras module

Adds three things to Better Auth, all under `/api/auth/*` (not in the OpenAPI contract, like the rest of Better Auth):

- **OAuth.** Set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` and/or `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`; the
  provider turns on. Register the callback `<BETTER_AUTH_URL>/api/auth/callback/<provider>` with the provider.
- **Magic link.** `POST /api/auth/sign-in/magic-link { email }` mails a one-time link. Delivery goes through the mailer:
  install the email module for real mail.
- **Two-factor (TOTP).** `POST /api/auth/two-factor/enable { password }` returns a `totpURI` (show it as a QR code) and
  backup codes; sign-in then answers with `twoFactorRedirect` until the code is verified.

Clients: add `magicLinkClient()` and `twoFactorClient()` to the Better Auth client plugins of each web app; mobile apps
call the same endpoints with the bearer token. The module changes the auth tables (two-factor), so install ran
`db:auth-schema` and generated a migration: commit both.
