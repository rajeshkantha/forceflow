/**
 * Applies branch protection to the main branch of a GitHub repository.
 *
 * Required environment variables:
 *   GITHUB_TOKEN  — personal access token or fine-grained PAT with repo admin rights
 *   GITHUB_OWNER  — GitHub username or org name (e.g. "acme-corp")
 *   GITHUB_REPO   — repository name (e.g. "forceflow")
 *
 * Usage:
 *   GITHUB_OWNER=acme-corp GITHUB_REPO=forceflow pnpm --filter @workspace/scripts run protect-branch
 */

export {};

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH ?? "main";

if (!token) {
  console.error("ERROR: GITHUB_TOKEN is not set.");
  process.exit(1);
}
if (!owner) {
  console.error("ERROR: GITHUB_OWNER is not set.");
  process.exit(1);
}
if (!repo) {
  console.error("ERROR: GITHUB_REPO is not set.");
  process.exit(1);
}

const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`;

const body = {
  required_status_checks: null,
  enforce_admins: true,
  required_pull_request_reviews: {
    dismissal_restrictions: {},
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 1,
  },
  restrictions: null,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: false,
  lock_branch: false,
  allow_fork_syncing: false,
};

console.log(`Applying branch protection to ${owner}/${repo}:${branch} ...`);

const response = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`ERROR: GitHub API returned ${response.status} ${response.statusText}`);
  console.error(text);
  process.exit(1);
}

const data = (await response.json()) as { url: string };
console.log("Branch protection applied successfully.");
console.log(`Protected URL: ${data.url}`);
console.log();
console.log("Rules in effect:");
console.log("  - Require at least 1 approving review before merging");
console.log("  - Dismiss stale reviews when new commits are pushed");
console.log("  - Enforce rules for administrators");
console.log("  - Force-pushes to this branch are blocked");
console.log("  - Branch deletion is blocked");
