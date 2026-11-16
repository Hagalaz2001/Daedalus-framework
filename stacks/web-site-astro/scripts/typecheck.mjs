// Type-checks .astro, .ts and framework files. `astro check` loads whatever `typescript` resolves to, which under Deno is
// the workspace's TypeScript 7 (it has no programmatic API yet), so this points every `require("typescript")` at the
// pinned TypeScript 5.9 (dependency "typescript5") before running the same checker.
// Replace it with plain `astro check` once Astro supports the native compiler.
import Module, { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts5 = require.resolve("typescript5");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolve.call(this, request === "typescript" ? ts5 : request, ...rest);
};

const fromCheck = createRequire(require.resolve("@astrojs/check"));
const { AstroCheck } = fromCheck("@astrojs/language-server");
const checker = new AstroCheck(process.cwd(), ts5);
const result = await checker.lint({ logErrors: { level: "warning" } });
console.log(`Result (${result.fileChecked} files): ${result.errors} errors, ${result.warnings} warnings, ${result.hints} hints`);
process.exit(result.errors > 0 ? 1 : 0);
