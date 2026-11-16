// The one place a deploy target is wired in. `deno run -A scripts/ci/deploy.ts <staging|production>`, called by
// .github/workflows/deploy.yml (and the deploy jobs in .gitlab-ci.yml) after the checks passed and, for production,
// after a reviewer approved. Until you replace the body below it fails on purpose: a deploy that silently does nothing
// would be worse. See docs/DEVSECOPS.md, "Adding a deploy target", for filled-in examples (Fly.io, Render, SSH + Compose).
//
// Rules for what you add: read secrets only from environment variables the workflow passes in, never print them,
// deploy the image by digest or release tag (not "latest"), and finish by calling the environment's /ready endpoint.
const env = Deno.args[0];
if (env !== "staging" && env !== "production") {
  console.error("Usage: deploy.ts <staging|production>");
  Deno.exit(2);
}
console.error(
  `No deploy target is configured for ${env}. Edit scripts/ci/deploy.ts (docs/DEVSECOPS.md, "Adding a deploy target").`,
);
Deno.exit(1);
