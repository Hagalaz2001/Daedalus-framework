# HIPAA and GDPR (health data) engineering checklist

Not legal or regulatory advice, not a compliance programme. HIPAA applies in the US to covered entities and their
business associates; GDPR applies to people in the EU/EEA whatever your location. Many products fall under both or
neither. Ask a qualified privacy lawyer first. See `DISCLAIMER.md`.

## HIPAA (US)

- [ ] Decide whether you are a covered entity or business associate. If you handle PHI for one, sign a Business
      Associate Agreement (BAA) with them and with every sub-processor (cloud, email, analytics, **AI providers**). Many
      AI tools offer no BAA: do not send PHI to them.
- [ ] Security Rule safeguards: risk analysis (documented, repeated), access control with unique user ids, automatic
      logoff, audit controls, integrity controls, transmission security, encryption at rest (addressable, treat as
      required).
- [ ] Privacy Rule: minimum necessary, notice of privacy practices, patient access and amendment, accounting of
      disclosures.
- [ ] Breach notification: process to assess and notify affected people and HHS (generally within 60 days; state laws
      can be shorter).
- [ ] Workforce training, sanctions policy, contingency plan (backups, disaster recovery, emergency mode).
- [ ] Retention of HIPAA documentation for 6 years.

## GDPR (EU/EEA, UK GDPR similar)

- [ ] Lawful basis (Art. 6) **and** an Art. 9 condition for health data (explicit consent, healthcare provision, public
      health, research with safeguards...). Consent must be specific, informed, withdrawable (`consent.ts`).
- [ ] Data protection impact assessment (DPIA, Art. 35) before large-scale health processing. Template: `eu-compliance`
      pack.
- [ ] Records of processing (Art. 30); data processing agreements with processors (Art. 28); transfers outside the EEA
      need a mechanism (adequacy decision, SCCs).
- [ ] Rights: access, rectification, erasure (with the medical-record retention exceptions), restriction, portability,
      objection; answer within one month.
- [ ] Privacy by design and default; data minimisation; retention schedule (`fintech` pack: `data-retention.md` format).
- [ ] Breach: notify the supervisory authority within 72 hours of becoming aware when there is risk to people.
- [ ] Data protection officer if required (large-scale health data usually is).

## Medical device software

If the software diagnoses, treats or monitors, it may be a medical device (FDA SaMD, EU MDR, UK MDR) needing a quality
management system (ISO 13485), software lifecycle (IEC 62304), risk management (ISO 14971) and clinical evaluation. This
pack provides none of that.
