# Security policy

## Reporting a vulnerability

Do not open a public issue for a security problem. Report it privately:

- GitHub: the repository's **Security** tab, then **Report a vulnerability** (private vulnerability reporting).
- GitLab: create a confidential issue (tick "This issue is confidential").
- Or write to: `<security contact: replace with a monitored address>`

Include what is affected, how to reproduce it, and the impact you see. Do not include real customer data.

We acknowledge reports within 3 working days and keep you informed until a fix is released. Please give us a reasonable
time to fix the problem before you publish details.

## Supported versions

Only the latest release receives security fixes.

## How this project protects itself

Secret scanning, static analysis, dependency and licence checks, container scanning and signed releases run on every
change. What each check does and how to respond to a failure: [docs/DEVSECOPS.md](docs/DEVSECOPS.md).
