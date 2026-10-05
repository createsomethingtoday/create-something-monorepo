export type SetupStep = {
  id: string;
  title: string;
  instructions: string[];
  commands: { label: string; text: string }[];
  success: string;
  recovery: { problem: string; action: string }[];
  evidence: string;
  links: { label: string; url: string }[];
};

export const healthResponse = { service: 'PCN starter', mode: 'educational', providerIntegrations: false };
export const setupSteps: SetupStep[] = [
  {
    id: 'starter', title: 'Download and test the starter',
    instructions: [
      'Download pcn-starter.zip and extract it with your file manager. Open the pcn-workshop-starter folder. Use a computer with a terminal for these steps; you can read this guide on your phone.',
      'Install Node 22 and Git if needed, then open a terminal in the extracted folder. Every command below runs from that folder. The starter contains README.md, package.json, workflow.ts, workflow.test.ts, worker.ts, wrangler.jsonc, DECISIONS.md, and .gitignore.',
      'Run the version checks, install the development tools, and run the local tests. Nothing in this step deploys to a provider.'
    ],
    commands: [{ label: 'Check tools and run local tests', text: 'node --version\ngit --version\nnpm install\nnpm test' }],
    success: 'Node reports v22.x, Git reports a version, and npm test exits successfully with all seven workflow tests passing. These are local simulation tests, not proof of a deployed service.',
    recovery: [
      { problem: 'Download or extraction failed', action: 'Download again from this page. Extract the ZIP before opening a terminal; do not run from inside the archive.' },
      { problem: 'Command not found', action: 'Install Node 22 or Git from the official links, then reopen your terminal. On a phone, continue on a computer.' },
      { problem: 'Missing package.json or tests fail', action: 'Check that your terminal is inside pcn-workshop-starter. Read the first failing test or install error; stop here until it passes. Keep your work if you download another copy into a separate folder.' }
    ],
    evidence: 'Record the local test command and passing result in DECISIONS.md. The game does not run or inspect your terminal.',
    links: [{ label: 'Install Node', url: 'https://nodejs.org/en/download' }, { label: 'Install Git', url: 'https://git-scm.com/downloads' }]
  },
  {
    id: 'repository', title: 'Create and push a private repository',
    instructions: [
      'Sign in to GitHub or create your own account. Open New repository, choose your owner, enter a new name, and select Private. Leave README, .gitignore, and license initialization unchecked so the repository starts empty.',
      'Copy the empty repository’s HTTPS URL. Replace YOUR_OWNER and YOUR_REPO in the commands with your own owner and name; never put a password or token in the URL. Use Git’s supported browser or credential-manager sign-in if prompted.',
      'In the extracted starter folder, initialize Git and add only the listed files. npm install created package-lock.json. Review git status before committing: no credentials, .env files, node_modules, or .wrangler output should be included.'
    ],
    commands: [{ label: 'Commit and push the starter', text: 'git init\ngit add README.md package.json package-lock.json workflow.ts workflow.test.ts worker.ts wrangler.jsonc DECISIONS.md .gitignore\ngit status\ngit commit -m "Start my PCN workshop"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_OWNER/YOUR_REPO.git\ngit push -u origin main' }],
    success: 'Your GitHub repository page shows Private, the main branch, and the starter files at your new commit. A local commit alone does not prove the push succeeded.',
    recovery: [
      { problem: 'Git asks who you are', action: 'Follow GitHub’s username/email guide to configure your commit identity, then retry the commit. Use your GitHub no-reply email if you prefer privacy.' },
      { problem: 'Authentication failed or repository not found', action: 'Check the owner/repository URL and your signed-in account’s access. Follow GitHub’s HTTPS authentication guide; do not paste credentials into the game or embed them in a remote URL.' },
      { problem: 'origin already exists or push rejected', action: 'Run git remote get-url origin and git status first. If they refer to your intended empty repository, resume from the unfinished command. If the remote has existing commits, stop and follow GitHub’s import guide or choose a new empty repository; do not force-push over existing work.' },
      { problem: 'Repository is public', action: 'Review its visibility in Settings before continuing. Change visibility only if you own the repository and intend the change. If any secret was committed, stop and follow the provider’s exposure/rotation process; deleting a file is not enough.' }
    ],
    evidence: 'Record repository URL, Private visibility, and pushed commit in DECISIONS.md. Keep private evidence in your own repository; no URL or credentials are collected by this game.',
    links: [{ label: 'Create a private repository', url: 'https://github.com/new' }, { label: 'Git commit identity', url: 'https://docs.github.com/en/get-started/git-basics/setting-your-username-in-git' }, { label: 'GitHub HTTPS authentication', url: 'https://docs.github.com/en/get-started/git-basics/about-remote-repositories' }, { label: 'Import existing code', url: 'https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github' }]
  },
  {
    id: 'account', title: 'Choose the right Cloudflare account',
    instructions: [
      'Sign in to your own Cloudflare account. In the dashboard, select the account you intend to use and note its name and Account ID. Do not use CREATE SOMETHING’s account or an example ID. Review any account agreements yourself.',
      'Run Wrangler login in your terminal, review its OAuth request, and approve only if you intend to grant that access. Run whoami and match the account name and ID to the dashboard. If several accounts appear, choose the intended one explicitly.',
      'Edit wrangler.jsonc: give name a unique name for your starter and add account_id with the exact intended Account ID. Preserve main and compatibility_date. Replace BOTH placeholders in the example. Account IDs are identifiers, not API tokens.',
      'If your terminal already supplies CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID from another project, stop and reconcile that configuration with the account owner before deploying. The starter does not need D1, R2, or real integration secrets.'
    ],
    commands: [
      { label: 'Sign in and inspect accounts', text: 'npx wrangler login\nnpx wrangler whoami' },
      { label: 'Example wrangler.jsonc — replace placeholders', text: '{\n  "name": "YOUR_UNIQUE_WORKER_NAME",\n  "account_id": "YOUR_32_CHARACTER_ACCOUNT_ID",\n  "main": "worker.ts",\n  "compatibility_date": "2026-10-05"\n}' }
    ],
    success: 'Wrangler lists the intended account, and wrangler.jsonc pins the same Account ID and your chosen Worker name. No Worker has been deployed by this check.',
    recovery: [
      { problem: 'Login opens the wrong account', action: 'Stop before deploy. Sign in to the intended dashboard account and rerun Wrangler login, reviewing the authorization request yourself. An account owner must resolve missing membership or permissions.' },
      { problem: 'Account missing, ID mismatch, or authentication error', action: 'Compare dashboard, whoami, config, and any existing terminal configuration. Do not broaden token permissions by trial and error. Ask the account owner to diagnose the exact denied operation.' }
    ],
    evidence: 'Record the intended account name/ID and Worker name in your private DECISIONS.md. Never record tokens or login codes. The game cannot verify account selection.',
    links: [{ label: 'Cloudflare dashboard', url: 'https://dash.cloudflare.com/' }, { label: 'Wrangler login and whoami', url: 'https://developers.cloudflare.com/workers/wrangler/commands/general/' }, { label: 'Account configuration', url: 'https://developers.cloudflare.com/workers/wrangler/configuration/' }]
  },
  {
    id: 'deploy', title: 'Deploy your educational Worker',
    instructions: [
      'Review worker.ts: it returns only an educational JSON health response. It does not run the workflow, provision a database, call OpenAI, or connect Infisical. This Worker will be publicly reachable.',
      'Rerun the tests and dry-run the bundle. A successful dry run does not prove remote authorization or deployment. Review the exact account and Worker name before the final command.',
      'Run npm run deploy only when you intend to create or update that Worker in your account. Review any workers.dev subdomain setup or account prompts yourself; stop at unexpected grants, plans, or agreements. Record the returned URL and version.'
    ],
    commands: [{ label: 'Test, preflight, then deploy when ready', text: 'npm test\nnpx wrangler deploy --dry-run\nnpm run deploy' }],
    success: 'Wrangler reports a completed upload/deployment, a Worker URL, and a version/deployment ID for the intended account and name. A private GitHub repository does not make the deployed Worker private.',
    recovery: [
      { problem: 'Build, config, or permission error', action: 'Read the first error. Confirm the local tests, account ID, Worker name, and owner-authorized access. Do not disable security checks, grant broad permissions, or add paid bindings to make deployment pass.' },
      { problem: 'Timeout or result unknown', action: 'Check the intended account’s Workers dashboard for that Worker/version, then check its URL before retrying. A repeated deploy can create another version; the game’s simulated duplicate protection does not apply to Wrangler.' },
      { problem: 'A Worker with that name already exists', action: 'Stop before updating it unless it is your intended starter. Choose a new unique name if you did not intend to replace that Worker. Never delete another project to resolve the collision.' }
    ],
    evidence: 'Record the exact account, name, commit, URL, and deployed version in DECISIONS.md. For updates, record the previous version and your reviewed rollback path too.',
    links: [{ label: 'Workers deployment guide', url: 'https://developers.cloudflare.com/workers/get-started/guide/' }, { label: 'Workers dashboard', url: 'https://dash.cloudflare.com/' }, { label: 'Review rollback options', url: 'https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/' }]
  },
  {
    id: 'confirm', title: 'Confirm the result and record evidence',
    instructions: [
      'Open the URL returned by YOUR deployment in a browser. Or replace the URL placeholders in the curl command below and run it in your terminal. Do not use the Canon game URL as your Worker health check.',
      'Check HTTP 200 and the exact JSON below. Match the Worker/account/version in your dashboard to your recorded deployment. Store the URL, version, time, and response in DECISIONS.md, then commit and push the updated decision record.',
      'Your own observation of the live response is evidence that this educational Worker responds. It does not verify a production workflow, authentication, an OpenAI account, or an Infisical integration. This game does not fetch your private resources or verify your self-report.'
    ],
    commands: [
      { label: 'Check your deployed URL — replace placeholders', text: 'curl --fail-with-body --include https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev' },
      { label: 'Expected health response', text: JSON.stringify(healthResponse, null, 2) },
      { label: 'Save your decision record', text: 'git add DECISIONS.md wrangler.jsonc\ngit diff --cached\ngit commit -m "Record my starter deployment"\ngit push' }
    ],
    success: 'Your live URL returns HTTP 200 with service "PCN starter", mode "educational", and providerIntegrations false. Your private repository contains the deployment record and reviewed account config. This is your evidence, not automatic verification by the game.',
    recovery: [
      { problem: '404, network error, or HTML instead of JSON', action: 'Check the exact URL returned by Wrangler and the deployment’s status. If the result is unknown, reconcile the dashboard/version before redeploying. Do not assume the upload completed because local tests passed.' },
      { problem: 'JSON differs or the wrong account/Worker was deployed', action: 'Stop and compare URL, Worker name, account, version, and worker.ts. Use the intended deployment’s URL; make any rollback or cleanup an explicit owner-reviewed action.' },
      { problem: 'No changes to commit or final push failed', action: 'If git status is clean, the record may already be committed: check it on GitHub. Otherwise resolve authentication or the remote state as in step 2. Do not force-push to make a checkbox pass.' }
    ],
    evidence: 'Keep live response evidence and deployment/rollback identities in your own DECISIONS.md. Checking this step only saves a self-report in this browser.',
    links: [{ label: 'Deployment and version concepts', url: 'https://developers.cloudflare.com/workers/configuration/versions-and-deployments/' }]
  }
];

export type SetupProgress = { step: string; checked: string[] };
export type SetupIntent = { type: 'select'; step: string } | { type: 'check'; step: string; checked: boolean };
export const setupKey = 'pcn-workshop-setup-v1';
export const initialSetup = (): SetupProgress => ({ step: setupSteps[0].id, checked: [] });
const known = (id: unknown): id is string => typeof id === 'string' && setupSteps.some(s => s.id === id);
export function restoreSetup(raw: string | null): SetupProgress {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || !known(value.step) || !Array.isArray(value.checked)) return initialSetup();
    return { step: value.step, checked: [...new Set((value.checked as unknown[]).filter(known))] };
  } catch { return initialSetup(); }
}
export function applySetup(progress: SetupProgress, intent: SetupIntent): SetupProgress {
  if (!known(intent.step)) return progress;
  if (intent.type === 'select') return { ...progress, step: intent.step };
  return { ...progress, checked: intent.checked ? [...new Set([...progress.checked, intent.step])] : progress.checked.filter(id => id !== intent.step) };
}

// The downloadable guide uses the same instructions, commands, and recovery as the game.
export function starterGuide(): string {
  const steps = setupSteps.map((step, index) => [
    `## ${index + 1}. ${step.title}`,
    ...step.instructions.map((instruction, i) => `${i + 1}. ${instruction}`),
    ...step.commands.map(command => `### ${command.label}\n\n\`\`\`\n${command.text}\n\`\`\``),
    `### What success looks like\n\n${step.success}`,
    `### If it fails\n\n${step.recovery.map(item => `- **${item.problem}:** ${item.action}`).join('\n')}`,
    `### Keep your evidence\n\n${step.evidence}`,
    step.links.map(link => `- [${link.label}](${link.url})`).join('\n')
  ].join('\n\n')).join('\n\n');
  return `# PCN thin starter\n\nA guided path from this ZIP to your own private repository and public educational Worker. Commands run in your terminal, never in the Canon game. Replace every YOUR_ placeholder before using it.\n\nEducational workflow contract: intake → gather missing information → validate → propose → exact human approval → controlled simulation → receipt. Local tests exercise this contract; the Worker only returns health JSON.\n\n${steps}\n\n## Beyond the starter\n\nCodex / OpenAI: follow https://developers.openai.com/codex/ to set up Codex and inspect the approval contract.\n\nInfisical: follow https://infisical.com/docs/documentation/getting-started/introduction to create a narrowly scoped project/identity. This starter needs no integration credentials and does not connect Infisical. Never put secrets in source, chat, screenshots, or the game.\n\nBefore adding real operations, build a server-owned authenticated policy boundary, tenant isolation, durable idempotency/receipt storage, and bounded recovery. Client approval is never server authority.\n\nWebflow is optional except for the Webflow course. CTX can add history/reuse later; it is not your application database.\n\nThe game’s saved checks are self-reported. No actual provider setup is automatically verified. Use DECISIONS.md to record reliable evidence and rollback from your first session.\n`;
}
