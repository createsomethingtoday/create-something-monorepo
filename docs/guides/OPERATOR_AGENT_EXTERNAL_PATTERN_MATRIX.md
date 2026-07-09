# Operator Agent External Pattern Matrix

This matrix keeps external agent-system lessons concrete for CREATE SOMETHING.
It is pattern-review context, not a mandate to copy another platform.

## Source Patterns

| Source | Useful observed pattern | CREATE SOMETHING mapping | Current artifact or gap |
| --- | --- | --- | --- |
| OpenHands / Agent Canvas | Self-hosted coding agents can run locally, in Docker, on VMs, or cloud backends, with automations connected to tools such as Slack, GitHub, Linear, and Notion. | Treat the local operator-agent as the first backend, then expose it through a no-write gateway and Cloudflare Access before any public use. | `operator-agent:runtime`, `operator-agent:mcp`, and `OPERATOR_AGENT_PUBLIC_ACCESS.md`; public Access remains blocked until the dedicated Cloudflare Access token is present. |
| OpenHands sandbox warning | Running directly on the host gives the agent full filesystem access; sandboxed runs narrow the blast radius. | Keep local CLI patch/revise separate from public MCP tools, and require explicit policy plus rollback before widening writes. | MCP exposes no patch/revise tools; completion audit tracks no-write regular-run posture. |
| SWE-agent / mini-swe-agent | Issue-fixing agents need simple tool interfaces, benchmark discipline, and configurable runs rather than vague autonomy. | Promote local models only after strict JSON probes, benchmark receipts, batch-eval receipts, and no-write schedule evidence. | `operator-agent:model-probe`, `operator-agent:model-benchmark`, `operator-agent:batch-eval`, and `operator-agent:audit`. |
| Aider / local coding stacks | Practical local coding loops combine repo context, edits, git diff visibility, linting, and tests. | Keep local model work inside repo-scoped candidate receipts; require source, usefulness, policy, and validation gates before writes. | `scout`, `patch --dry-run`, `revise`, source gates, usefulness gates, and `operator-agent:test`. |
| LangGraph / LangSmith | Durable orchestration emphasizes state, persistence, human-in-the-loop gates, memory, tracing, and evals. | Model outputs become receipts; approval remains an explicit gate; schedule and doctor collect repeatable evidence. | Schedule receipts, completion audit, strict model mode, strict public mode; long-term trace UI is still a future surface. |
| Kore.ai / enterprise agentic engineering | Enterprise systems need guardrails across behavior, data, tools/actions, operations, observability, and evals. | Policy is an artifact, tool authority is explicit, public routes require Access, and model authority is threshold-gated. | Production-lab policy, Cloudflare Access preflight, MCP read-only tools, model benchmark thresholds. |
| Codified Context / persistent memory | Agents need project-specific conventions, retrieval hooks, specialized roles, and cold-memory specifications rather than raw chat history. | Pattern review should load repo-owned docs, policies, scripts, and receipts before scout or patch. Memory updates should be explicit operator-controlled artifacts. | All-scope pattern review, AGENTS.md, docs map, memory citation discipline, and `operator-agent:memory-proposal`; direct memory write-back remains operator-controlled. |

## CREATE SOMETHING Rule

The concrete operating chain is:

```text
model -> harness -> sandbox/runtime boundary -> repo context -> tool permissions -> evals/tests -> review gate -> memory/update artifact
```

Do not skip a link. A local model can be useful before every link is mature, but
it cannot become a primary model-backed executor until the benchmark, schedule,
permission, review, and memory evidence are visible in receipts.

## Current Device Finding

This device has 16 GB unified memory and limited free disk, so the reliable lane
must be measured by agentic quality as well as strict JSON latency. `ornith:9b`
is slower than the previous lightweight local executor, but it passed stronger
tool-policy and one-candidate self-heal receipts that better match the CREATE
SOMETHING operator loop. That makes `ornith:9b` the current bounded local
executor while public Access and write authority remain gated.

## Sources

- OpenHands README: https://github.com/OpenHands/OpenHands
- SWE-agent docs: https://swe-agent.com/latest/
- Aider docs: https://aider.chat/
- LangGraph overview: https://docs.langchain.com/oss/python/langgraph/overview
- LangGraph interrupts: https://docs.langchain.com/oss/python/langgraph/interrupts
- Kore.ai agentic coding writeup: https://www.kore.ai/blog/harnessing-agentic-coding-toward-autonomous-engineering-what-weve-learned-so-far
- Codified Context paper: https://arxiv.org/html/2602.20478v1
