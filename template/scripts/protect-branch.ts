// PRINTS the commands that switch on branch protection, environment protection and the free security features of your
// repository host. It changes nothing itself: read them, then paste them into a terminal where `gh` (GitHub) or `glab`
// (GitLab) is signed in as a repository admin.
//   deno task protect-branch                  host detected from the git remote
//   deno task protect-branch --host gitlab    github | gitlab
//   deno task protect-branch --branch main --approvals 1
// The same settings as clickable steps are in docs/DEVSECOPS.md ("Branch protection checklist").
import { runArgs } from "./lib/exec.ts";

export function githubCommands(branch: string, approvals: number): string {
  return `# 1. Protect ${branch}: pull request + passing "required" check (the last job of ci.yml) + code owner review
gh api -X PUT "repos/{owner}/{repo}/branches/${branch}/protection" --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["required"] },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": ${approvals},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON

# 2. Free security features: secret scanning with push protection, Dependabot alerts and security updates,
#    private vulnerability reporting (the contact path in SECURITY.md)
gh api -X PATCH "repos/{owner}/{repo}" --input - <<'JSON'
{ "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" } } }
JSON
gh api -X PUT "repos/{owner}/{repo}/vulnerability-alerts"
gh api -X PUT "repos/{owner}/{repo}/automated-security-fixes"
gh api -X PUT "repos/{owner}/{repo}/private-vulnerability-reporting"

# 3. Environments. Production waits for a named reviewer; find a user id with: gh api users/<login> --jq .id
gh api -X PUT "repos/{owner}/{repo}/environments/staging" --input - <<'JSON'
{ "deployment_branch_policy": { "protected_branches": true, "custom_branch_policies": false } }
JSON
gh api -X PUT "repos/{owner}/{repo}/environments/production" --input - <<'JSON'
{
  "reviewers": [{ "type": "User", "id": 0 }],
  "prevent_self_review": true,
  "deployment_branch_policy": null
}
JSON
# Replace "id": 0 above with the reviewer's id BEFORE running it. Then add each environment's secrets in
# Settings > Environments (see docs/DEVSECOPS.md), and only then turn deployment on:
#   gh variable set DEPLOY_ENABLED --body true
`;
}

export function gitlabCommands(branch: string, approvals: number): string {
  return `# 1. Replace the default protection of ${branch}: nobody pushes directly, maintainers merge, code owners approve
glab api -X DELETE "projects/:id/protected_branches/${branch}"
glab api -X POST "projects/:id/protected_branches" -f name=${branch} -f push_access_level=0 -f merge_access_level=40 -f allow_force_push=false -f code_owner_approval_required=true

# 2. Merge requests need a passing pipeline and resolved discussions; the source branch is deleted after merging
glab api -X PUT "projects/:id" -f only_allow_merge_if_pipeline_succeeds=true -f only_allow_merge_if_all_discussions_are_resolved=true -f remove_source_branch_after_merge=true -f merge_method=ff

# 3. Approvals: at least ${approvals} (Settings > Merge requests > Merge request approvals; a project-level rule needs Premium,
#    on the free tier use code owners in CODEOWNERS plus the pipeline gate above)

# 4. Protected environments: production deploys only for maintainers
glab api -X POST "projects/:id/protected_environments" -f name=production -f "deploy_access_levels[][access_level]=40" -f "required_approval_count=1"
# (protected environments with required approvals are a Premium feature; without it the production job is still a manual
#  job that only maintainers can start)

# 5. Turn deployment on only after the secrets exist: Settings > CI/CD > Variables > DEPLOY_ENABLED = true
`;
}

if (import.meta.main) {
  const args = Deno.args;
  const flag = (n: string) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
  const branch = flag("branch") ?? "main";
  const approvals = Number(flag("approvals") ?? "1");
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || !Number.isInteger(approvals) || approvals < 0 || approvals > 6) {
    console.error("Usage: deno task protect-branch [--host github|gitlab] [--branch main] [--approvals 1]");
    Deno.exit(2);
  }
  let host = flag("host");
  if (!host) {
    const r = runArgs("git", ["remote", "get-url", "origin"], { capture: true });
    host = r.ok && /gitlab/i.test(r.stdout) ? "gitlab" : "github";
  }
  if (host !== "github" && host !== "gitlab") {
    console.error("--host must be github or gitlab");
    Deno.exit(2);
  }
  console.log(`# Commands for ${host}. Nothing has been changed yet: review, then run them yourself.\n`);
  console.log(host === "github" ? githubCommands(branch, approvals) : gitlabCommands(branch, approvals));
}
