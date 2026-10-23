# Transcript readiness and retrieval

The inline transcript remains the reading experience. These fields let agents distinguish a verified publication from an interrupted upload and retrieve every part of a long transcript. This document defines the developer contract; production activation depends on the isolated acceptance tests below.

## Managed pages

| Property | Owner | Meaning |
| --- | --- | --- |
| Transcript Version | Writer | Indexed transcript content hash followed by `:` and the projection generation. |
| Transcript Ready Version | Writer | Cleared before body changes and on known source failures, subject to reconciliation of any earlier uncertain property request. Equals the current token only after complete reconstruction and source verification. |
| Categorized Transcript Version | Categorization agent | Exact token the agent retrieved and used. |
| Transcript Retrieval Index | Writer | Direct link to the immutable verification index and its ordered canonical parts. |

The content hash is SHA-256 over the JSON array `["indexed-transcript-v2", original, canonical]`. Generation distinguishes A to B to A corrections. An old completion for A:1 cannot validate A:3. Readiness certifies the verified published body. It is not continuous proof that Zoom has not changed since the verification read. D1 remains the immediate source-selection and lease fence.

New managed pages start with a current token and empty readiness in the creation request. Known corrections clear readiness before changing body blocks. Publication sets readiness and the index without rewriting the current token. Durable property intents block successor writes when the outcome of an earlier property request is unknown. A matching readback reconciles a lost response. An unchanged completed run makes no Notion writes.

Do not resend a reserved write whose outcome is unknown. See the [reconciliation boundaries](READINESS.md#resume-interrupted-work) before repairing a journal reservation.

`NOTION_TRANSCRIPT_GATE_ENABLED=true` admits new managed pages. Existing unmanaged pages stay unmanaged. Disabling admission does not disable protection for pages already managed. Do not roll back to a writer that lacks these guards while managed triggers are active.

## Categorization

Preserve the existing manual mention trigger. Restrict the existing page-added trigger to meetings with an empty Transcript Version and unchecked Categorized. That retains the manual/unmanaged workflow.

Add a property-updated trigger for Transcript Ready Version, Type Meeting and unchecked Categorized. The native text-filter UI supports `Contains ":"`; the agent must still validate the full token and exact equality. Clearing readiness does not match this filter.

Before reading managed source content, the agent reloads both tokens and requires a valid exact match. It opens Transcript Retrieval Index directly, reads every numbered canonical part in order and follows supported continuation. Encoded originals are archival evidence, not reading material. A truncated response is not completion.

Before each write and after analysis, reload both Transcript Version and Transcript Ready Version and require both to equal the captured token. Record Categorized Transcript Version, verify readback, then set Categorized last. Do not reset human review flags or replace existing relations. A correction can leave Categorized checked with an older consumed token; downstream agents must reject that stale combination rather than infer readiness from the checkbox.

## Downstream checks

Meeting Recap to Resources, Tasks, Tickets and Tools keep their existing triggers and review filters. When activated, their instructions must require current, ready and categorized tokens to match before reading or publishing managed transcript outputs. They recheck after analysis and before writes. Unmanaged records retain their existing rules.

Native Notion property updates have no cross-agent compare-and-set transaction. Pre/post version checks detect observed stale generations and withhold completion; they do not make all agent writes atomic. Full task-extraction quality remains a separate acceptance gate.

## Acceptance and activation

Native acceptance is pending. The following requirements are not recorded test results. Production properties and trigger changes remain withheld until the two approved isolated native-agent tests pass. The isolated test uses one synthetic page, the actual writer and gate cores, an existing Notion CLI session and local D1. Test one holds a partial upload unready, checks that no agent fires, reconciles a known committed lost response, verifies all text, then publishes readiness. The native agent must retrieve all 120 distinct cues and preserve human-owned metadata. An unchanged repeat must create no writes or additional run.

Test two presents a stale readiness token to a manual invocation on the same already categorized fixture. It must reject the version mismatch without source reads or property writes. Stop on any unexpected native-agent run. Record observable credit usage and retain the disposable fixture. Passing these tests establishes native gate/retrieval behavior; full task extraction and a new production credential path remain outside their scope.
