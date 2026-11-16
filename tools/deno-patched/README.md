# Patched Deno (temporary)

**Delete this folder, `.github/workflows/deno-patched.yml`, `template/scripts/native-deno.ts` and the `build:android` /
`build:ios` stack tasks when upstream ships the fix.**

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

## How it ships

1. `.github/workflows/deno-patched.yml` builds Deno from tag `v2.9.8` plus the patch for windows-x64, macos-arm64,
   macos-x64 and linux-x64 when a tag `deno-patched-v2.9.8-<n>` is pushed, and attaches the zips and
   `SHA256SUMS.txt` to a GitHub release. Nothing runs until the owner pushes that tag.
2. After the release exists, paste each SHA-256 into `ASSETS` and set `REPO` in `template/scripts/native-deno.ts`.
   Until then the script refuses to use any patched binary (no checksum, no trust).
3. `daedalus deno --install` downloads the zip for this OS, checks the SHA-256, unpacks it to
   `~/.daedalus/deno-patched/<tag>/` and records the exe hash beside it.
4. `deno task build:android` / `deno task build:ios` (RN stack) call `scripts/native-deno.ts`. If the running Deno is
   in the affected range (>= 2.9.7 and below `FIRST_FIXED`) it uses the verified patched binary; otherwise the user's
   own Deno. It always prints which Deno it uses and why. `daedalus deno --status` shows the same without building.

## Dropping it

When a Deno release contains the fix: set `FIRST_FIXED` in `native-deno.ts` to that version (everyone on it then runs
their own Deno automatically), and a release later delete the files listed at the top plus the notes in
`stacks/mobile-rn/README.md` and `docs/CLI.md`.

## Building by hand

```
git clone --depth 1 --branch v2.9.8 https://github.com/denoland/deno.git
cd deno && git apply <path>/deno-2.9.8-ipc-close.patch
cargo build --release -p deno          # toolchain 1.95.0 comes from rust-toolchain.toml; prebuilt V8 is downloaded
```

Point `DAEDALUS_DENO_HOME` at a folder laid out as `<tag>/deno(.exe)` + `deno(.exe).sha256` to use a local build.
