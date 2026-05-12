import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

function run(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd: cwd ?? process.cwd(), encoding: "utf-8", timeout: 30_000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch { return ""; }
}

export default function (pi: ExtensionAPI) {

  // Show governance status in footer
  pi.on("session_start", async (_event, ctx) => {
    const root = process.cwd();

    // Quick governance signal scan
    const signals: string[] = [];
    if (fs.existsSync(path.join(root, ".husky"))) signals.push("hooks");
    if (fs.existsSync(path.join(root, ".github/workflows"))) signals.push("CI");
    if (fs.existsSync(path.join(root, "docs/policies"))) signals.push("policies");

    const score = signals.length === 0 ? "ungoverned" : signals.join("+");
    ctx.ui.setStatus("policy-os", `⚖️ ${score}`);
  });

  // /policy-check command
  pi.registerCommand("policy-check", {
    description: "Quick Policy OS governance check on this project",
    handler: async (_args, ctx) => {
      const root = process.cwd();
      ctx.ui.setStatus("policy-os", "🔍 Checking…");

      const checks: Array<{ name: string; pass: boolean; detail: string }> = [];

      // 1. Pre-commit hooks
      const hasHusky = fs.existsSync(path.join(root, ".husky"));
      const hasLintStaged = fs.existsSync(path.join(root, ".lintstagedrc")) || fs.existsSync(path.join(root, "lint-staged.config.js"));
      checks.push({
        name: "Pre-commit hooks",
        pass: hasHusky || hasLintStaged,
        detail: hasHusky ? "Husky configured" : hasLintStaged ? "lint-staged configured" : "No pre-commit hooks found",
      });

      // 2. CI pipeline
      const hasGHA = fs.existsSync(path.join(root, ".github/workflows"));
      checks.push({
        name: "CI pipeline",
        pass: hasGHA,
        detail: hasGHA ? "GitHub Actions found" : "No CI configuration found",
      });

      // 3. Type checking
      const hasTsConfig = fs.existsSync(path.join(root, "tsconfig.json")) || fs.existsSync(path.join(root, "tsconfig.base.json"));
      checks.push({
        name: "TypeScript",
        pass: hasTsConfig,
        detail: hasTsConfig ? "TypeScript configured" : "No tsconfig found",
      });

      // 4. Agent context files
      const hasAgentsMd = fs.existsSync(path.join(root, "AGENTS.md")) || fs.existsSync(path.join(root, "CLAUDE.md"));
      checks.push({
        name: "Agent context",
        pass: hasAgentsMd,
        detail: hasAgentsMd ? "AGENTS.md or CLAUDE.md found" : "No agent context file",
      });

      // 5. Policy artifacts
      const hasPolicies = fs.existsSync(path.join(root, "docs/policies"));
      const policyCount = hasPolicies ? run("ls docs/policies/v1/*.md 2>/dev/null | wc -l", root).trim() : "0";
      checks.push({
        name: "Policy artifacts",
        pass: hasPolicies,
        detail: hasPolicies ? `${policyCount} versioned policies` : "No policy directory",
      });

      // 6. Tests
      const pkgJson = path.join(root, "package.json");
      let hasTest = false;
      if (fs.existsSync(pkgJson)) {
        try { hasTest = !!JSON.parse(fs.readFileSync(pkgJson, "utf-8")).scripts?.test; } catch {}
      }
      checks.push({
        name: "Test scripts",
        pass: hasTest,
        detail: hasTest ? "Root test script found" : "No test script in package.json",
      });

      // Build report
      const passed = checks.filter((c) => c.pass).length;
      const total = checks.length;
      const score = Math.round((passed / total) * 100);

      const lines = [
        `## Policy OS Governance Check`,
        ``,
        `**Score: ${score}/100** (${passed}/${total} checks passing)`,
        ``,
        ...checks.map((c) => `${c.pass ? "✅" : "❌"} **${c.name}**: ${c.detail}`),
        ``,
        `### Recommended Tier`,
        score >= 80 ? "→ **Policy OS Core** — strong governance foundation" :
        score >= 50 ? "→ **Policy OS Trial** — governance gaps to address" :
        "→ **MCP Audit** — needs governance foundation before Policy OS",
        ``,
        `Learn more: https://createsomething.agency`,
      ];

      ctx.ui.setStatus("policy-os", score >= 80 ? "✓ Governed" : `⚠️ ${score}/100`);
      pi.sendUserMessage(lines.join("\n"), { deliverAs: "followUp" });
    },
  });
}
