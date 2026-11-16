// `deno task diagrams` writes docs/diagrams/database.md (a Mermaid ERD) from the Drizzle schema files, so the
// diagram cannot drift from the database. `--check` fails when the committed file is out of date (part of `check`).
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { is } from "drizzle-orm";

const root = new URL("../src/", import.meta.url);
const files = [new URL("shared/db/schema.ts", root)];
for await (const e of Deno.readDir(new URL("modules/", root))) {
  const schema = new URL(`modules/${e.name}/schema.ts`, root);
  if (e.isDirectory && await Deno.stat(schema).then(() => true, () => false)) files.push(schema);
}

const tables = new Map<string, ReturnType<typeof getTableConfig>>();
for (const file of files) {
  for (const value of Object.values(await import(file.href))) {
    if (is(value, PgTable)) tables.set(getTableConfig(value).name, getTableConfig(value));
  }
}

const type = (t: string) => t.replace(/\(.*\)/, "").replaceAll(" ", "_");
const blocks: string[] = [];
const links: string[] = [];
for (const [name, t] of [...tables].sort(([a], [b]) => a.localeCompare(b))) {
  const fkCols = new Set(t.foreignKeys.flatMap((fk) => fk.reference().columns.map((c) => c.name)));
  const unique = new Set(t.uniqueConstraints.flatMap((u) => u.columns.map((c) => c.name)));
  const rows = t.columns.map((c) => {
    const keys = [c.primary && "PK", fkCols.has(c.name) && "FK", (c.isUnique || unique.has(c.name)) && "UK"].filter(
      Boolean,
    );
    return `    ${type(c.getSQLType())} ${c.name}${keys.length ? ` ${keys.join(",")}` : ""}`;
  });
  blocks.push(`  ${name} {\n${rows.join("\n")}\n  }`);
  for (const fk of t.foreignKeys) {
    const ref = fk.reference();
    const nullable = ref.columns.some((c) => !c.notNull);
    links.push(
      `  ${getTableConfig(ref.foreignTable).name} ||--${nullable ? "o{" : "|{"} ${name} : "${
        ref.columns.map((c) => c.name).join(",")
      }"`,
    );
  }
}

const out = `# Database diagram

Generated from the Drizzle schema by \`deno task diagrams\`. Do not edit by hand; change the schema and run the task.
A solid crow's foot is a required reference, a circle an optional one. Conventions are in [../DATABASE.md](../DATABASE.md).

\`\`\`mermaid
erDiagram
${links.sort().join("\n")}
${blocks.join("\n")}
\`\`\`
`;

const target = new URL("../../docs/diagrams/database.md", import.meta.url);
if (Deno.args.includes("--check")) {
  const current = await Deno.readTextFile(target).catch(() => "");
  if (current !== out) {
    console.error("docs/diagrams/database.md is out of date: run `deno task diagrams`.");
    Deno.exit(1);
  }
} else {
  await Deno.mkdir(new URL(".", target), { recursive: true });
  await Deno.writeTextFile(target, out);
  console.log(`Wrote docs/diagrams/database.md (${tables.size} tables)`);
}
