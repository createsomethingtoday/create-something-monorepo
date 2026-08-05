# Validate Submission Artifacts and a Production Runtime with App Review Preflight

This guide shows you how to use App Review Preflight to test the production runtime for a Webflow App.

It is written for a junior Webflow app developer or reviewer. You should know how to publish a Webflow test site and open the Designer Extension. You do not need to know the internal Worker, database, or E2B code.

Preflight gives you evidence. It does not approve or reject an app.

## What you will do

You will:

1. Upload the exact app bundle and private source-map container you plan to submit.
2. Record the server-owned artifact receipt without exposing the private maps.
3. Reconcile those exact containers through the canonical submission adapter twice.
4. Prove that changing either container invalidates the supplied receipt.
5. Connect the reviewed bundle to a dedicated published Webflow test site.
6. Pin the production runtime by URL, SHA-256, and SRI.
7. Ask Webflow's server to run the site in a fresh browser.
8. Repeat the developer test on the same package.
9. Ask a reviewer to replay that exact package.

At the end, you will know whether the published site ran the reviewed runtime and blocked the proxy canary.

## Before you start

Have these items ready:

- the exact zip bundle you plan to submit
- the exact private source-map ZIP you plan to submit, or one `.map` file
- a canonical submission ID for each reconciliation run
- access to the server-owned canonical submission adapter
- a dedicated Webflow test site with the app installed
- the published `webflow.io` URL for that site
- the Webflow site or installation ID
- the exact production runtime URL
- the SHA-256 for the runtime file
- the matching SRI value for the same file
- a CSS selector that appears only when the runtime is ready
- the approved proxy-check URL template

Do not use a customer site. Do not use a runtime URL that can change while the review is running.

## Terms you need

| Term                 | Plain meaning                                                                        |
| -------------------- | ------------------------------------------------------------------------------------ |
| Bundle               | The zip file you plan to submit for review                                           |
| Bundle SHA-256       | A fingerprint for the zip; different files have a different fingerprint              |
| Source-map artifact  | One private ZIP of maps, or one `.map` file, submitted as an unchanged container      |
| Artifact receipt     | Server-owned identities for one reviewed bundle and source-map checkpoint             |
| Reconciliation       | Exact-hash comparison between Preflight and the canonical form's stored artifacts     |
| Runtime              | The JavaScript file that the published site loads and runs                           |
| Runtime SHA-256      | A fingerprint for the runtime file that actually ran                                 |
| SRI                  | The integrity value the browser uses to check a script before it runs                |
| Runtime Test Package | The saved bundle, site, runtime, and test settings for one review attempt            |
| Observation job      | One server-requested browser run against one test package                            |
| E2B sandbox          | The short-lived remote computer that runs the browser                                |
| `webflow_observed`   | Evidence produced by Webflow's server-owned browser, not your computer               |
| Proxy canary         | A harmless request used to prove that the app proxy does not expose an arbitrary URL |

## Step 1: Upload the exact submission artifacts

1. Open **App Review Preflight** in Webflow Designer.
2. Select the exact zip bundle you plan to submit.
3. Select the exact private source-map ZIP, or one `.map` file.
4. Wait for the bundle review to finish.
5. Read every deterministic finding.

If the bundle review reports a problem, fix the bundle and upload a revision. Do not move to runtime testing until you understand the remaining findings.

When the bundle is ready, record:

- review ID
- review-version ID
- bundle SHA-256
- artifact-set version
- artifact receipt ID
- source-map artifact SHA-256
- policy version and scan status

These values identify the exact code under test.

The receipt must not show raw map content, `sourcesContent`, a public URL, or an R2 object key. Do not unzip and re-zip either artifact after recording the receipt: reconciliation hashes the original containers, not their extracted contents.

For a directly authored, unminified bundle, Preflight may record that source maps are not required. A generated or minified executable must not receive a passing receipt without meaningfully associated maps.

## Step 2: Reconcile the canonical submission twice

The official Webflow App Submission Form remains canonical and continues receiving the bundle and source-map artifact. Its server-side automation computes SHA-256 over the exact stored files and calls the reconciliation endpoint. A browser must never receive the reconciliation token.

Submit the same containers through the canonical form. The adapter must return all of the following:

- `status: matched`
- `receiptValid: true`
- `enforcement: verified`
- an empty `mismatches` list

Repeat the complete Designer-to-canonical path once more without changing either artifact. Use a distinct canonical submission ID and record both results. The two runs must be consecutive; investigate any intervening mismatch or unknown receipt before continuing.

The repository-owned adapter probe hashes the exact files and creates a receipt-safe JSON result. It is an operator aid for the form automation and does not replace the authenticated Designer or real canonical submission:

```bash
export SUBMISSION_RECONCILIATION_TOKEN="<server-owned secret>"

pnpm --filter @create-something/webflow-app-review-preflight-worker \
  verify:reconciliation -- \
  --api-base https://webflow-app-review-preflight.createsomething.workers.dev \
  --submission-id "<canonical submission ID>" \
  --receipt-id "<artifact receipt ID>" \
  --bundle "/absolute/path/to/exact-bundle.zip" \
  --source-maps "/absolute/path/to/exact-source-maps.zip"

unset SUBMISSION_RECONCILIATION_TOKEN
```

Save the JSON output in the approved private evidence location. It contains hashes and status, not the token or source contents.

## Step 3: Prove mismatch invalidation

Create a controlled negative copy by changing exactly one artifact while keeping the prior receipt ID. Submit that changed container through the canonical adapter under a new submission ID. Do not replace the prior matching evidence.

The result must show:

- `status: mismatch`
- `receiptValid: false`
- `enforcement: invalid`
- `mismatches` naming `bundle` or `source_maps`

Restore the original containers before runtime testing. A mismatch is successful negative evidence; it must never be converted to fail-open. Only an omitted receipt uses `receipt_not_provided` and `fail_open` during rollout.

## Step 4: Prepare the Runtime Test Package

Find the **Webflow runtime observation** card. Select **Prepare another test package** if an older package is already shown.

Enter each field carefully:

| Field                           | What to enter                                              | What it proves                                           |
| ------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Published Webflow test URL      | The dedicated site's published `https://...webflow.io` URL | The browser tested a real published Webflow site         |
| Webflow installation or site ID | The ID for that dedicated test site                        | The runtime license belongs to the named installation    |
| Immutable runtime URL           | The exact production JavaScript URL                        | The review points to one runtime file                    |
| SHA-256                         | The lowercase SHA-256 for the runtime bytes                | The executed file matches the reviewed file              |
| Script integrity (SRI)          | The `sha256-...` integrity value for those same bytes      | The page pins the script in the browser                  |
| Ready selector                  | A CSS selector added when the runtime is ready             | The runtime finished loading and reached its ready state |
| Proxy probe URL template        | The approved proxy template with the canary placeholder    | The proxy refuses an arbitrary destination               |

Review the values before you continue. A previous setup may be loaded for convenience, but the loaded values are still test input. They are not evidence.

1. Select **Prepare Webflow run**.
2. Read the **Confirm dedicated test access** dialog.
3. Select **Confirm test package**.

The card should show **Test package ready** and a shortened bundle SHA.

### Get SHA-256 and SRI from the same runtime file

If the runtime URL is public, download it once and calculate both values from that file:

```bash
export RUNTIME_URL="https://cdn.example.com/runtime/version/runtime.js"
curl -fsSL "$RUNTIME_URL" -o /tmp/app-review-runtime.js
shasum -a 256 /tmp/app-review-runtime.js
openssl dgst -sha256 -binary /tmp/app-review-runtime.js | openssl base64 -A
```

Use the 64-character value from `shasum` as **SHA-256**. Add `sha256-` before the Base64 value from `openssl` and use the result as **Script integrity (SRI)**.

Both values must describe the exact bytes served by the runtime URL. If a later download produces different values, the URL is not immutable enough for this package.

For a ready selector, prefer one clear marker such as `[data-runtime-ready]`. The runtime must add that marker only after it is ready for review.

The proxy template must contain `{canaryUrl}` where the test URL belongs. Do not replace the placeholder yourself.

### When to create a new package

Create a new package when any of these values changes:

- bundle SHA-256
- review-version ID
- published test site
- site or installation ID
- runtime URL
- runtime SHA-256 or SRI
- ready selector
- proxy-check URL

Do not create a new package merely because you want to run the same test again.

## Step 5: Run the developer test twice

### First run

1. Confirm the dedicated test site is published and available.
2. Select **Run test now**.
3. Wait while the card shows `approved`, `running`, or `uploading`.
4. Select **Check run status** until the run finishes.
5. Record the observation job ID and result.

The server creates a fresh E2B sandbox and opens the published site. Your local browser does not create the review evidence.

### Second run

1. Confirm the first run is finished.
2. Keep the same Runtime Test Package.
3. Select **Run test again**.
4. Select **Check run status** until the second run finishes.
5. Record the second observation job ID and result.

The two job IDs must be different. The package ID, review-version ID, and bundle SHA-256 must remain the same.

Two quick clicks do not create two runs. The server returns the one active job until that job is finished.

## Step 6: Ask a reviewer to replay the package

A reviewer uses a separate identity and a server-owned workspace.

1. Sign in with a configured reviewer identity.
2. Open the same review and Runtime Test Package.
3. Select **Create reviewer workspace**.
4. Select **Open reviewer workspace**.
5. Compare the package details with the two developer runs.
6. Select **Run independent replay**.
7. Select **Refresh status** until the replay finishes.
8. Record the reviewer observation job ID and result.

The reviewer replay must use the same package ID, review-version ID, and bundle SHA-256. It creates a third job and does not replace either developer run.

## Step 7: Read the result

### Runtime security

| Result                       | Meaning                                                 | Your next move                                     |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| **Runtime security passed**  | Every required runtime check passed in this browser run | Record the result and continue the three-run loop  |
| **Runtime security blocked** | One or more runtime checks failed                       | Open the blocker details and fix the named problem |

The app checks each fact separately:

- the browser reached the published site
- the ready selector appeared
- the page loaded the pinned runtime
- the executed runtime matched the SHA-256
- the script tag matched the SRI
- the runtime did not create new script elements
- no unreviewed child script appeared
- the proxy canary was blocked

A blocked result is useful evidence. It means the browser ran, but the app did not meet one or more runtime rules.

### Proxy canary

| Result                        | Meaning                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| **Proxy canary blocked**      | Expected result; the proxy refused the canary destination               |
| **Proxy canary exposed**      | Security blocker; the proxy allowed the canary destination              |
| **Proxy canary inconclusive** | The check failed to reach a clear result; investigate before continuing |

### Evidence artifacts

Open **Evidence artifact details** to see the saved artifact types, sizes, and SHA-256 values. These values let a reviewer confirm that the evidence was stored without trusting a screenshot or developer report.

Do not read **Evidence captured by Webflow** as an approval. It only tells you who controlled the browser and evidence path.

## Step 8: Decide whether the validation is complete

The production-runtime validation is complete when you have:

- two consecutive authenticated Designer-to-canonical artifact runs with exact matching hashes
- one controlled mismatch run marked invalid
- receipt evidence with artifact-set version, bundle and map hashes, policy version, and passing scan state
- two completed developer jobs for one Runtime Test Package
- one completed reviewer replay for that same package
- three different observation job IDs
- the same review-version ID and bundle SHA-256 on all three jobs
- `webflow_observed` evidence on all three jobs
- a security result and proxy result for all three jobs
- verified E2B sandbox termination for every sandbox that started

Choose one summary:

| Summary                     | Use it when                                      |
| --------------------------- | ------------------------------------------------ |
| `reproduced_pass`           | All three runs passed the same runtime checks    |
| `reproduced_block`          | All three runs reported the same blocker         |
| `mixed_evidence`            | The runs disagree and need manual investigation  |
| `infrastructure_incomplete` | One or more runs did not return trusted evidence |

Only the external review process can approve or reject the app.

Record one final evidence row for each run:

| Run | Required identity | Required result |
| --- | --- | --- |
| Artifact match A | review version, receipt, artifact-set version, form submission, bundle hash, map hash | `matched` and `verified` |
| Artifact match B | same fields with a distinct form submission | `matched` and `verified` |
| Artifact mismatch | prior receipt plus the changed artifact hash | `mismatch` and `invalid` |
| Runtime developer A | package, observation job, bundle hash, runtime hash/SRI | completed security and proxy result |
| Runtime developer B | same package and bundle, distinct job | completed security and proxy result |
| Runtime reviewer | same package and bundle, distinct reviewer job | completed security and proxy result |

The artifact receipt proves the official form received the reviewed private containers. The runtime observation separately proves what the published site loaded and executed. Neither proof substitutes for the other.

## If the app does not move forward

Use the state shown in the app:

| State          | What it means                                  | What to do                                                        |
| -------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| No observation | The package is ready but no browser has run    | Select **Run test now**                                           |
| `approved`     | The server created a job                       | Wait, then check status                                           |
| `running`      | The remote browser is testing the site         | Wait, then check status                                           |
| `uploading`    | The server is checking and saving the evidence | Wait; do not start another run                                    |
| `complete`     | Trusted evidence was saved                     | Read the result and record the receipt                            |
| `failed`       | The sandbox or runner did not finish           | Read the safe error, then ask an operator to check the service    |
| `expired`      | The package or 15-minute job window ended      | Refresh; prepare a new package only if the package itself expired |
| `revoked`      | The package or job is no longer allowed        | Ask a reviewer why it was revoked before continuing               |

### App problem or service problem?

- A named runtime predicate is an **app result**. Fix the bundle, runtime, site, or package input.
- A sandbox launch, runner start, upload, or termination error is a **service problem**. Keep the package and ask an operator to inspect the service.

Do not change the app merely to make a service error disappear.

## Stop and ask for help when

- you cannot prove which bundle or runtime is under test
- the review-version ID or bundle SHA changes between runs
- another job remains `approved`, `running`, or `uploading`
- a prior E2B sandbox is not verified as terminated
- the reviewer workspace opens a different package
- the developer and reviewer runs disagree
- the proxy canary is exposed or inconclusive
- anyone asks you to upload, edit, or relabel observed evidence
- anyone describes a Preflight result as an official decision

Record the IDs you can see before asking for help. Do not create more packages or jobs to hide an unclear state.

## Why the app keeps each role separate

The developer benefits from a pass, so the developer cannot control the browser that earns trusted evidence. Webflow's server runs the browser. The reviewer then repeats the test without changing the package.

| Actor                   | What they control                                   | What they cannot control                     |
| ----------------------- | --------------------------------------------------- | -------------------------------------------- |
| Developer               | Bundle, test site, package input, run request       | Runner key, evidence upload, reviewer replay |
| Reviewer                | Package inspection and replay request               | Package bindings or evidence upload          |
| Webflow runtime service | Job, E2B browser, evidence checks, artifact storage | Official review decision                     |

This makes preserving the package the best move for everyone. A developer gains nothing by changing local output because local output cannot earn `webflow_observed` status. A reviewer gains confidence by replaying the same package.

The system prefers a clear block to a false pass. A block can be fixed. False evidence can mislead a review.

## Operator-only service check

You do not need this section to use the app. Use it only if you manage the Preflight Worker and a run is stuck or reports a service problem.

Check the package's jobs in D1:

```sql
SELECT
  j.id AS observation_job_id,
  j.test_package_id,
  j.status,
  j.evidence_trust,
  j.approved_at,
  j.consumed_at,
  j.expires_at,
  j.sandbox_id,
  j.sandbox_started_at,
  j.sandbox_termination_status,
  j.sandbox_terminated_at
FROM runtime_observation_jobs AS j
WHERE j.test_package_id = '<runtime-test-package-id>'
ORDER BY j.created_at ASC;
```

Do not start another run while a job is `approved`, `running`, or `uploading`. If a sandbox started, its termination status must be `verified` before the next run.

The scheduled Worker task expires stale jobs and retries sandbox termination. Never construct or upload evidence by hand.

## Validation receipt

Copy this block after the three-run loop:

```text
review_id:
review_version_id:
bundle_sha256:
runtime_test_package_id:
developer_job_ids:
reviewer_replay_job_id:
security_results:
security_blockers:
proxy_results:
artifact_counts:
artifact_sha256s:
all_sandboxes_terminated: true | false
result: reproduced_pass | reproduced_block | mixed_evidence | infrastructure_incomplete
official_decision: null
operator:
notes:
```

## Performance content lint

### Reader outcome

Write for a junior practitioner who is learning how to validate a production runtime with this app. They know basic Webflow and browser ideas. They should not need prior knowledge of E2B, D1, R2, the evidence model, or this project's history.

The reader should be able to:

1. prepare the correct inputs
2. complete the developer and reviewer paths
3. explain what each result means
4. tell an app problem from a service problem
5. know when to stop and ask for help

A readability formula may flag a sudden jump in density. It does not define the reader or prove that the guide is clear or enjoyable.

Ask a new junior practitioner to rate each statement from 1 to 5:

1. I know what this app helps me prove.
2. I know what to enter and where to enter it.
3. I can picture what happens after I select **Run test now**.
4. I know what to do when a result is blocked or failed.
5. I could explain the validation process to another junior teammate.

The target is an average of at least 4 out of 5, with no statement below 3.

### Policy packs

Apply three packs in order. A later pack adds context; it does not weaken an earlier one.

#### 1. Core clarity and readability

- Put the learner's action before system background.
- Prefer a concrete verb over an abstract label.
- Explain what a system does before naming it.
- Split sentences above 25 words unless the longer form is easier to follow.
- Review blocks that are much denser than the prose around them.
- Do not use a fixed school-grade score as the acceptance target.
- Explain owned terms before placing several of them in one sentence.
- Break dense noun stacks into actions such as “List,” “Check,” or “Show.”
- Flag jargon, vague claims, and unsupported claims even when a formula passes.

#### 2. Performance meaning

- Keep `ready`, `running`, `blocked`, `complete`, and `failed` meanings stable.
- Name the pressure: time, identity, package drift, evidence quality, or sandbox cleanup.
- Put the boundary beside the action it limits.
- Put proof beside the claim it supports.
- Lead with the learner's consequence before the mechanism.

#### 3. App-guide overlay

- Use the exact labels the learner sees in the app.
- Give each numbered step one visible action.
- Tell the learner what a successful step looks like.
- Pair every failure with a safe next move.
- Define internal terms at first use.
- Keep secrets out of examples.
- Use “evidence,” never “approval,” for Preflight output.

### Rollout rule

Enforce these checks on changed prose first. Report older failures as a backlog until they are edited. This keeps new writing from adding debt without forcing unrelated rewrites into one change.
