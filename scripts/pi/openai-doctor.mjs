#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const projectSettingsPath = resolve(repoRoot, ".pi/settings.json");
const agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
const laneSessionDir = resolve(repoRoot, ".pi/sessions");
const authPath = join(agentDir, "auth.json");
const jsonMode = process.argv.includes("--json");

function readJson(path) {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8"));
}

function runPiVersion() {
  const result = spawnSync("pi", ["--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      error: (result.stderr || result.stdout || "pi --version failed").trim(),
    };
  }

  return { ok: true, version: (result.stdout || "").trim() };
}

function main() {
  const projectSettings = readJson(projectSettingsPath);
  const auth = readJson(authPath) || {};
  const piVersion = runPiVersion();

  const hasProjectSettings = !!projectSettings;
  const defaultProvider = projectSettings?.defaultProvider;
  const hasOpenAIApiKeyEnv = !!process.env.OPENAI_API_KEY;
  const hasOpenAIAuthFile = auth?.openai?.type === "api_key";
  const hasOpenAICodexOAuth = auth?.["openai-codex"]?.type === "oauth";
  const authMode = hasOpenAIApiKeyEnv
    ? "env:OPENAI_API_KEY"
    : hasOpenAIAuthFile
      ? "auth.json:openai"
      : hasOpenAICodexOAuth
        ? "auth.json:openai-codex"
        : null;

  const checks = {
    pi_installed: piVersion.ok,
    project_settings_present: hasProjectSettings,
    project_default_provider_openai: defaultProvider === "openai",
    openai_auth_available: authMode !== null,
  };

  const ok = Object.values(checks).every(Boolean);

  const payload = {
    ok,
    checks,
    pi: piVersion,
    projectSettingsPath,
    authPath,
    laneSessionDir,
    authMode,
    guidance: [
      "Install Pi: npm install -g @mariozechner/pi-coding-agent",
      "API key path: export OPENAI_API_KEY=sk-...",
      "Subscription path: run pi, then /login, then select OpenAI Codex",
      `Lane helper interactive sessions default to: ${laneSessionDir}`,
      "Verify: pnpm pi:doctor",
    ],
  };

  if (jsonMode) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(ok ? 0 : 1);
  }

  console.log("Pi OpenAI Doctor");
  console.log("");
  console.log(`pi installed: ${checks.pi_installed ? `yes (${piVersion.version})` : `no${piVersion.error ? ` - ${piVersion.error}` : ""}`}`);
  console.log(`project settings: ${checks.project_settings_present ? `yes (${projectSettingsPath})` : `no (${projectSettingsPath})`}`);
  console.log(`default provider: ${defaultProvider || "unset"}`);
  console.log(`OpenAI auth: ${authMode || "missing"}`);
  console.log(`lane session dir: ${laneSessionDir}`);
  console.log("");

  if (!ok) {
    console.log("Next steps:");
    if (!checks.pi_installed) {
      console.log("- Install Pi: npm install -g @mariozechner/pi-coding-agent");
    }
    if (!checks.project_settings_present || !checks.project_default_provider_openai) {
      console.log(`- Confirm ${projectSettingsPath} exists and sets defaultProvider to \"openai\".`);
    }
    if (!checks.openai_auth_available) {
      console.log("- API key path: export OPENAI_API_KEY=sk-...");
      console.log("- Subscription path: run pi, then /login, then select OpenAI Codex.");
    }
    process.exit(1);
  }

  console.log("OpenAI-backed Pi is ready for this repo.");
}

main();
