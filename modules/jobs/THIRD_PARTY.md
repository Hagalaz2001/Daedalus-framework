# Third-party items in the jobs module

| Package                     | Licence    | Used for                                                                                                |
| --------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| pg-boss                     | MIT        | Job queue on PostgreSQL (SKIP LOCKED, retries, cron). Creates its own `pgboss` schema                   |
| @electric-sql/pglite-socket | Apache-2.0 | Tests only: serves the in-process database over TCP so pg-boss can be tested without a Postgres install |
