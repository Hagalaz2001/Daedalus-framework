# PCI DSS engineering checklist (card data)

Not a certification and not advice. PCI DSS (v4.0.1 at the time of writing) is set by the PCI Security Standards
Council; your acquirer or a Qualified Security Assessor decides what applies to you. Read `DISCLAIMER.md`.

**First decision: stay out of scope.** Use a hosted payment page or the provider's SDK fields (Stripe Elements, Adyen
Drop-in and similar) so card numbers never touch your servers, logs, analytics or AI prompts. That usually means
self-assessment SAQ A instead of a full assessment. Confirm with your provider.

If you must handle card data:

- [ ] Never store the full track, CVV/CVC or PIN after authorisation. Store PAN only if needed, encrypted, with keys in
      a KMS/HSM, masked on display (first 6 / last 4 at most).
- [ ] Card data never appears in logs, errors, URLs, analytics, crash reports, test fixtures or AI tool prompts.
- [ ] TLS 1.2+ everywhere; no card data over email, chat or ticket tools.
- [ ] Network segmentation: the card-data environment is separate, with a documented data-flow diagram.
- [ ] Unique accounts, MFA for all access to the card-data environment, least privilege, access reviews.
- [ ] Vulnerability scans (quarterly external by an Approved Scanning Vendor), patching SLAs, dependency audit in CI
      (`deno task audit`), SAST in CI.
- [ ] Secure development: code review by a human on every change, no test data from production, separation of dev and
      production.
- [ ] Logging of access to card data, log integrity (the audit chain in `ledger/audit.ts` is a pattern, not the log PCI
      requires), retention of at least 12 months with 3 months immediately available.
- [ ] Incident response plan tested; written security policies; annual training.
- [ ] Payment page scripts inventoried and integrity-checked (v4 requirements 6.4.3 and 11.6.1 for e-commerce).
