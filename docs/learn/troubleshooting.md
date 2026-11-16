# Troubleshooting: the 15 most common problems

Find your message, apply the fix. Commands run in your project folder unless noted.

## 1. `deno` is not recognized, or `command not found`

Deno is not installed or your terminal started before it was. Install it ([install guide](install.md)), then **open a new
terminal**. On Windows the folder `%USERPROFILE%\.deno\bin` must be on your PATH; on macOS and Linux `~/.deno/bin`.

## 2. `daedalus` is not found after installing it

`deno install -g` puts commands in `~/.deno/bin`. Add that folder to your PATH and open a new terminal. Or skip the
install and run `deno run -A cli.ts <command>` from the Daedalus folder.

## 3. Deno is too old

Daedalus needs Deno 2.9 or newer. Run `deno upgrade`, then `deno --version`.

## 4. `Refusing to overwrite: ... already exists and is not an empty folder`

`daedalus new` will not write into a folder that already has files. Pick a new folder name or delete the empty attempt.

## 5. `Daedalus checkout not found`

Commands like `add-app` need the Daedalus folder you cloned. Pass `--daedalus <folder>`, set the environment variable
`DAEDALUS_HOME`, or keep the clone in a folder called `daedalus` next to your project (or at `~/daedalus`).

## 6. `Unknown or unfinished stack`

You asked for a stack that this checkout does not have. List what exists: `daedalus list stacks --json`.

## 7. `deno install` fails: a package version "does not exist"

Deno ignores packages published in the last 24 hours as a safety rule. Pin the previous version, or wait a day. Do not
turn the rule off.

## 8. `deno audit` fails

A dependency has a known security problem. Try `deno audit --fix`, or upgrade the package and run `deno task check`
again. Only if the advisory truly does not apply may a stack list it under `audit.ignore` with a written reason.

## 9. `lint:boundaries` fails

One feature imports another feature's inner files. Import through its public entry (`features/<name>`, which resolves to
`index.ts`; `<name>.dart` in Flutter), or move the shared code into `shared/` (`core/` in Flutter).

## 10. `Deno-only rule violated`

and run `deno install` or a `deno task` instead. Do not use the other package managers in this project.

## 11. Type errors that make no sense after switching branches

Stale installed packages. Delete the `node_modules` folders and run `deno install`, then `deno task sync`.

## 12. The app shows old colours or an old API shape

You edited the sources but did not regenerate. Run `deno task sync`. Never edit generated files such as
`packages/api_ts/src/schema.d.ts` or `tokens.g.ts`.

## 13. `flutter` or `cargo` not found during `deno task check`

You chose an app that needs that toolchain. Install Flutter or Rust (see [install](install.md)) and open a new terminal.
Check `.blueprint.json` to see which stacks the project uses.

## 14. The mobile app cannot reach the backend

An Android emulator reaches your PC at `10.0.2.2`, not `localhost`. A real phone needs your PC's address on the local
network. Set `EXPO_PUBLIC_API_URL` (React Native) as described in `apps/mobile/README.md`, and start the backend with
`deno task dev:backend`.

## 15. `Blocked by guard (...)` from your AI assistant, or `[NEEDS CLARIFICATION]` stops a spec

Two different safety stops that are working as intended.

- **Guard.** The ai-kit hook blocked a risky command (deploy, delete, force-push, `.env`). Read the reason. If you really
  want it, run the command yourself, or restart the assistant with `AI_GUARD_APPROVE=<category>`.
- **Spec.** `deno task spec:plan` refuses while `[NEEDS CLARIFICATION]` remains in the spec. Answer each open question in
  `spec.md`, remove the marker, then run it again.

## Still stuck

- `daedalus docs "<words from the error>" --json` searches these docs.
- `daedalus doctor` checks your machine.
- Open an issue with the command you ran and the last 30 lines of output. Remove secrets first.
