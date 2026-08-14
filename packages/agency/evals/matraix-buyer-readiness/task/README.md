# Local buyer-readiness intent

MatrAIx task bundle owned by `@create-something/agency`. This task has no
public URL. Its persona container is isolated on an internal Docker network and
can reach only `agency-bridge` (a fixed read-only proxy for the host-local
Agency app) and `llm-bridge` (a TLS proxy restricted to the three fixed
OpenAI Codex authentication/model hosts). The browser cannot reach the open
internet or `/book`.

Output: `/app/output/buyer_readiness_trajectory.json`.
