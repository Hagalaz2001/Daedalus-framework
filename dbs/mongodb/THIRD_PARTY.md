# Third-party items in the MongoDB flavour

| Package                    | Licence    | Used for                                                                   |
| -------------------------- | ---------- | -------------------------------------------------------------------------- |
| mongoose                   | MIT        | Schemas, models, indexes, queries                                          |
| mongodb                    | Apache-2.0 | The official driver (used by Mongoose and Better Auth's adapter)           |
| @better-auth/mongo-adapter | MIT        | Stores users, sessions, accounts, organizations and invitations in MongoDB |
| mongodb-memory-server      | MIT        | Starts a real `mongod` for local development and tests (dev only)          |

mongodb-memory-server downloads the MongoDB Community Server binary on first use (server licence: SSPL; it is a tool
fetched on the developer's machine, never bundled or redistributed by this repository, and never used in production).
