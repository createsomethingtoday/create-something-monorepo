# GiGi 0.3.7 corrective qualification — CRE-2406

GitHub review of PR2243 at97d3943b8 found P2 Unicode Social search matching failures: SQLite lower() is ASCII-only. The parent added a native/MCP55-draft regression and reproduced0matches for été against ÉTÉ. Both item selection and total counts now share the existing domain::search_fold normalization in Rust before pagination, retaining at most50 page identifiers. Accented, decomposed-accent, Cyrillic lower/uppercase and Nordic text pass; cross-workspace rows are excluded, pages are non-overlapping and history is unchanged. No schema, source consent or publishing approval changed.

The complete native crate suite passed after the fix. The correction is0.3.7 because the prior0.3.6 candidate had already been uploaded at an immutable URL and installed on the operator Mac. That object remains unchanged; canonical pages were not promoted to0.3.6.0.3.7 will get a separate signed/notarized installer and full qualification. This is the same approved UI/Money/Social/Maps scope with the bounded review correction.

Acceptance: native/MCP Unicode matching, full-workspace totals/pagination and no writes/providers; existing15 renderer checks and verifier tests; exact clean compiler provenance; signed native UI Unicode matching; independent Sol6.1 final re-test of actual output/app/DMG; empty-key immutable upload, complete anonymous download/hash/full verifier; updated canonical notes/rollback; installed downloaded app on thisMac with records/memory protected; normalPRreview/CI/merge and live-page readback.

Evidence at this checkpoint: unicode-red.txt (functional failure before fix), rust-green.txt (full native pass after fix). Source-only checkpoint: packaging, independent final artifact acceptance and promotion pending. Prior0.3.6 evidence remains historical under gigi-ui-036.

Rollback: retain previous qualified public0.3.5 installer and operator’s original0.3.4 app/backup. Do not overwrite immutable0.3.6 bytes or restore an older database solely forUIrollback. Worktree disposition: retained at the T3-created t3/gigi-ui-036 checkout for0.3.7 qualification and production closeout.
