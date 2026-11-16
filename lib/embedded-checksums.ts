/**
 * SHA-256 of `daedalus-assets-v<version>.tar.gz`, keyed by version. Empty in a checkout: `tools/build-release.ts assets
 * --embed` fills it during a release build, before the binaries are compiled and the package is published. The tarball
 * itself excludes this file, so the hash it carries does not depend on itself.
 */
export const EMBEDDED_SHA256: Record<string, string> = {};
