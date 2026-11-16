# SOC 2 readiness checklist

Not an audit and not advice. SOC 2 is an attestation issued by a licensed CPA firm against the AICPA Trust Services
Criteria (Security is mandatory; Availability, Confidentiality, Processing Integrity, Privacy are optional). What a
checklist can do is shorten the work before the auditor arrives. Read `DISCLAIMER.md`.

Evidence an auditor will ask for, and where this project gives you a start:

- [ ] Change management: every change has an owner, a reviewer and a passing pipeline (PR template, branch protection,
      `docs/RESPONSIBLE-AI.md`). Keep the PR history as evidence; record AI-assisted changes.
- [ ] Access control: SSO and MFA, joiner/mover/leaver process, quarterly access review, least privilege.
- [ ] Segregation of duties: maker-checker on money movement (`ledger/approvals.ts`), no self-approval of own PRs.
- [ ] Logging and monitoring: audit trail of sensitive actions, alerting, log retention
      (`docs/compliance/data-retention.md`).
- [ ] Vulnerability management: dependency audit, SAST, secret scanning, patch SLAs, pen test yearly.
- [ ] Incident response: written plan, on-call, post-incident reviews (`docs/QA.md`), tested.
- [ ] Availability: backups with tested restores, capacity monitoring, documented RTO/RPO, status communication.
- [ ] Vendor management: list of sub-processors, security review, contracts, SBOM (`deno task sbom`).
- [ ] Policies: information security, acceptable use (including AI tools and what data may go into them), data
      classification, business continuity. Reviewed yearly, acknowledged by staff.
- [ ] Risk assessment yearly with a register of risks and owners.
- [ ] HR: background checks where lawful, security training, offboarding checklist.

Type I = controls designed correctly at a date; Type II = controls operated effectively over 3-12 months. Start the
evidence collection (a tool such as Vanta, Drata or a spreadsheet) before the audit window opens.
