# PHI conventions

PHI = information about a person's health, care or payment for care that identifies them (HIPAA) and, in the EU, health
data as a special category (GDPR Art. 9). Treat both strictly.

1. **Tag at the boundary.** Wrap PHI in `Phi<T>` (`backend/src/shared/phi/phi.ts`) as soon as it enters the system
   (request body, database row, FHIR response). Unwrap with `reveal()` only where it is used, never to log.
2. **Name it.** Database columns holding PHI get a `phi_` prefix or a `-- PHI` comment in the migration, so a reviewer
   and a scanner can find them. Keep a list in `docs/compliance/phi-inventory.md` (table, column, why, retention).
3. **Separate identity from clinical data** where you can: keep names and contacts in one table keyed by an opaque id
   and clinical rows keyed by that id only.
4. **Never in:** logs, error messages, URLs and query strings, analytics and crash reports, push notification text, file
   names, test fixtures, screenshots, AI prompts, issue trackers.
5. **Test with synthetic data only.** Generate it; never copy from production, even "just a few rows".
6. **Encrypt** in transit (TLS 1.2+) and at rest; field-level encryption for the most sensitive fields; keys in a KMS.
7. **Audit** every read and write of PHI: who, what record, purpose, when. Review the log. (`fintech` pack: `audit.ts`
   is a tamper-evident pattern you can reuse.)
8. **Access:** least privilege, role and relationship based (a clinician sees their patients), break-glass with
   alerting, session timeouts.
9. **De-identification** (HIPAA Safe Harbor / Expert Determination, GDPR anonymisation) is a specialist task. Do not
   assume removing the name is enough.
