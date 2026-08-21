# Arc local agent

Arc uses the operator's existing Codex or Claude login. It does not require an application model API key.

1. In Arc Studio, open **Agent** and copy the structured brief.
2. Pipe the brief to the local runner:

   ```bash
   pbpaste | pnpm --filter @create-something/arc agent:local
   ```

   To use the locally logged-in Claude account instead:

   ```bash
   pbpaste | pnpm --filter @create-something/arc agent:local -- --claude
   ```

3. Paste the returned JSON into Arc Studio and select **Stage proposal**.
4. A human accepts the patch, requests review, approves, and publishes.

The runner uses a read-only Codex sandbox or a no-tool Claude session, validates the returned patch fields, and labels the proposal with local-account provenance.
