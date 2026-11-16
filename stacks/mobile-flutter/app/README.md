# Flutter app (mobile-flutter)

Android and iOS app in Flutter with Riverpod. It talks to the backend only through the client generated from
`contracts/openapi.yaml` (in `packages/app_core`) and takes its colours, spacing and radii from `design/tokens.json`.
Never build this app for web.

## Run

```
deno task sync                       # generate the API client and theme tokens (repo root)
deno task dev:backend                # in another terminal, if the project has a backend
deno task dev:mobile                 # flutter run
```

The Android emulator reaches a backend on the host at `http://10.0.2.2:8787` (the default). For a device or
production: `flutter run --dart-define=API_BASE_URL=https://api.example.com`.

## Test and check

```
deno task check <app folder name>    # flutter analyze + flutter test for this app and packages/app_core
deno task shot:mobile [app] [name]   # screenshot on an emulator (boots one if none is running)
deno task build:android https://api.example.com [app] [--bundle]
```

## Structure

```
lib/
  main.dart                      composition root: theme, auth gate, routes
  core/                          providers shared by features (API client, auth)
  features/<feature>/
    <feature>.dart               public barrel; other code imports only this file
    data/                        repository wrapping the generated client
    domain/                      pure logic, only when there is some
    presentation/                pages and widgets (loading, empty, error states)
test/                            widget tests with a fake repository
```

## Conventions

- Feature-first. A feature imports another feature only through its barrel; `core/` never imports a feature.
  `deno task lint:boundaries` enforces this.
- State is Riverpod providers; pages read providers and never call the client directly.
- Use `appTheme()`, `AppColors`, `AppSpace` and `AppRadius` from `app_core`; no raw colours or magic numbers.
- Material 3, with platform conventions where iOS and Android differ.
- Secrets: the access token is kept in secure storage (`flutter_secure_storage`), never in shared preferences.

## Bundle id and name

The generator sets the bundle id (`--id`) in the Android Gradle files, the Kotlin package and the iOS project, and the
display name in the Android manifest, `Info.plist` and `main.dart`. Set a real, reverse-domain id before any store
upload; changing it later means a new store listing.
