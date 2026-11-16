# Security policy

## Reporting a vulnerability

Use GitHub private vulnerability reporting: open the repository's **Security** tab and choose
**Report a vulnerability**. Do not open a public issue for security problems.

Include what is affected (generator, a stack template, a script), steps to reproduce, and the impact you see.
Maintainers acknowledge reports within 7 days and aim to publish a fix or mitigation within 90 days.

## Scope

- In scope: the generator (`new-project.ts`, `lib/`), the scripts copied into projects (`template/scripts/`), CI
  workflows and the stack templates under `stacks/`.
- Out of scope: vulnerabilities in third-party dependencies themselves (report them upstream) and in projects you
  generated and then changed.

## Supported versions

Only the latest release receives fixes.
