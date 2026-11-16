# app_core

Shared Dart package for every Flutter app in the project.

- `lib/src/api/`: Dart models and Retrofit clients generated from `contracts/openapi.yaml` by `swagger_parser`
  (config in `swagger_parser.yaml`). Generated; never edit.
- `lib/src/api_factory.dart`: `createApiClient(baseUrl, bearerToken:)`.
- `lib/src/auth_client.dart`: `AuthClient` for the backend's Better Auth routes.
- `lib/src/theme/tokens.g.dart`: `AppColors`, `AppSpace`, `AppRadius`, `AppFonts`, generated from
  `design/tokens.json`. Generated; never edit.
- `lib/src/theme/`: `appTheme()` builds the Material 3 theme from those tokens.

Regenerate with `deno task sync` at the repository root. Check with `deno task check` (runs `flutter analyze` and
`flutter test` here and in every app).
