# Your AI engineering foundation

Use this package when you or your agent need to understand how a workflow works.
Start with your current job. Read a foundation when it helps you explain, design,
or troubleshoot that job.

## Start with your workflow

In your existing client workspace, ask your agent to identify:

1. The outcome you want and the person responsible for accepting it.
2. The source records and tools the workflow uses.
3. The actions already permitted, the actions needing approval, and who can approve them.
4. The evidence that shows a run worked, and the person to contact when it fails.

Use your existing operating policy as the authority. If those answers are missing,
resolve them with your workflow owner before granting the agent new actions.
This foundation service does not store your answers or private documents.

## Connect your agent

For an agent client that supports remote MCP over Streamable HTTP, use:

https://learn.createsomething.space/api/foundation/mcp

Access is public and read-only. There is no API key or sign-in step.
The connection exposes exactly two tools:

- `search_foundation`: find a few relevant lessons by concept.
- `get_foundation_lesson`: read one lesson or heading section.

For Codex CLI, this command adds the connection to your own configuration:

```sh
codex mcp add foundation --url https://learn.createsomething.space/api/foundation/mcp
```

Run it only when you intend to install the connection. Alternatively, the supplied
`codex.toml` contains the configuration entry to merge into your existing config;
do not replace the rest of your config. Other clients use their remote MCP setup
with the same URL. The connection has been exercised with Codex CLI 0.155.1 and the TypeScript MCP
SDK 1.26.0. Other clients require their own connection check.

Add the short policy from `AGENT-REFERENCE.md` to your agent's existing instructions
after reviewing it. Keep your client policy and workflow details in their current
workspace. Do not paste the curriculum into standing instructions.

## Try it

Ask your agent:

> Search the foundation for agent memory. Read one relevant section. Explain how
> the concept relates to my current workflow, cite the source, and identify any
> client-specific facts you still need. Do not change the workflow or its permissions.

A useful answer explains the concept, distinguishes it from your actual setup,
and links to the lesson. Ask for more depth only when you need it.

## Read without an agent

- Field course: https://learn.createsomething.space/paths/governed-agent-engineering
- Full library: https://learn.createsomething.space/reference
- Onboarding and downloads: https://learn.createsomething.space/foundation
- Topic map: `TOPICS.md`

## HTTP access

Clients without remote MCP can use the public JSON API:

```sh
curl --fail --get 'https://learn.createsomething.space/api/foundation/search' \
  --data-urlencode 'query=agent memory' --data-urlencode 'limit=3'
```

```sh
curl --fail --get 'https://learn.createsomething.space/api/foundation/lesson' \
  --data-urlencode 'id=original/governed-agent-engineering/give-it-memory-and-tools' \
  --data-urlencode 'maxChars=6000'
```

Fetch responses list stable heading IDs. Add `section` to retrieve a particular
heading. If `pagination.truncated` is true, `pagination.next` contains the exact
arguments for continuation, including a content hash. Continue only if needed.
A changed revision returns a conflict; restart with a fresh search instead of
joining content from different versions.

## Service limits and ownership

Search: up to 200 characters and 10 results (5 by default). Fetch: up to 12,000
Unicode characters (6,000 by default), plus metadata and headings. MCP request
bodies are limited to 8 KiB. Both interfaces share 60 requests per minute per
network address; people behind the same office connection share that limit.
On HTTP 429, wait for the `Retry-After` period. On 503, retry later or read Learn.
Do not send private client details in search queries. The service stores only
short-lived hashed request counters for request control, not query text or client
knowledge. Platform infrastructure may retain ordinary access logs.

CREATE SOMETHING maintains the service and curates curriculum updates through
reviewed releases. Each response includes its content revision and canonical link.
Version-sensitive implementation examples still need current official API docs.

The reference curriculum is by Rohit Ghumare and AI Engineering from Scratch
contributors under the MIT license. Attribution, pinned source links, and the
license travel with retrieval results. Original CREATE SOMETHING field lessons
are identified separately.

License: https://learn.createsomething.space/reference-license.txt
