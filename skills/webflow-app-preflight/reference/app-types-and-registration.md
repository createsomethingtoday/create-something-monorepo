# App types & registration

## Building blocks

An App is made from one or both of these:

- **Designer Extension** — a single-page app that runs inside a **secure iframe within the Webflow Designer**. It uses Webflow's client-side Designer APIs to read and modify the canvas, add panels, and automate design tasks. For advanced cases it can also talk to your own backend and third-party APIs.
- **Data Client** — a backend integration that uses **OAuth + the Data API** to read and write site data (CMS, assets, forms, pages, etc.) and connect Webflow to third-party infrastructure.

An App that uses both is a **Hybrid App**: Designer UI in front, Data Client managing site data behind it.

**Choose the smallest surface.** Registering a Data Client means the reviewer must verify an OAuth flow and every scope, and the user must grant server-side access. If your App only manipulates the canvas client-side, a Designer Extension alone is cleaner, faster to approve, and easier for users to trust.

## Registering the App

**Settings → Apps & Integrations → App Development → Create an App.** You need Admin permissions on the Workspace.

Fields:

| Field | Requirement |
|---|---|
| **Name** | The App's name |
| **Description** | Short summary of purpose — 140 characters max |
| **Icon** | Represents your App (see listing spec: 512×512, 1:1 for the Marketplace avatar) |
| **Homepage URL** | Valid **HTTPS** link to your App's website |
| **Restrict app installation to a specific site** | Optional toggle — single site vs. multiple sites / workspace-wide |

Then select **building blocks**:

- **Designer Extension** — "show an overlay directly in the Webflow Designer."
- **Data Client** — "read and write site data and connect to third-party infrastructure with OAuth." If selected, configure:
  - **Redirect URI** — valid **HTTPS** URL users return to after authorizing.
  - **Scopes** — the specific API permissions your App needs (request the minimum; see `oauth-scopes-and-security.md`).

On success you receive:

- **Client ID** — public identifier, used in the OAuth Install URL.
- **Client Secret** — **server-side credential.** Never embed it in a Designer Extension bundle, client-side JS, a public repo, or anything shipped to the browser. If it leaks, rotate it.

## Scaffolding with the CLI

Start from the official CLI so structure, dependencies, and config are correct:

```bash
npm install -g @webflow/webflow-cli       # install the CLI
webflow extension list                    # available templates: default, react, typescript-alt
webflow extension init my-app react       # scaffold a Designer Extension from a template
webflow extension serve                   # local dev server, default port 1337, live inside the Designer
webflow extension serve 3000              # use a different port
webflow extension bundle                  # produce bundle.zip for upload
```

For Designer Extensions, you upload the bundled **client-side source code** through the App version manager — reviewers read that source, so keep it readable (see `checklists/governance-pitfalls.md`).

Reference: <https://developers.webflow.com/apps/data/docs/register-an-app>
