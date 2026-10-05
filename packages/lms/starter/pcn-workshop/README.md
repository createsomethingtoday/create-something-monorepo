# PCN thin starter

A guided path from this ZIP to your own private repository and public educational Worker. Commands run in your terminal, never in the Canon game. Replace every YOUR_ placeholder before using it.

Educational workflow contract: intake → gather missing information → validate → propose → exact human approval → controlled simulation → receipt. Local tests exercise this contract; the Worker only returns health JSON.

## 1. Download and test the starter

1. Download pcn-starter.zip and extract it with your file manager. Open the pcn-workshop-starter folder. Use a computer with a terminal for these steps; you can read this guide on your phone.

2. Install Node 22 and Git if needed, then open a terminal in the extracted folder. Every command below runs from that folder. The starter contains README.md, package.json, workflow.ts, workflow.test.ts, worker.ts, wrangler.jsonc, DECISIONS.md, and .gitignore.

3. Run the version checks, install the development tools, and run the local tests. Nothing in this step deploys to a provider.

### Check tools and run local tests

```
node --version
git --version
npm install
npm test
```

### What success looks like

Node reports v22.x, Git reports a version, and npm test exits successfully with all seven workflow tests passing. These are local simulation tests, not proof of a deployed service.

### If it fails

- **Download or extraction failed:** Download again from this page. Extract the ZIP before opening a terminal; do not run from inside the archive.
- **Command not found:** Install Node 22 or Git from the official links, then reopen your terminal. On a phone, continue on a computer.
- **Missing package.json or tests fail:** Check that your terminal is inside pcn-workshop-starter. Read the first failing test or install error; stop here until it passes. Keep your work if you download another copy into a separate folder.

### Keep your evidence

Record the local test command and passing result in DECISIONS.md. The game does not run or inspect your terminal.

- [Install Node](https://nodejs.org/en/download)
- [Install Git](https://git-scm.com/downloads)

## 2. Create and push a private repository

1. Sign in to GitHub or create your own account. Open New repository, choose your owner, enter a new name, and select Private. Leave README, .gitignore, and license initialization unchecked so the repository starts empty.

2. Copy the empty repository’s HTTPS URL. Replace YOUR_OWNER and YOUR_REPO in the commands with your own owner and name; never put a password or token in the URL. If Git already has working HTTPS authentication, keep it. Otherwise install GitHub CLI from the official link and use the browser sign-in commands below before pushing. Review the access request yourself; enter login codes only on GitHub’s sign-in page, never in this game.

3. In the extracted starter folder, initialize Git and add only the listed files. npm install created package-lock.json. Review git status before committing: no credentials, .env files, node_modules, or .wrangler output should be included.

### Configure GitHub HTTPS sign-in if needed

```
gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git --hostname github.com
```

### Commit and push the starter

```
git init
git add README.md package.json package-lock.json workflow.ts workflow.test.ts worker.ts wrangler.jsonc DECISIONS.md .gitignore
git status
git commit -m "Start my PCN workshop"
git branch -M main
git remote add origin https://github.com/YOUR_OWNER/YOUR_REPO.git
git push -u origin main
```

### What success looks like

Your GitHub repository page shows Private, the main branch, and the starter files at your new commit. A local commit alone does not prove the push succeeded.

### If it fails

- **Git asks who you are:** Follow GitHub’s username/email guide to configure your commit identity, then retry the commit. Use your GitHub no-reply email if you prefer privacy.
- **Authentication failed or repository not found:** Check the owner/repository URL and your signed-in account’s access. Follow GitHub’s HTTPS authentication guide; do not paste credentials into the game or embed them in a remote URL.
- **origin already exists or push rejected:** Run git remote get-url origin and git status first. If they refer to your intended empty repository, resume from the unfinished command. If the remote has existing commits, stop and follow GitHub’s import guide or choose a new empty repository; do not force-push over existing work.
- **Repository is public:** Review its visibility in Settings before continuing. Change visibility only if you own the repository and intend the change. If any secret was committed, stop and follow the provider’s exposure/rotation process; deleting a file is not enough.

### Keep your evidence

Record repository URL, Private visibility, and pushed commit in DECISIONS.md. Keep private evidence in your own repository; no URL or credentials are collected by this game.

- [Install GitHub CLI](https://cli.github.com/)
- [GitHub browser sign-in guide](https://cli.github.com/manual/gh_auth_login)
- [Configure Git authentication](https://cli.github.com/manual/gh_auth_setup-git)
- [Create a private repository](https://github.com/new)
- [Git commit identity](https://docs.github.com/en/get-started/git-basics/setting-your-username-in-git)
- [GitHub HTTPS authentication](https://docs.github.com/en/get-started/git-basics/about-remote-repositories)
- [Import existing code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

## 3. Choose the right Cloudflare account

1. Sign in to your own Cloudflare account. In the dashboard, select the account you intend to use and note its name and Account ID. Do not use CREATE SOMETHING’s account or an example ID. Review any account agreements yourself.

2. Run Wrangler login in your terminal, review its OAuth request, and approve only if you intend to grant that access. Run whoami and match the account name and ID to the dashboard. If several accounts appear, choose the intended one explicitly.

3. Edit wrangler.jsonc: give name a unique name for your starter and add account_id with the exact intended Account ID. Preserve main and compatibility_date. Replace BOTH placeholders in the example. Account IDs are identifiers, not API tokens.

4. If your terminal already supplies CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID from another project, stop and reconcile that configuration with the account owner before deploying. The starter does not need D1, R2, or real integration secrets.

### Sign in and inspect accounts

```
npx wrangler login
npx wrangler whoami
```

### Example wrangler.jsonc — replace placeholders

```
{
  "name": "YOUR_UNIQUE_WORKER_NAME",
  "account_id": "YOUR_32_CHARACTER_ACCOUNT_ID",
  "main": "worker.ts",
  "compatibility_date": "2026-10-05"
}
```

### What success looks like

Wrangler lists the intended account, and wrangler.jsonc pins the same Account ID and your chosen Worker name. No Worker has been deployed by this check.

### If it fails

- **Login opens the wrong account:** Stop before deploy. Sign in to the intended dashboard account and rerun Wrangler login, reviewing the authorization request yourself. An account owner must resolve missing membership or permissions.
- **Account missing, ID mismatch, or authentication error:** Compare dashboard, whoami, config, and any existing terminal configuration. Do not broaden token permissions by trial and error. Ask the account owner to diagnose the exact denied operation.

### Keep your evidence

Record the intended account name/ID and Worker name in your private DECISIONS.md. Never record tokens or login codes. The game cannot verify account selection.

- [Cloudflare dashboard](https://dash.cloudflare.com/)
- [Wrangler login and whoami](https://developers.cloudflare.com/workers/wrangler/commands/general/)
- [Account configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

## 4. Deploy your educational Worker

1. Review worker.ts: it returns only an educational JSON health response. It does not run the workflow, provision a database, call OpenAI, or connect Infisical. This Worker will be publicly reachable.

2. Rerun the tests and dry-run the bundle. A successful dry run does not prove remote authorization or deployment. Review the exact account and Worker name before the final command.

3. Run npm run deploy only when you intend to create or update that Worker in your account. Review any workers.dev subdomain setup or account prompts yourself; stop at unexpected grants, plans, or agreements. Record the returned URL and version.

### Test, preflight, then deploy when ready

```
npm test
npx wrangler deploy --dry-run
npm run deploy
```

### What success looks like

Wrangler reports a completed upload/deployment, a Worker URL, and a version/deployment ID for the intended account and name. A private GitHub repository does not make the deployed Worker private.

### If it fails

- **Build, config, or permission error:** Read the first error. Confirm the local tests, account ID, Worker name, and owner-authorized access. Do not disable security checks, grant broad permissions, or add paid bindings to make deployment pass.
- **Timeout or result unknown:** Check the intended account’s Workers dashboard for that Worker/version, then check its URL before retrying. A repeated deploy can create another version; the game’s simulated duplicate protection does not apply to Wrangler.
- **A Worker with that name already exists:** Stop before updating it unless it is your intended starter. Choose a new unique name if you did not intend to replace that Worker. Never delete another project to resolve the collision.

### Keep your evidence

Record the exact account, name, commit, URL, and deployed version in DECISIONS.md. For updates, record the previous version and your reviewed rollback path too.

- [Workers deployment guide](https://developers.cloudflare.com/workers/get-started/guide/)
- [Workers dashboard](https://dash.cloudflare.com/)
- [Review rollback options](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)

## 5. Confirm the result and record evidence

1. Open the URL returned by YOUR deployment in a browser. Or replace the URL placeholders in the curl command below and run it in your terminal. Do not use the Canon game URL as your Worker health check.

2. Check HTTP 200 and the exact JSON below. Match the Worker/account/version in your dashboard to your recorded deployment. Store the URL, version, time, and response in DECISIONS.md, then commit and push the updated decision record.

3. Your own observation of the live response is evidence that this educational Worker responds. It does not verify a production workflow, authentication, an OpenAI account, or an Infisical integration. This game does not fetch your private resources or verify your self-report.

### Check your deployed URL — replace placeholders

```
curl --fail-with-body --include https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev
```

### Expected health response

```
{
  "service": "PCN starter",
  "mode": "educational",
  "providerIntegrations": false
}
```

### Save your decision record

```
git add DECISIONS.md wrangler.jsonc
git diff --cached
git commit -m "Record my starter deployment"
git push
```

### What success looks like

Your live URL returns HTTP 200 with service "PCN starter", mode "educational", and providerIntegrations false. Your private repository contains the deployment record and reviewed account config. This is your evidence, not automatic verification by the game.

### If it fails

- **404, network error, or HTML instead of JSON:** Check the exact URL returned by Wrangler and the deployment’s status. If the result is unknown, reconcile the dashboard/version before redeploying. Do not assume the upload completed because local tests passed.
- **JSON differs or the wrong account/Worker was deployed:** Stop and compare URL, Worker name, account, version, and worker.ts. Use the intended deployment’s URL; make any rollback or cleanup an explicit owner-reviewed action.
- **No changes to commit or final push failed:** If git status is clean, the record may already be committed: check it on GitHub. Otherwise resolve authentication or the remote state as in step 2. Do not force-push to make a checkbox pass.

### Keep your evidence

Keep live response evidence and deployment/rollback identities in your own DECISIONS.md. Checking this step only saves a self-report in this browser.

- [Deployment and version concepts](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/)

## Beyond the starter

Codex / OpenAI: follow https://developers.openai.com/codex/ to set up Codex and inspect the approval contract.

Infisical: follow https://infisical.com/docs/documentation/getting-started/introduction to create a narrowly scoped project/identity. This starter needs no integration credentials and does not connect Infisical. Never put secrets in source, chat, screenshots, or the game.

Before adding real operations, build a server-owned authenticated policy boundary, tenant isolation, durable idempotency/receipt storage, and bounded recovery. Client approval is never server authority.

Webflow is optional except for the Webflow course. CTX can add history/reuse later; it is not your application database.

The game’s saved checks are self-reported. No actual provider setup is automatically verified. Use DECISIONS.md to record reliable evidence and rollback from your first session.
