# Data retention checklist

Retention periods are set by law, your regulator, your contracts and your policy, and they differ by country. The
numbers below are placeholders for you to replace after asking a qualified professional. See `DISCLAIMER.md`.

| Data                         | Keep for                                               | Why                                                           | Delete or anonymise how                                                       |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Ledger entries, transactions | `<years>` (financial record-keeping rules, often 5-10) | accounting, audit                                             | Never edited. Archive, then delete the whole period by a reviewed, logged job |
| Audit trail                  | `<years>`                                              | investigations, SOC 2 / PCI evidence (PCI: 12 months minimum) | Same; keep the hash anchor                                                    |
| KYC documents and results    | `<years after relationship ends>`                      | AML rules                                                     | Delete on schedule; keep the decision record                                  |
| Customer profile             | while the account is active + `<period>`               | contract                                                      | Erase or anonymise on request unless a legal hold applies                     |
| Application logs             | 30-90 days                                             | debugging                                                     | Automatic expiry; logs hold no card data or full personal data                |
| Backups                      | `<days>`                                               | recovery                                                      | Encrypted; expire on schedule; restores tested                                |
| Support tickets              | `<period>`                                             | service                                                       | Redact personal data                                                          |

- [ ] Every table with personal data has an owner and a documented retention rule.
- [ ] Deletion is a scheduled job with a dry run, a log and a human approval (an agent never runs it unattended).
- [ ] Immutable ledger vs the right to erasure: keep financial records under the legal-obligation exception, minimise
      personal data in them (store customer ids, not names), and erase the personal data elsewhere. Ask counsel.
- [ ] Legal hold process exists and suspends deletion.
- [ ] Backups and replicas are included in deletion planning.
