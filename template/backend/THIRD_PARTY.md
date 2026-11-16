# Third-party items in the backend

Runtime dependencies are exact-pinned in `deno.json`; `deno audit` runs as part of the project check.

| Package                                       | Licence    | Used for                                                         |
| --------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| hono                                          | MIT        | HTTP framework                                                   |
| better-auth, @better-auth/drizzle-adapter     | MIT        | Accounts, sessions, organizations, invitations                   |
| drizzle-orm                                   | Apache-2.0 | Type-safe SQL, schema, migrations runner                         |
| drizzle-kit (run on demand, not a dependency) | MIT        | Generates SQL migrations from the schema                         |
| postgres (postgres.js)                        | Unlicense  | Postgres driver for `DATABASE_URL`                               |
| @electric-sql/pglite                          | Apache-2.0 | In-process Postgres for local development and tests              |
| ajv, ajv-formats                              | MIT        | Validates requests against the OpenAPI contract                  |
| @std/yaml, @std/fs, @std/assert (JSR)         | MIT        | Reading the contract, scripts, tests                             |
| @scalar/hono-api-reference                    | MIT        | API reference page served at `/docs` (assets load from jsDelivr) |
| uuid                                          | MIT        | UUIDv7 ids                                                       |
| openapi-fetch (via packages/api_ts)           | MIT        | Typed client types shared with the backend                       |
