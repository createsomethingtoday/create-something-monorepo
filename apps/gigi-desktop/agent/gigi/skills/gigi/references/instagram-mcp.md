# Instagram drafts through MCP

These tools share the desktop SQLite draft library. Agents may prepare drafts and request review. No MCP tool approves, publishes, continues a pending publication, opens consent, or uploads local media. Only the desktop's explicit review and confirmation may publish. This release supports one public JPEG for an existing Business or Creator account.

## Example: prepare a studio announcement

1. Resolve the current workspace with the existing workspace tools. Call `gigi_instagram_connection_status` with `workspaceId`. Use the returned connected account ID and verified Instagram account ID, not a guessed username. This check may refresh an existing GiGi source session; it does not create an OAuth grant. If blocked, explain the error and leave the draft local.
2. Call `gigi_instagram_media_validate` with `workspaceId` and an explicitly provided public `imageUrl` on `https://media.createsomething.io`. It must be JPEG, at most 8 MiB, at least 320 pixels wide, with aspect ratio from 4:5 to 1.91:1. This contacts the approved host; no local file is uploaded. Keep the returned `expectedImageSha256`.
3. Call `gigi_instagram_draft_create`:

```json
{
  "workspaceId": "<resolved-workspace>",
  "requestId": "<fresh-UUID>",
  "title": "Studio announcement",
  "caption": "A new piece from today's session.",
  "imageUrl": "https://media.createsomething.io/<user-approved-JPEG>",
  "connectedAccountId": "<verified-connection>",
  "expectedImageSha256": "<digest-returned-by-media-validate>"
}
```

Incomplete drafts may omit image/account/digest and remain local. Do not request publication approval until complete. Retry an uncertain save only with the identical UUID and payload. To edit, read `gigi_instagram_draft_get`, then send all editable body fields to `gigi_instagram_draft_update` with its exact `id` and `expectedRevision` plus a fresh request UUID. Changing a URL requires validating it again. Edits invalidate old review requests.

4. Call `gigi_instagram_request_publication_approval` with `workspaceId`, the returned draft `id`/`expectedRevision`, a fresh `requestId` UUID, and `expectedInstagramAccountId` from the connection check. A `pending_user_approval` response means nothing was approved or published. Reusing the identical request UUID is safe; a different body/account cannot reuse it.
5. Tell the user to open **Instagram drafts** in GiGi, use **Refresh drafts** if needed, select the requested draft, load its verified preview, check account and caption, and choose **Review & publish** only if they want to share it. Unsaved edits and open confirmation dialogs are never overwritten by refresh.
6. Poll `gigi_instagram_approval_status` using the approval `requestId`. `stale` requires preparing a new review of the changed draft. `pending_user_approval` requires human action. `publishing`, `unknown`, and `published_unverified` must not be described as successful publication. Only `published` with provider readback is verified success.

`gigi_instagram_publish_receipt` reads/reconciles an existing attempt by draft `id`; it never continues a pending publish. Never create another draft or request to work around an unknown outcome. A definitive `not_published` result may be described as not published, with its reason; let the user deliberately decide what to do next.

Discover all ten typed tools through `tools/list`; list saved work with `gigi_instagram_drafts_list` and follow `nextOffset` for more results. Data is scoped to the selected local workspace. Connection or provider errors remain errors rather than fabricated disconnected states or success receipts.

For a lost draft create/update response, call `gigi_instagram_draft_save_status` with the original `workspaceId` and `requestId`. `saved` returns the exact original draft result, even if later edited. `unknown` means no completed receipt was found, not that the save did not run. This lookup never retries, creates, edits or contacts Instagram. Do not replace the request UUID to work around an uncertain outcome.
