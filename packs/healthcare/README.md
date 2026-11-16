# healthcare pack (status: starter)

Starting points for software that touches health data. Read `DISCLAIMER.md`: this is not medical, legal or regulatory
advice, not HIPAA/GDPR compliance and not a medical device quality system.

| File                                 | What                                                                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/shared/phi/phi.ts`      | `Phi<T>`: a wrapper that hides its value from `toString`, JSON, `console.log` and string templates; `reveal()` is the only way out and is greppable. `redact()` for objects with listed PHI fields |
| `backend/src/shared/phi/consent.ts`  | Consent record type and `hasConsent(records, subject, purpose, at)`: latest decision wins, expiry and withdrawal respected                                                                         |
| `backend/src/modules/fhir/client.ts` | Minimal typed FHIR R4 client (read, search) with injected `fetch`, bearer token, OperationOutcome errors                                                                                           |
| `docs/compliance/hipaa-gdpr.md`      | HIPAA Security/Privacy Rule and GDPR Art. 9 engineering checklists                                                                                                                                 |
| `docs/compliance/phi-conventions.md` | How to tag, store, log and test PHI                                                                                                                                                                |

Tests: `deno task test:phi`. Depth: small on purpose. Missing: terminology (SNOMED, LOINC), SMART on FHIR login, HL7 v2,
DICOM, a real consent store, break-glass access, de-identification. Each needs domain experts.
