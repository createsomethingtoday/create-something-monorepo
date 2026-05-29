#!/usr/bin/env bash
# Create Linear issues for Pi first-class work tracking
#
# Prerequisites:
#   export LINEAR_API_KEY=...
#
# Usage:
#   bash scripts/pi-linear-issues.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${LINEAR_API_KEY:-}" ]]; then
  echo "❌ LINEAR_API_KEY not set"
  exit 1
fi

echo "=== Creating Linear issues for Pi first-class work ==="
echo ""

# 1. npm publish
pnpm -s linear:create -- \
  --title "Publish Pi packages to npm" \
  --description "Publish @create-something/pi-three-tier-framework and @create-something/pi-policy-os to npm.

Steps:
1. npm login --scope=@create-something
2. bash scripts/pi-publish.sh --dry-run
3. bash scripts/pi-publish.sh
4. Verify: pi install npm:@create-something/pi-three-tier-framework

Evidence: npm package URLs" \
  --label feature
echo ""

# 2. Deploy paper
pnpm -s linear:create -- \
  --title "Deploy Policy OS Development Infrastructure paper" \
  --description "Deploy the paper at packages/io/src/routes/papers/policy-os-development-infrastructure/ to createsomething.io.

Pre-existing spritz build issue must be resolved first, or deploy with the paper route only.

Steps:
1. Fix spritz package resolution (or exclude from build)
2. pnpm --filter=io build
3. Deploy to Cloudflare Pages
4. Verify: https://createsomething.io/papers/policy-os-development-infrastructure

Evidence: Live URL" \
  --label feature
echo ""

# 3. Agent Harness Config service
pnpm -s linear:create -- \
  --title "Define Agent Harness Config service pricing and landing page" \
  --description "New service tier between MCP-only and Policy OS (docs/AGENT_HARNESS_CONFIG_SERVICE.md).

Steps:
1. Price the setup engagement
2. Add to .agency landing page
3. Update funnel routing in FUNNEL_AND_DISCOVERY_STRATEGY
4. Identify first external client (construction vertical for WORKWAY?)

Evidence: Landing page section live, pricing documented" \
  --label feature
echo ""

# 4. Paper measurement data
pnpm -s linear:create -- \
  --title "Collect Policy OS paper measurement data" \
  --description "After a few Pi sessions, populate Section 6 of the paper with real data:
- Quality gate fire rate per session
- False positive rate
- Self-correction success rate
- Time from /linear claim to /done per issue type
- Canon compliance trend

Evidence: Data added to paper, route redeployed" \
  --label research
echo ""

# 5. Conference demo prep
pnpm -s linear:create -- \
  --title "Prepare Three-Tier Framework Pi package conference demo" \
  --description "Build a 5-minute demo flow for agent/AI meetups:
1. pi install npm:@create-something/pi-three-tier-framework
2. Open any codebase
3. /classify <component> — show tier classification
4. /debug-tier <failure> — show causality heuristic
5. /mcp-design <server> — show MCP design template

Prep: recorded demo, slide noting install command, QR to npm package.

Evidence: Demo script documented, test run recorded" \
  --label feature
echo ""

echo "=== Done — 5 issues created ==="
