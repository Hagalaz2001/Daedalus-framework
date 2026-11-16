// `deno task db:generate` diffs these schema files against drizzle/ and writes the next SQL migration.
// Migrations apply automatically when the backend starts (src/shared/db/client.ts).
// drizzle-kit is a dev tool run on demand (`--no-lock`), so it stays out of the app's dependency tree and lockfile.
export default {
  dialect: "postgresql",
  schema: ["./src/shared/db/schema.ts", "./src/modules/*/schema.ts"],
  out: "./drizzle",
};
