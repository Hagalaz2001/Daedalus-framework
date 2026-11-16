// Type-checks .ts and .vue files with vue-tsc. Under Deno the `typescript` peer of vue-tsc resolves to the workspace's
// TypeScript 7, which vue-tsc cannot use yet, so this runs vue-tsc against the pinned TypeScript 5.9 (dependency "typescript5").
// Drop this wrapper (use plain `vue-tsc --noEmit`) once vue-tsc supports the native TypeScript compiler.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("vue-tsc").run(require.resolve("typescript5/lib/tsc"));
