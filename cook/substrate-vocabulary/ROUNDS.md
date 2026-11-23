## Local acceptance
Implemented the source-directory learner, persistent operator edits, and incremental extraction. Corrected discovery of adjacent prose sentences and types first appearing after 1,000 records. Malformed JSON preserves the previous complete snapshot.

The database-layer package passed 236 tests, type checking and build. Independent Sol 6.1 review exercised the CLI and running watcher using temporary files. It observed four reports, verified stable IDs and curated definitions through updates, and verified removal of obsolete evidence and recovery from invalid JSON. The learner uses structural and English-language heuristics, and the editor recognizes three command forms. No rendered interface or production rollout was in scope.

## CRE-2550 duplicate-type shadow review
Used the shared decision transports and identical synthetic examples for both providers. Selected evidence is previewed locally, then rechecked after ranking. No automatic alias creation or merge.

The 12 labeled cases consisted of 11 nonempty shortlists and one empty shortlist resolved locally. Jev returned all 11 expected decisions, with zero erroneous suggestions and zero missed duplicates. End-to-end evaluation took 1.60 s including local setup. The exact-name heuristic scored 5 of 12 including the empty case, with three erroneous suggestions and six missed duplicates. A wrong target can contribute to both error counts. The existing sync/watch workflow itself makes zero suggestions; the exact-name rule is a comparison heuristic. OpenAI produced 11 HTTP failures; a separate single-case diagnostic returned 429. The pilot did not measure operator time or evaluate representative private data. Per-case receipts are in jev-shadow.json and openai-shadow.json. Use Jev for opt-in shadow evaluation pending operator evidence.

Final verification: 246 database-layer tests, package type check and build passed. Independent Sol 6.1 exercised the normal CLI with temporary vocabulary state, checked missing IDs, invalid provider/flags, candidate count, duplicate IDs, missing key, stale evidence handling and byte-identical state, and reconciled the saved reports against the offline baseline.
