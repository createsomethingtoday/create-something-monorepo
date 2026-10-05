# PCN thin starter

Educational workflow contract: intake → gather missing information → validate → propose → exact human approval → controlled simulation → receipt.

## Local practice

Install Node 22 and run `npm install`, then `npm test`. Read workflow.ts and its tests. This is a simulation; it does not execute provider operations. The deployed worker only returns a health receipt. Before adding real operations, build a server-owned authenticated policy boundary, tenant isolation, durable idempotency/receipt storage, and bounded recovery. Client approval is never server authority.

## Provider-owned setup

1. Create your own GitHub repository and commit these files. Do not download the monorepo.
2. Install Codex through https://developers.openai.com/codex/ and run the tests.
3. Set up Infisical through its official documentation. Create a narrow project/identity. Never put actual secrets in source, chat, the browser, or this export. The game vault uses dummy generations only.
4. Review your Cloudflare account and official Workers setup. Change the worker name, run `npx wrangler login` yourself, and review grants and any account agreements. Run `npm run deploy` only after reviewing account and target. Record returned deployment URL/version; fetch that URL and verify the educational health response. This does not verify a complete stack.
5. Webflow is an optional website/CMS/team track, required for the Webflow course. CTX is recommended after multiple agent sessions for history/reuse; it is not an app database.

## Decision record

Use DECISIONS.md from the first session: what changed, why, exact approved target/payload/revision, tests, deployment receipt, and rollback.

No credentials, account evidence, personal data, or browser saves are included. Provider setup is manual and unverified until you record reliable authorized evidence. No real provider integrations are implemented.
