# Error tracking module

Status: thin. Server side only: add Sentry's SDK to each app separately (`@sentry/react`, `sentry_flutter`,
`@sentry/react-native`) and use the same DSN family so one project shows the whole picture.

Set `SENTRY_DSN` (and `SENTRY_RELEASE`, for example the git sha) and unexpected errors in the API are reported with the
request id as a tag; `AppError`s (401, 404, validation) are not reported. Leave the DSN empty in development.

**Self-hosting.** GlitchTip (MIT) accepts the Sentry SDK unchanged: run it, create a project, paste its DSN. Sentry's
own self-hosted edition uses a source-available licence, check it fits before choosing it.

Keep personal data out of reports (the SDK does not send IP addresses or cookies unless you enable it). Scrub secrets
from anything you attach, and set alerts for new issues rather than every event.
