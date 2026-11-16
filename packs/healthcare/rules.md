- Health data is special: treat every field about a person's health, care or payment for care as PHI/special-category
  data. Tag it (`Phi<T>`, `docs/compliance/phi-conventions.md`); never log, print, put in URLs, analytics, error
  messages, test fixtures or AI prompts. Use synthetic patients only.
- Check a consent record (`hasConsent`) for the exact purpose before processing or sharing; withdrawn or expired consent
  means no.
- Minimum necessary: return only the fields the caller needs. Audit every read of a record with actor and purpose.
- Clinical logic (dosing, triage, alerts) is never written or changed by an AI agent without a qualified clinician
  reviewing it. Regulated software (medical devices: FDA, EU MDR, IEC 62304) needs a quality system this repo does not
  provide.
- Never connect to a real EHR, FHIR server or patient database with real credentials; never move real PHI.
