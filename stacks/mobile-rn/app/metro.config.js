// Deno installs into a pnpm-style node_modules (symlinks into node_modules/.deno) at the workspace root.
// Metro must watch that root and look for packages in both node_modules folders, or `@app/api` and the
// symlinked packages cannot be resolved.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
let workspaceRoot = projectRoot;
for (let dir = projectRoot; dir !== path.dirname(dir); dir = path.dirname(dir)) {
  if (fs.existsSync(path.join(dir, "deno.json")) && fs.existsSync(path.join(dir, "contracts"))) {
    workspaceRoot = dir;
    break;
  }
}

// Under Deno on Windows, require.resolve() returns paths with mixed slashes, and Expo CLI stores one in Metro defaults
// (moduleSystem); Metro then cannot find it in its file map. Normalise the path whenever it is assigned.
if (process.platform === "win32") {
  const defaults = require(require.resolve("@expo/metro/metro-config/defaults/defaults", {
    paths: [path.dirname(require.resolve("expo/package.json"))],
  }));
  let moduleSystem = defaults.moduleSystem;
  Object.defineProperty(defaults, "moduleSystem", {
    configurable: true,
    enumerable: true,
    get: () => moduleSystem,
    set: (value) => (moduleSystem = path.normalize(value)),
  });
}

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [path.join(projectRoot, "node_modules"), path.join(workspaceRoot, "node_modules")];
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs", "cjs"];

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
