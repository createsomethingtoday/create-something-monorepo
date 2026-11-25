# Integrated R19 command verification

All 11 requested commands passed sequentially through pinned pnpm 9.15.4. Canon: 98 files, 818 tests passed. Full package check includes all chained Canon policy/library/depth gates. R18 read-only source contract check passed 45 guides, 78 token references, 39 package paths, 117 local links.

|Command|Start UTC|End UTC|Exit|
|---|---|---|---|
|canon test|2026-11-13T20:56:27.856679+00:00|2026-11-13T20:56:43.572589+00:00|0|
|canon check|2026-11-13T20:56:43.573011+00:00|2026-11-13T20:57:10.422705+00:00|0|
|canon build|2026-11-13T20:57:10.423089+00:00|2026-11-13T20:57:21.931646+00:00|0|
|agency check|2026-11-13T20:57:21.932021+00:00|2026-11-13T20:58:02.657528+00:00|0|
|agency build|2026-11-13T20:58:02.657997+00:00|2026-11-13T20:58:38.506638+00:00|0|
|io check|2026-11-13T20:58:38.507035+00:00|2026-11-13T20:59:43.620802+00:00|0|
|io build|2026-11-13T20:59:43.621199+00:00|2026-11-13T21:00:30.836163+00:00|0|
|ltd check|2026-11-13T21:00:30.836561+00:00|2026-11-13T21:00:43.858443+00:00|0|
|ltd build|2026-11-13T21:00:43.858873+00:00|2026-11-13T21:01:07.943319+00:00|0|
|space check|2026-11-13T21:01:07.943862+00:00|2026-11-13T21:01:18.601060+00:00|0|
|space build|2026-11-13T21:01:18.601437+00:00|2026-11-13T21:01:45.685579+00:00|0|

Source fingerprint before/after matches over 1,981 files: `75689842e573202d6a865f5d07eb5d8963738f1d8af9cc0e3c130d6392e00e10`. No scoped source drift. HEAD 5f9bfab3f6a9069332d650f42a09f5bd18d806a7 with intentional local changes; GitHEAD alone is not this artifact. Each command has its own log and timestamp/exit receipt in results.json.

Warnings retained: build chunk-size guidance, outdated Browserslist data, and Space Cloudflare route exclusion limits. No warnings were suppressed or checks weakened. These are local checks/builds; browser acceptance is recorded separately. No external workflow, deployment, publication or art approval inferred.
