---
name: deploy
description: Put this project online - database (Supabase/Postgres), backend container, websites, Android builds - and check it works. Use when the maintainer says to deploy, ship, release to production, publish the app, or set up staging. Never deploy without the maintainer's explicit go-ahead for that specific deployment.
---

# Deploy

**Ask first.** Deploying, store uploads and production database changes affect real people and
cost money. Confirm with the maintainer: which environment (staging or production), which hosts and
accounts, and the domain names. Never paste secrets into chat or commit them; set them in each
host's dashboard or CLI.

## The pieces

| Piece | Default host | How |
|---|---|---|
| Database | Supabase (Postgres) | Create the project; copy the **pooler** connection string into the backend's `DATABASE_URL`. Migrations apply when the backend starts. |
| Backend | Any container host (Render, Fly.io, Railway, Google Cloud Run) | `backend/Dockerfile`, built from the repo root: `docker build -f backend/Dockerfile -t <name> .` Env: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ random chars), `BETTER_AUTH_URL` (its public https URL), `AUTH_TRUSTED_ORIGINS` (the websites' origins). Health check: `GET /health`. |
| Websites | Vercel (or any static host) | Each app in `apps/<web>` has `vercel.json`; set `VITE_API_BASE_URL` to the backend URL; project root = repo root. |
| Android | Google Play / direct APK | `deno task build:android https://api.example.com [app] [--bundle]`. Play needs an upload keystore (kept outside git) configured in `android/app/build.gradle.kts` `signingConfigs`. |
| iOS | App Store | Needs a Mac with Xcode: `flutter build ipa --dart-define=API_BASE_URL=…`, then upload with Xcode or Transporter. |

## Order

1. Database → 2. backend (check `/health`, then sign up a test account through the API) →
3. websites (sign in and use the main journey in a real browser) → 4. mobile builds pointed at the
deployed backend (install the APK on the emulator: `adb install`, sign in, main journey).
Cookies across sites: serve the website and backend from the same site (e.g. `app.example.com` and
`api.example.com`) so the sign-in cookie works; mobile uses bearer tokens and doesn't care.

## Record

Add the URLs and hosts to AGENTS.md "This project" (no secrets), a `docs/REPORT.md` entry with the
business-update skill ("The app is live at …; tested: …"), and tag the release (git-workflow).
