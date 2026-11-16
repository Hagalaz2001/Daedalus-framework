// Writes a CycloneDX SBOM with syft (Apache-2.0, external binary: https://github.com/anchore/syft).
// `deno task sbom` -> sbom.cdx.json. Without syft installed this fails with install instructions; it never fakes an SBOM.
const out = Deno.args[0] ?? "sbom.cdx.json";
try {
  const r = await new Deno.Command("syft", {
    args: ["dir:.", "-o", `cyclonedx-json=${out}`],
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  Deno.exit(r.code);
} catch {
  console.error(
    "syft not found. Install it (https://github.com/anchore/syft#installation), then run `deno task sbom` again.",
  );
  Deno.exit(1);
}
