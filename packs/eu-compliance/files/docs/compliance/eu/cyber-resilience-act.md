# Cyber Resilience Act (Regulation (EU) 2024/2847) checklist

Applies to products with digital elements placed on the EU market (apps, firmware, connected devices, software sold or
distributed commercially; many open-source stewards have lighter duties). Reporting duties start before the main
obligations; check the dates.

- [ ] Determine whether you are a manufacturer, importer, distributor or open-source steward.
- [ ] Security by design and by default: no known exploitable vulnerabilities at release, secure defaults, minimal
      attack surface, data protection, secure update mechanism.
- [ ] SBOM in a machine-readable format (`deno task sbom`), kept up to date.
- [ ] Vulnerability handling: a public contact (see `SECURITY.md`), coordinated disclosure policy, security updates free
      of charge for the support period (at least 5 years unless the product life is shorter).
- [ ] Report actively exploited vulnerabilities and severe incidents to the authority (ENISA / national CSIRT) within
      the stated deadlines (early warning 24 hours).
- [ ] Technical documentation and EU declaration of conformity; CE marking for in-scope products; some product classes
      need third-party assessment.
- [ ] Third-party components: keep them updated and track their advisories (`deno task audit`).
