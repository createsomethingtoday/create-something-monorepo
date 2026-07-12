#!/usr/bin/env tsx
/**
 * Send Outerfields Hub onboarding email.
 *
 * This is a one-off operational email, not a reusable product lifecycle template.
 * It uses direct HTML/text sending so copy can stay readable and not fight template
 * variable limits.
 *
 * Usage:
 *   pnpm tsx packages/agency/clients/outerfields/scripts/send-hub-onboarding-email.ts \
 *     --to micah@createsomething.io \
 *     --aaron-token mlk_... \
 *     --andre-token mlk_... \
 *     --draft
 *
 * Optional environment overrides for live sends:
 *   AARON_OUTERFIELDS_PERSONAL_TOKEN=...
 *   ANDRE_OUTERFIELDS_PERSONAL_TOKEN=...
 *
 * Backward-compatible fallback:
 *   CS_HUB_AARON_OUTERFIELDS_API_TOKEN=...
 *   CS_HUB_ANDRE_OUTERFIELDS_API_TOKEN=...
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { escapeHtml } from '../src/lib/email/layout';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !process.env[key.trim()]) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'Micah Johnson <micah@createsomething.io>';

const AARON_URL = 'https://aaron-outerfields.mcp.createsomething.agency/mcp';
const ANDRE_URL = 'https://andre-outerfields.mcp.createsomething.agency/mcp';

const WALKTHROUGH_URL = 'https://share.descript.com/view/GQzi5ETGHey';
const CLAUDE_DOCS_URL =
  'https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities';
const CODEX_DOCS_URL = 'https://developers.openai.com/codex/mcp';
const SUPPORT_URL = 'https://createsomething.agency/book';
const HALFDOZEN_EMAIL = 'dm@halfdozen.co';

const REDACTED_PLACEHOLDER = '[bearer token will be inserted for live send]';

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function readListArg(flag: string): string[] {
  const raw = readArg(flag);
  if (!raw) return [];
  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function boolArg(flag: string): boolean {
  return process.argv.includes(flag);
}

function maskToken(value: string): string {
  if (value === REDACTED_PLACEHOLDER) return value;
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function resolveDeliveryToken(argsFlag: string, preferredEnvName: string, legacySecretName: string): string {
  const fromArg = readArg(argsFlag)?.trim();
  if (fromArg) return fromArg;

  const fromPreferredEnv = process.env[preferredEnvName]?.trim();
  if (fromPreferredEnv) return fromPreferredEnv;

  const fromLegacyEnv = process.env[legacySecretName]?.trim();
  if (fromLegacyEnv) return fromLegacyEnv;

  return REDACTED_PLACEHOLDER;
}

function renderAccessCard(label: string, url: string, token: string): string {
  return `
  <div style="margin: 0 0 16px 0; padding: 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03);">
    <p style="margin: 0 0 10px 0; color: #ffffff; font-weight: 600;">${escapeHtml(label)}</p>
    <p style="margin: 0 0 6px 0; color: rgba(255,255,255,0.7); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">MCP URL</p>
    <p style="margin: 0 0 12px 0; color: #ffffff; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; word-break: break-all;">${escapeHtml(
      url
    )}</p>
    <p style="margin: 0 0 6px 0; color: rgba(255,255,255,0.7); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Personal Bearer Token</p>
    <p style="margin: 0; color: #ffffff; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; word-break: break-all;">${escapeHtml(
      token
    )}</p>
  </div>`;
}

function sectionDivider(): string {
  return '<div style="height: 1px; background-color: rgba(255, 255, 255, 0.1); margin: 24px 0;"></div>';
}

function renderBulletRows(items: string[]): string {
  const rows = items
    .map(
      item => `<tr>
  <td valign="top" style="width: 18px; color: #ffffff; font-size: 16px; line-height: 1.55; padding: 0 8px 8px 0;">•</td>
  <td valign="top" style="color: rgba(255,255,255,0.82); font-size: 16px; line-height: 1.55; padding: 0 0 8px 0;">${item}</td>
</tr>`
    )
    .join('');

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin: 0;">${rows}</table>`;
}

function renderNumberedRows(items: string[]): string {
  const rows = items
    .map(
      (item, index) => `<tr>
  <td valign="top" style="width: 22px; color: #ffffff; font-size: 15px; line-height: 1.55; padding: 0 8px 10px 0; font-weight: 700;">${index + 1}.</td>
  <td valign="top" style="color: rgba(255,255,255,0.82); font-size: 16px; line-height: 1.55; padding: 0 0 10px 0;">${item}</td>
</tr>`
    )
    .join('');

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin: 0;">${rows}</table>`;
}

function buildEmailHtml(isDraft: boolean, aaronToken: string, andreToken: string): string {
  const draftNotice = isDraft
    ? `<div style="background: rgba(150, 110, 68, 0.15); border: 1px solid rgba(150, 110, 68, 0.45); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <p style="margin: 0; color: rgba(255,255,255,0.9);">
          Draft for review. If a bearer token is redacted here, it will be swapped with the live value before delivery.
        </p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OUTERFIELDS MCP access is ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #ffffff; background-color: #000000; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 24px; font-weight: bold; color: #ffffff; margin-bottom: 10px;">CREATE SOMETHING</div>
      <p style="color: rgba(255, 255, 255, 0.6); margin: 0; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase;">MCP Onboarding</p>
    </div>

    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.1);">
      <h1 style="color: #ffffff; font-size: 26px; margin-top: 0; margin-bottom: 16px;">Your OUTERFIELDS MCP access is ready</h1>

${draftNotice}
      <p style="font-size: 16px; margin: 0 0 18px 0; color: rgba(255,255,255,0.82);">Hi Aaron,</p>

      <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.82);">Your private OUTERFIELDS MCP access is ready.</p>
      <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.82);">CREATE SOMETHING .agency is providing the MCP layer for your team. In plain English: we host the secure bridge between your tools and the AI app you want to use.</p>
      <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.82);">MCP stands for Model Context Protocol. The simple version is: it lets your AI app securely use the right tools.</p>
      <p style="margin: 0 0 6px 0; color: rgba(255,255,255,0.82);">You do not need to learn a new system first. Pick the AI host you already like, connect your MCP, and the AI can work with the approved tools behind it.</p>

      ${sectionDivider()}

      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">What an MCP does</h2>
      ${renderBulletRows([
        '<strong style="color:#ffffff;">It connects an AI app to real tools.</strong> That means less copy-and-paste between tabs.',
        '<strong style="color:#ffffff;">It keeps access scoped.</strong> Each person gets their own private hub and personal bearer token.',
        '<strong style="color:#ffffff;">It works with the host you prefer.</strong> Codex, Claude Desktop, or another host that supports remote MCP servers.'
      ])}

      ${sectionDivider()}

      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">What we are delivering now</h2>
      ${renderBulletRows([
        '<strong style="color:#ffffff;">Private MCP access for Aaron and Andre.</strong> Each of you has your own hub URL and personal bearer token.',
        '<strong style="color:#ffffff;">The hosted tooling layer.</strong> We manage the MCP setup, reliability, and updates on our side.',
        '<strong style="color:#ffffff;">Shared tool support.</strong> Your hubs are set up for workflows across OUTERFIELDS tools and connected services like ClickUp, Google Workspace, Slack, Dropbox, and more. We can finish any remaining account connections with you during onboarding.',
        '<strong style="color:#ffffff;">Onboarding support.</strong> If you want help live, we can walk through setup together.'
      ])}

      ${sectionDivider()}

      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">Your setup details</h2>
      <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.82);">I&apos;m including both access blocks below so your team has them in one place.</p>
      ${renderAccessCard('Aaron', AARON_URL, aaronToken)}
      ${renderAccessCard('Andre', ANDRE_URL, andreToken)}
      <p style="margin-top: 12px; color: rgba(255,255,255,0.68); font-size: 14px;">Keep the personal bearer tokens private. If one is ever shared in the wrong place, reply and we will rotate it.</p>

      ${sectionDivider()}

      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">How to connect it</h2>
      ${renderNumberedRows([
        '<strong style="color:#ffffff;">Pick one AI host.</strong> Start with Codex, Claude Desktop, or another host you already feel comfortable using.',
        '<strong style="color:#ffffff;">Add your MCP server.</strong> Paste in your MCP URL and label it something simple like "Outerfields."',
        '<strong style="color:#ffffff;">Authenticate.</strong> When the app asks for authorization, use your personal bearer token.',
        '<strong style="color:#ffffff;">Test it.</strong> A good first prompt is: "What tools do you have access to in this Outerfields MCP?"'
      ])}

      ${sectionDivider()}

      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">Guides and support</h2>
      ${renderBulletRows([
        `<strong style="color:#ffffff;">Walkthrough video:</strong> <a href="${WALKTHROUGH_URL}" style="color:#ffffff;">${WALKTHROUGH_URL}</a>`,
        `<strong style="color:#ffffff;">Claude Desktop setup:</strong> <a href="${CLAUDE_DOCS_URL}" style="color:#ffffff;">official guide</a>`,
        `<strong style="color:#ffffff;">Codex setup:</strong> <a href="${CODEX_DOCS_URL}" style="color:#ffffff;">official guide</a>`,
        `<strong style="color:#ffffff;">Live help:</strong> <a href="${SUPPORT_URL}" style="color:#ffffff;">book a support session</a>`
      ])}

      ${sectionDivider()}

      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 12px 0;">What comes next</h2>
      <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.82);">What you are receiving now is the MCP tooling layer from CREATE SOMETHING .agency. This gives your team a clean, private way to connect AI to the tools you already use.</p>
      <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.82);">When you are ready for the bigger system build, that is the next layer. If you want client management, team workflows, and reporting in one central place, Danny and our team at Half Dozen can help design and build that unified system.</p>
      <p style="margin: 0 0 4px 0; color: rgba(255,255,255,0.82);">You can reach Half Dozen directly at <a href="mailto:${HALFDOZEN_EMAIL}" style="color:#ffffff;">${HALFDOZEN_EMAIL}</a>.</p>

      ${sectionDivider()}

      <p style="margin: 0 0 14px 0; color: rgba(255,255,255,0.82);">Reply here if you want us to walk through setup together.</p>
      <div style="text-align: center; margin-top: 16px;">
        <a href="${SUPPORT_URL}" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600;">Book support</a>
      </div>

      <p style="margin: 20px 0 0 0; color: rgba(255,255,255,0.64); font-size: 14px;">Nicely said version: start with one host, connect one MCP, and try one real workflow. That is enough to get moving.</p>
    </div>

    <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
      <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0;"><strong>CREATE SOMETHING .agency</strong></p>
      <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; margin-top: 8px;">Hosted MCP tooling now. Unified system build when you are ready.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildEmailText(aaronToken: string, andreToken: string): string {
  return `Hi Aaron,

Your private OUTERFIELDS MCP access is ready.

CREATE SOMETHING .agency is providing the MCP layer for your team. In plain English: we host the secure bridge between your tools and the AI app you want to use.
MCP stands for Model Context Protocol. The simple version is: it lets your AI app securely use the right tools.

WHAT AN MCP DOES
----------------
- It connects an AI app to real tools.
- It keeps access scoped to the right person.
- It works with the host you prefer, as long as that host supports remote MCP servers.

WHAT WE ARE DELIVERING NOW
--------------------------
- Private MCP access for Aaron and Andre
- The hosted tooling layer, managed by CREATE SOMETHING
- Shared tool support for OUTERFIELDS workflows and connected services like ClickUp, Google Workspace, Slack, Dropbox, and more
- Onboarding support if you want help live

YOUR SETUP DETAILS
------------------
Aaron
MCP URL: ${AARON_URL}
Personal Bearer Token: ${aaronToken}

Andre
MCP URL: ${ANDRE_URL}
Personal Bearer Token: ${andreToken}

Keep the personal bearer tokens private. If one is ever shared in the wrong place, reply and we will rotate it.

HOW TO CONNECT IT
-----------------
1. Pick one AI host: Codex, Claude Desktop, or another host you already like.
2. Add your MCP server and paste your MCP URL.
3. When the app asks for authorization, use your personal bearer token.
4. Test it with a simple prompt like: "What tools do you have access to in this Outerfields MCP?"

GUIDES AND SUPPORT
------------------
Walkthrough video: ${WALKTHROUGH_URL}
Claude Desktop setup: ${CLAUDE_DOCS_URL}
Codex setup: ${CODEX_DOCS_URL}
Live help: ${SUPPORT_URL}

WHAT COMES NEXT
---------------
What you are receiving now is the MCP tooling layer from CREATE SOMETHING .agency.

When you are ready for the bigger system build, that is the next layer. If you want client management, team workflows, and reporting in one central place, Danny and our team at Half Dozen can help design and build that unified system.

Half Dozen: ${HALFDOZEN_EMAIL}

Reply here if you want us to walk through setup together.

Nicely said version: start with one host, connect one MCP, and try one real workflow. That is enough to get moving.

— Micah
`;
}

async function sendEmail(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY in environment');
  }

  const to = readArg('--to') ?? 'micah@createsomething.io';
  const cc = readListArg('--cc');
  const draft = boolArg('--draft');

  const aaronToken = resolveDeliveryToken(
    '--aaron-token',
    'AARON_OUTERFIELDS_PERSONAL_TOKEN',
    'CS_HUB_AARON_OUTERFIELDS_API_TOKEN'
  );
  const andreToken = resolveDeliveryToken(
    '--andre-token',
    'ANDRE_OUTERFIELDS_PERSONAL_TOKEN',
    'CS_HUB_ANDRE_OUTERFIELDS_API_TOKEN'
  );

  const subject = draft
    ? '[DRAFT v6] Your OUTERFIELDS MCP access is ready'
    : 'Your OUTERFIELDS MCP access is ready';

  const html = buildEmailHtml(draft, aaronToken, andreToken);
  const text = buildEmailText(
    aaronToken === REDACTED_PLACEHOLDER ? REDACTED_PLACEHOLDER : maskToken(aaronToken),
    andreToken === REDACTED_PLACEHOLDER ? REDACTED_PLACEHOLDER : maskToken(andreToken)
  );

  console.log(`📤 Sending email to ${to}...`);

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      ...(cc.length ? { cc } : {}),
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  const result = (await response.json()) as { id: string };
  console.log('✅ Email sent!');
  console.log(`   Email ID: ${result.id}`);
  console.log(`   To: ${to}`);
  if (cc.length) {
    console.log(`   Cc: ${cc.join(', ')}`);
  }
  console.log(`   Subject: ${subject}`);
  console.log(
    `   Secrets: Aaron=${aaronToken === REDACTED_PLACEHOLDER ? 'redacted placeholder' : 'included'}, Andre=${andreToken === REDACTED_PLACEHOLDER ? 'redacted placeholder' : 'included'}`
  );
}

sendEmail().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
