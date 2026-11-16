// Collects release artifacts into artifacts/: a source archive, the build output of every app that has one, and a
// SHA-256 list. Run by the release workflow after `deno task check` (which builds the apps): `deno run -A scripts/ci/artifacts.ts v1.2.0`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const version = Deno.args[0] ?? "dev";
const out = "artifacts";
mkdirSync(out, { recursive: true });

function run(cmd: string, args: string[]) {
  const r = new Deno.Command(cmd, { args, stdout: "inherit", stderr: "inherit" }).outputSync();
  if (!r.success) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

run("git", [
  "archive",
  "--format=tar.gz",
  `--prefix=source-${version}/`,
  "-o",
  join(out, `source-${version}.tar.gz`),
  "HEAD",
]);

const manifest = JSON.parse(readFileSync(".blueprint.json", "utf8")) as { apps: { dir: string }[] };
// Web apps build into dist/, Flutter web into build/web: other targets (store builds, installers) need signing keys and
// are produced by the stack's own release steps, see the stack README.
for (const app of manifest.apps) {
  for (const sub of ["dist", "build/web"]) {
    const dir = join(app.dir, sub);
    if (existsSync(dir)) {
      run("tar", ["-czf", join(out, `${app.dir.replaceAll("/", "-")}-${version}.tar.gz`), "-C", dir, "."]);
    }
  }
}

const sums = [...Deno.readDirSync(out)]
  .filter((e) => e.isFile && e.name.endsWith(".tar.gz"))
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((e) => `${createHash("sha256").update(readFileSync(join(out, e.name))).digest("hex")}  ${e.name}`);
writeFileSync(join(out, "SHA256SUMS.txt"), sums.join("\n") + "\n");
console.log(sums.join("\n"));
