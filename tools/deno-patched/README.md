# Patched Deno (temporary)

**Documentation only. See Status below for what Daedalus actually uses.**

## What and why

Deno 2.9.7 and 2.9.8 have a `node:child_process` regression: `readLoop` calls `target.disconnect()` on the internal
`CLOSE` message even when the child-exit path already disconnected the channel, so it throws
`ERR_IPC_DISCONNECTED` ("IPC channel is already disconnected"). `expo export --platform android|ios` (Metro workers
over IPC) then dies or hangs; 2.9.6 is fine. Web builds, `expo start` and `deno task check` are not affected.

- Upstream issue: https://github.com/denoland/deno/issues/37040
- Upstream fix (open, not merged when this was written): https://github.com/denoland/deno/pull/37080
- Regression came from https://github.com/denoland/deno/pull/36644 (first shipped in 2.9.7).

`deno-2.9.8-ipc-close.patch` is that fix: in `ext/node/polyfills/internal/child_process.ts` the CLOSE branch only
calls `target.disconnect()` when `target.connected` is still true. An explicit user `disconnect()` on a closed channel
still throws. It also carries the PR's regression test (`tests/unit_node/child_process_test.ts`, Unix only).

## Status (tested 2026-11-17, Windows 10, generated RN app, Expo 58 / Metro 0.87)

Decision: Daedalus does **not** use this patched build. The patch removes the `IPC channel is already disconnected`
crash but does not make `expo export` reliable on Windows: Metro runs its transforms in worker threads (no child
processes alive), and with 2.9.8 (stock or patched) the export still intermittently hangs at 3869/3870 modules or
exits 0 after 3-4 s without output. Official Deno 2.9.6 succeeds every time (22 s, 6.8 MB Hermes bundle).

So `template/scripts/native-deno.ts` (used by `deno task build:android` / `build:ios` and `daedalus deno`) downloads
the official **Deno 2.9.6** zip when the user's Deno is >= 2.9.7 and below `AFFECTED_UNTIL`, checks it against the
SHA-256 embedded in the script (from the release's `.sha256sum` files: windows-x64, macos-arm64, macos-x64,
linux-x64, linux-arm64), caches it under the Daedalus cache dir (`$DAEDALUS_CACHE`, else `%LOCALAPPDATA%\daedalus` or
`~/.daedalus`) and runs the build with it, printing which Deno it uses and why.

This folder stays as documentation of the partial upstream fix. `.github/workflows/deno-patched.yml` is manual-only.

## Dropping it

When a Deno release fixes `expo export`: set `AFFECTED_UNTIL` in `native-deno.ts` to that version (users on it then
run their own Deno automatically), and a release later delete this folder, the workflow, `native-deno.ts`, the
`build:android` / `build:ios` tasks and the notes in `stacks/mobile-rn/README.md` and `docs/CLI.md`.

## Building by hand

```
git clone --depth 1 --branch v2.9.8 https://github.com/denoland/deno.git
cd deno && git apply <path>/deno-2.9.8-ipc-close.patch
cargo build --release -p deno          # toolchain 1.95.0 comes from rust-toolchain.toml; prebuilt V8 is downloaded
```
