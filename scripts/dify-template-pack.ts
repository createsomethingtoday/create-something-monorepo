#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

type TemplateEntry = {
  id: string;
  title: string;
  dify_app_type: 'chatflow' | 'workflow' | 'agent';
  recommended_dify_base_template: string;
  dsl_path: string;
  primary_audience: string;
  client_value: string;
  required_mcp_servers: string[];
  write_policy: 'none' | 'requires_explicit_confirmation' | 'disabled';
  eval_checks: string[];
};

type TemplatePack = {
  version: number;
  pack_id: string;
  tracker?: string;
  status: string;
  purpose: string;
  templates: TemplateEntry[];
};

type DifyDsl = {
  app?: {
    name?: string;
    mode?: string;
  };
  kind?: string;
  model_config?: {
    pre_prompt?: string;
    agent_mode?: {
      enabled?: boolean;
      tools?: unknown[];
    };
  };
  version?: string;
};

const ROOT = process.cwd();
const PACK_PATH = resolve(ROOT, 'config/dify-templates/policy-os-template-pack.json');

const command = (process.argv[2] ?? 'check').trim().toLowerCase();

if (!['check', 'validate'].includes(command)) {
  console.error('Usage: tsx scripts/dify-template-pack.ts [check|validate]');
  process.exit(2);
}

const errors = validateTemplatePack();

if (errors.length > 0) {
  console.error('Dify template pack validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Dify template pack check passed.');

function validateTemplatePack(): string[] {
  const errors: string[] = [];

  if (!existsSync(PACK_PATH)) {
    return [`missing ${relativeToRoot(PACK_PATH)}`];
  }

  const pack = readJson<TemplatePack>(PACK_PATH, errors);
  if (!pack) return errors;

  if (pack.version !== 1) errors.push('pack version must be 1');
  if (pack.pack_id !== 'policy-os-template-pack') {
    errors.push('pack_id must be policy-os-template-pack');
  }
  if (!pack.purpose) errors.push('purpose is required');
  if (!Array.isArray(pack.templates) || pack.templates.length === 0) {
    errors.push('templates must be a non-empty array');
    return errors;
  }

  const ids = new Set<string>();
  for (const template of pack.templates) {
    validateTemplateEntry(template, ids, errors);
  }

  return errors;
}

function validateTemplateEntry(template: TemplateEntry, ids: Set<string>, errors: string[]): void {
  const context = template?.id ? `template ${template.id}` : 'template <missing id>';

  if (!template?.id) errors.push(`${context}: id is required`);
  if (template?.id && ids.has(template.id)) errors.push(`${context}: duplicate id`);
  if (template?.id) ids.add(template.id);
  if (!template?.title) errors.push(`${context}: title is required`);
  if (!['chatflow', 'workflow', 'agent'].includes(template?.dify_app_type)) {
    errors.push(`${context}: dify_app_type must be chatflow, workflow, or agent`);
  }
  if (!template?.recommended_dify_base_template) {
    errors.push(`${context}: recommended_dify_base_template is required`);
  }
  if (!template?.client_value) errors.push(`${context}: client_value is required`);
  if (!Array.isArray(template?.required_mcp_servers) || template.required_mcp_servers.length === 0) {
    errors.push(`${context}: required_mcp_servers must be non-empty`);
  }
  if (!['none', 'requires_explicit_confirmation', 'disabled'].includes(template?.write_policy)) {
    errors.push(`${context}: write_policy is invalid`);
  }
  if (!Array.isArray(template?.eval_checks) || !template.eval_checks.includes('api_health')) {
    errors.push(`${context}: eval_checks must include api_health`);
  }
  if (!template?.dsl_path) {
    errors.push(`${context}: dsl_path is required`);
    return;
  }

  const dslAbsolutePath = resolve(ROOT, template.dsl_path);
  if (!existsSync(dslAbsolutePath)) {
    errors.push(`${context}: missing DSL ${template.dsl_path}`);
    return;
  }

  const rawDsl = readFileSync(dslAbsolutePath, 'utf8');
  validateNoSecretLikeValues(context, rawDsl, errors);

  let dsl: DifyDsl | undefined;
  try {
    dsl = parseYaml(rawDsl) as DifyDsl;
  } catch (error) {
    errors.push(`${context}: DSL YAML parse failed: ${String(error)}`);
    return;
  }

  if (dsl?.kind !== 'app') errors.push(`${context}: DSL kind must be app`);
  if (!dsl?.version) errors.push(`${context}: DSL version is required`);
  if (!dsl?.app?.name) errors.push(`${context}: DSL app.name is required`);
  if (dsl?.app?.mode !== 'agent-chat') {
    errors.push(`${context}: starter DSL app.mode must be agent-chat`);
  }
  if (!dsl?.model_config?.pre_prompt?.trim()) {
    errors.push(`${context}: DSL model_config.pre_prompt is required`);
  }
  if (!dsl?.model_config?.agent_mode?.enabled) {
    errors.push(`${context}: DSL agent_mode.enabled must be true`);
  }
}

function validateNoSecretLikeValues(context: string, content: string, errors: string[]): void {
  const patterns: Array<[RegExp, string]> = [
    [/\bapp-[A-Za-z0-9_-]{10,}\b/, 'Dify app API key'],
    [/\bsk-[A-Za-z0-9_-]{10,}\b/, 'OpenAI-style API key'],
    [/\bntn_[A-Za-z0-9_-]{10,}\b/, 'Notion token'],
    [/\bsecret_[A-Za-z0-9_-]{10,}\b/, 'Notion legacy token'],
    [/\b[A-Z0-9_]*(?:API_KEY|TOKEN)=\S+/g, 'environment-style secret assignment']
  ];

  for (const [pattern, label] of patterns) {
    if (pattern.test(content)) {
      errors.push(`${context}: possible ${label} found in DSL`);
    }
  }
}

function readJson<T>(path: string, errors: string[]): T | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (error) {
    errors.push(`${relativeToRoot(path)} is not valid JSON: ${String(error)}`);
    return undefined;
  }
}

function relativeToRoot(path: string): string {
  return path.replace(`${ROOT}/`, '');
}
