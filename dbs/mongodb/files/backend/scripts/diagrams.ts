// `deno task diagrams` writes docs/diagrams/database.md (a Mermaid diagram of the collections and their references) from
// the Mongoose models, so the diagram cannot drift from the code. `--check` fails when the committed file is stale.
import mongoose from "mongoose";
import { buildModels } from "../src/shared/db/models.ts";

const models = Object.values(buildModels(mongoose.createConnection()));
const name = (m: (typeof models)[number]) => m.collection.collectionName;
const collectionOf = new Map(models.map((m) => [m.modelName, name(m)]));

const blocks: string[] = [];
const links: string[] = [];
for (const m of [...models].sort((a, b) => name(a).localeCompare(name(b)))) {
  const unique = new Set(m.schema.indexes().filter(([, o]) => o?.unique).flatMap(([f]) => Object.keys(f)));
  const rows: string[] = [];
  for (const [path, type] of Object.entries(m.schema.paths)) {
    const ref = (type.options as { ref?: string }).ref;
    const keys = [path === "_id" && "PK", ref && "FK", unique.has(path) && "UK"].filter(Boolean);
    rows.push(`    ${String(type.instance).toLowerCase()} ${path}${keys.length ? ` ${keys.join(",")}` : ""}`);
    if (ref && collectionOf.has(ref)) {
      links.push(`  ${collectionOf.get(ref)} ||--${type.isRequired ? "|{" : "o{"} ${name(m)} : "${path}"`);
    }
  }
  blocks.push(`  ${name(m)} {\n${rows.join("\n")}\n  }`);
}

const out = `# Database diagram

Generated from the Mongoose models by \`deno task diagrams\`. Do not edit by hand; change the models and run the task.

Each box is a MongoDB collection. \`FK\` marks a field holding another collection's \`_id\`; the application enforces it.

A solid crow's foot is a required reference, a circle an optional one. Conventions: [../DATABASE.md](../DATABASE.md).

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
  console.log(`Wrote docs/diagrams/database.md (${models.length} collections)`);
}
