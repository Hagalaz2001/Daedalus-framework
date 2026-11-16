- Infrastructure code is prepared, planned and reviewed by agents; a human runs `apply`, `deploy`, `helm upgrade`,
  `kubectl` changes and anything that creates cost. Show the plan output, do not run it against shared environments.
- No secrets in compose files, Terraform/OpenTofu state, Helm values or CI files: use environment variables, secret
  stores and CI secrets. Pin image tags and action versions; no `latest`.
- Least privilege: minimal CI `permissions:`, no wildcard cloud IAM, containers run as non-root, read-only file system
  where possible.
- Every service has a health check, resource limits and logs to stdout. Add telemetry through OpenTelemetry, not a
  vendor SDK.
