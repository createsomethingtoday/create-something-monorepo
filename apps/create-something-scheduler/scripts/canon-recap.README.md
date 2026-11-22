# Private Canon recap operator

This local utility reads one explicitly selected, ended Google Meet conference. It creates a host-only transcript and an extractive recap draft. It never creates tasks, messages, provider records or sharing permissions. Review every candidate commitment and decision before acting or sharing.

Use an access token obtained through the host's approved OAuth connection with `https://www.googleapis.com/auth/meetings.space.readonly` authorization and Meet API access. The utility requires an operator assertion that the credential belongs to the authorized host; it cannot prove host identity from the conference record. Do not use a participant credential merely because it can read a conference. Never paste tokens into arguments or repository files.

```sh
# Set GOOGLE_MEET_ACCESS_TOKEN securely in the process environment first.
node apps/create-something-scheduler/scripts/canon-recap.mjs \
  --conference conferenceRecords/EXPLICIT_RECORD_ID \
  --output "$HOME/Library/Application Support/CREATE SOMETHING/Canon Meeting Notes" \
  --host-confirmed
node --test apps/create-something-scheduler/scripts/canon-recap.test.mjs
```

The output root must be an operator-owned directory with mode 0700. New roots are created private. Do not select a repository, shared folder, cloud-synchronized folder, or web-served path. Existing permissive directories fail closed. Files are created with mode 0600. Local OS permissions do not prevent copies or privileged access.

A content digest identifies each source snapshot. An unchanged retry reuses the verified files. Modified or incomplete existing drafts fail closed and are never overwritten; preserve reviewed edits and choose a fresh private output root for recovery. Updated upstream transcripts create a different snapshot. Retain only as long as required; rollback is deletion of the local snapshot folder. No upstream state needs rollback.

Transcription must have been enabled during the meeting and Google must have generated all transcript artifacts. The utility refuses live meetings, unavailable transcripts and incomplete transcript generation. Meet transcript entries are normally available for 30 days. API errors give status codes without logging provider payloads or credentials. It does not refresh or acquire OAuth credentials.

The recap contains keyword-selected direct quotes and the full ordered transcript, with participant names, timestamps and exact Meet resource references. Candidates are explicitly unconfirmed: negation, irony, implied ownership and deadlines require host review. No model or external text-processing service receives the transcript. Google API transcripts may differ from subsequently edited Google Docs transcripts.

Provider reference: https://developers.google.com/workspace/meet/api/guides/artifacts

The node tests use offline provider fixtures. They establish pagination, rejection behavior, local file permissions and duplicate protection; they do not establish live Google entitlement, credential authorization or recap usefulness for a real call.

Publication writes the review and transcript files into a private staging directory and atomically renames the completed snapshot into place. Ordinary write failures remove staging files and permit a clean retry. A process crash may leave a private `.canon-recap-staging-*` directory; it is never treated as a published snapshot and can be deleted after confirming no process is using it.

The recap escapes transcript text and speaker names so they cannot create Markdown images, HTML, or injected headings. Candidate quotes link to local full-transcript entry anchors. The only provider-created external links are HTTPS Google Docs document destinations validated against the exact `docs.google.com` host and document path; unknown destinations remain absent. Opening an approved Docs link is an explicit reader action.

Open `recap.html` for the branded host review. It embeds the approved r42 Canon head and Agency Geist font locally. Source links jump within the document. The CREATE SOMETHING credit opens the Agency site only when selected.

For the independent local transcript, replace `--conference conferenceRecords/EXPLICIT_RECORD_ID` with `--local-transcript /private/path/new-transcript.json`. This path works offline. It groups timed Speech segments, retains source references and leaves speakers unattributed.
