<!-- DRAFT for denoland/deno PR #37080 (and issue #37040). Not posted. The owner posts it. -->

Tested this fix (rebased onto v2.9.8, `cargo build --release`, Windows x64) against a real-world case: `expo export --platform android` of a freshly generated Expo 58 / Metro 0.87 / React Native 0.88 app.

**Results (same machine, same project, default settings)**

| Deno | Result |
|---|---|
| 2.9.6 | OK every run, ~22 s, 28 files, 6.8 MB Hermes bundle |
| 2.9.8 stock | hangs at Metro 3869/3870 modules, or `Uncaught Error: IPC channel is already disconnected` (`ChildProcess.disconnect` <- `readLoop`) after ~3 s |
| 2.9.8 + this PR | the `ERR_IPC_DISCONNECTED` crash is gone (0 of 5 runs, vs 2 of 4 on stock with `--max-workers 1`), 1 run OK, but other runs still hang at 3869/3870 or exit 0 after 3-4 s with no output |

So the diff does what it says for the IPC error and looks right to me (the `target.connected` re-check after the awaited read, explicit user `disconnect()` still throws). On Windows it is not sufficient for Expo: something else changed between 2.9.6 and 2.9.7 (possibly also from #36644, which moved the IPC disconnect into the exit path). Metro runs its transforms in worker threads (`jest-worker`, `enableWorkerThreads`), no child processes are alive while it hangs, and a standalone `jest-worker` farm (14 workers, 4000 jobs, threads or processes) works fine on 2.9.8, so it needs the full Expo graph to trigger. I have not bisected further yet.

Note on the issue's repro: the 50-fork loop with a `sleep` grandchild does not crash on Windows (50/50 OK on stock 2.9.8), because the IPC pipe is not inherited there. It is Unix only, like the regression test in this PR (`ignore: windows`).

Other checks with the patched binary: `deno task test` of our repo 159 passed / 0 failed, same as stock.

Happy to share the Expo project (it is generated, no secrets) or test a candidate fix for the remaining hang.

---

**Separate finding to file as its own issue (Windows; Deno 2.9.7 and 2.9.8 affected, 2.9.6 not)**

`expo export --platform android` (Expo 58, Metro 0.87.1; `@expo/metro-config` sets `unstable_workerThreads: true`, so
`jest-worker` uses `node:worker_threads` with 14 workers) intermittently never finishes: Metro logs
`metro:bundling:progress current=3869 total=3870` and then nothing. CPU drops to zero, there are no child processes and
no error is printed. Other runs of the same command exit 0 after 3-4 s with only "Starting Metro Bundler" printed (no
output files), or throw the IPC error. With `DEBUG=expo:*`, 2.9.6 continues with `serializer:hermes:build_started`.
Repro: generate an Expo router app and run `CI=1 expo export --platform android`. A standalone `jest-worker@29.7.0`
farm (14 workers, 4000 jobs, 10 B to 400 KB results) passes on 2.9.6, 2.9.8 and the patched build, with
`enableWorkerThreads` true and false, so it needs the real Metro graph to trigger.
