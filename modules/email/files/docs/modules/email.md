# Email module

Sends transactional mail from the backend and takes over the mail the base already needs (password reset, organization
invitations).

| Transport (`EMAIL_TRANSPORT`) | Use                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `log` (default)               | Prints the message; development                                                           |
| `resend`                      | Resend HTTP API (`RESEND_API_KEY`, `EMAIL_FROM`)                                          |
| `smtp`                        | Any SMTP server through nodemailer (`SMTP_URL`, `EMAIL_FROM`); Mailpit or MailHog locally |
| `memory`                      | Keeps messages in `outbox`; tests                                                         |

Templates are React Email components in `backend/src/modules/email/templates.tsx`. To add one, write the component, add
it to `templates`, then `await sendTemplate("welcome", user.email, { name: user.name })`.

Without this module the base prints mail in development and refuses to "send" in production, so a missing mailer is loud
rather than silent. Set up SPF, DKIM and DMARC on a domain you control before sending real mail.
