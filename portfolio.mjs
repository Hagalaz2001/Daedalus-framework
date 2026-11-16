#!/usr/bin/env -S deno run -A
// Several web + mobile projects at once, each moving through its own PLAN.md.
//
//   deno run -A portfolio.mjs create portfolio.json     create every project listed (skips ones that exist)
//   deno run -A portfolio.mjs status [folder]           progress board for every project in the folder
//
// portfolio.json:
//   { "root": "./projects",
//     "projects": [ { "name": "shop", "id": "com.yourco.shop", "displayName": "Shop",
//                     "brief": "One paragraph: what it is, who uses the web and the app." } ] }
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { board } from "./plan-status.mjs";
import { buildReport } from "./report.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [command, arg] = process.argv.slice(2);

if (command === "create") create(arg);
else if (command === "status") status(arg);
else if (command === "report") report(arg);
else {
  console.error("Usage: deno run -A portfolio.mjs create portfolio.json | status [folder] | report [folder] [--developers 2] [--out file.html]");
  process.exit(1);
}

function create(file) {
  if (!file || !existsSync(file)) {
    console.error("Give the portfolio file: deno run -A portfolio.mjs create portfolio.json");
    process.exit(1);
  }
  const portfolio = JSON.parse(readFileSync(file, "utf8"));
  const root = resolve(portfolio.root);
  for (const p of portfolio.projects ?? []) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(p.name ?? "")) throw new Error(`Bad project name: ${p.name}`);
    const target = join(root, p.name);
    if (existsSync(target)) {
      console.log(`- ${p.name}: exists, skipped`);
      continue;
    }
    console.log(`\n=== ${p.name} ===`);
    const args = ["run", "-A", join(here, "new-project.ts"), target, "--yes"];
    for (const f of ["web", "mobile", "desktop", "backend", "ui", "modules"]) if (p[f]) args.push(`--${f}`, p[f]);
    if (p.id) args.push("--id", p.id);
    if (p.displayName) args.push("--name", p.displayName);
    const gitCfg = { ...(portfolio.git ?? {}), ...(p.git ?? {}) };
    if (gitCfg.name) args.push("--git-name", gitCfg.name);
    if (gitCfg.email) args.push("--git-email", gitCfg.email);
    if (p.remote) args.push("--remote", p.remote);
    execFileSync("deno", args, { stdio: "inherit" });
    if (p.brief) {
      const planFile = join(target, "PLAN.md");
      const plan = readFileSync(planFile, "utf8").replace(
        "<!-- One paragraph: what it is, who it is for, the one job it must do well. -->",
        p.brief.trim(),
      );
      writeFileSync(planFile, plan);
    }
  }
  console.log(`\nNext: open each folder in your AI coding agent and say "plan this project", then "keep going".`);
  status(root);
}

function status(folder) {
  console.log(`\n${board(resolve(folder ?? process.cwd()))}`);
}

function report(folder) {
  const root = resolve(folder ?? process.cwd());
  const opt = (n, d) => { const i = process.argv.indexOf("--" + n); return i >= 0 ? process.argv[i + 1] : d; };
  const out = resolve(opt("out", join(root, "portfolio-report.html")));
  writeFileSync(out, buildReport(root, { developers: Number(opt("developers", "1")), title: opt("title", "Projects") }));
  console.log("Dashboard: " + out);
}
