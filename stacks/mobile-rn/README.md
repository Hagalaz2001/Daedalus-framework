# Mobile: React Native (Expo)

Daedalus stack `mobile-rn`: Expo SDK 58, Expo Router, TypeScript (strict), TanStack Query, the shared
`packages/api_ts` client, Better Auth with bearer tokens in secure storage. The UI is React Native Reusables on
NativeWind with Lucide icons, themed from `design/tokens.json`. Everything installs and runs under Deno.

## Run

From the generated project root:

```sh
deno install            # once
deno task sync          # tokens + API client
deno task dev:mobile    # expo start (press a for Android, w for web)
deno task check         # typecheck, lint, tests, feature boundaries
```

Set `EXPO_PUBLIC_API_URL` (see `.env.example`). The Android emulator reaches your PC at `10.0.2.2`; a real device
needs your PC's LAN address. `deno task export:web` and `deno task export:android` build the app without a device.

## Structure

```
app/                 Expo Router routes: thin wrappers that wire screens to navigation
src/features/<name>/ ui/ (screens), state/ (hooks, providers), data/ (API calls), index.ts (public entry)
src/shared/ui/       the kit: wrappers over Reusables primitives (primitives/ is copied code)
src/shared/theme/    theme provider; tokens.g.ts is generated
src/shared/api/      the only client for the backend (generated from the OpenAPI contract)
src/shared/lib/      storage, token, date helpers
```

Features import each other only through `index.ts`; the boundary check in `deno task check` enforces it. Screens
take navigation callbacks as props so they stay testable; the route files own `router.push`.

## UI kit

Components: Button, IconButton, Input, Select (bottom sheet), Checkbox, Switch, Card, ListRow, Dialog, Sheet, Toast,
Tabs, Avatar, Badge, Skeleton, EmptyState, ErrorState, PageHeader and Screen (app shell with safe areas).
Every touch target is at least 48 dp, text follows the system font size up to 1.6x, icon-only buttons require a label.

Screens (each wired to the API client with loading, empty and error states): onboarding, sign in, sign up, forgot
password, home, notes list with search and filters, note detail, note form, settings, profile with account deletion,
not found. Screenshots at 390 px, light and dark, are in `docs/screenshots/`.

## Theme and presets

`design/tokens.json` is the source. `deno task sync` runs `scripts/tokens/mobile-rn.ts`, which writes
`src/shared/theme/tokens.g.ts` and `global.css` (NativeWind variables in shadcn naming). Any preset file works as
`tokens.json`; an optional `colorDark` block overrides the dark palette, otherwise it is derived from the light one.
Never hard-code a colour: use classes (`bg-primary`, `text-muted-foreground`) or `useTheme()`.

## Known limits

- The API contract has no update operation, so the note form only creates. Add `updateNote` to the contract, run
  `deno task sync`, and extend `NoteFormScreen`.
- Forgot password and delete account call Better Auth endpoints that the backend must enable
  (`sendResetPassword`, `user.deleteUser.enabled`); until then the screens show the server's error.
- Fonts are the system fonts. Add `expo-font` and a font family if the brand needs one.
- Under Deno on Windows, `metro.config.js` carries a small patch for mixed path separators.
- `expo export --platform android` (and ios) fails under the Deno runtime: Deno's `child_process` IPC breaks when Expo
  spawns its transform workers ("IPC channel is already disconnected", or a silent exit with no output). The same
  command under Node (`node node_modules/expo/bin/cli export --platform android`) exports a 6.8 MB Hermes bundle. Web
  export, `deno task check` and `expo start` are unaffected. Use Node (or EAS Build) for native builds until Deno fixes
  its IPC.

Third-party code and licences: `THIRD_PARTY.md`.
