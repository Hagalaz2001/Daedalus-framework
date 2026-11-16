# Measure what matters

AI makes producing code cheap and fast. That raises volume, and volume without review raises failures. Speed that ships
bugs is not speed. Track four numbers (the DORA metrics, from Google's DevOps Research and Assessment) and watch the
pair that protect stability.

| Metric                | Question                                               | Direction                            |
| --------------------- | ------------------------------------------------------ | ------------------------------------ |
| Lead time for changes | Commit to running in production                        | down                                 |
| Deployment frequency  | How often you release                                  | up                                   |
| Change failure rate   | Share of releases that cause a bug, rollback or hotfix | down (this is the one AI can worsen) |
| Time to restore       | How long to recover from a failed release              | down                                 |

Guardrails for AI-heavy teams:

- If change failure rate or time to restore gets worse while lead time improves, slow down: smaller diffs, more review,
  more tests. Do not chase speed.
- Review time is the bottleneck. Keep diffs reviewable (about 15 minutes); one concern per PR.
- Count AI-assisted PRs separately (the PR template has the field) and compare their failure rate with the rest. Use the
  result to decide where AI needs tighter gates, not to blame anyone.
- Track escaped defects found by users, rework (code rewritten within 2 weeks) and flaky-test rate.
- Do not turn these into individual targets; they measure the system.

Minimal way to start: tag each release PR with `failed-release` when it needs a rollback or hotfix, and record deploy
and recovery times in `docs/REPORT.md`. Compute the four numbers monthly.
