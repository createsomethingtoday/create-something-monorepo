# Canon production pipeline audit

Read-only audit of origin/main `70767b8d2fa2166a170b04c0af72cf04234c6409`, observed 2026-11-13. No source/index/branch mutation, package build, workflow dispatch, deployment, or external record write performed. Evidence file is the sole owned mutation.

## Promotion gate

Repository: createsomethingtoday/create-something-monorepo. Classic branch protection returns404 because protection is implemented by active ruleset17917451, “main multi-agent protection”. It applies to refs/heads/main and has no bypass actors; current user cannot bypass. Required:

- PR merge; no direct main push.
- Up-to-date branch (strict required checks).
- Checks `Require immutable action references` and `Public Distribution GA`.
- All review threads resolved.
- Zero mandatory approving reviews/code-owner reviews. Independent Sol review is still required by repository AGENTS instructions.
- Allowed merge methods: merge, squash or rebase.

The Svelte Strict Check workflow also triggers on Canon/package/Svelte changes. It installs frozen dependencies, builds mcp-core and composio-bridge, then runs `pnpm check` with workspace concurrency1 to avoid partially rebuilt Canon output. It is not one of the two ruleset-required status contexts, but remains applicable validation evidence.

## Agency

`.github/workflows/agency-pages-deploy.yml` triggers automatically for qualifying pushes to main (or codex/** previews). Canon source changes qualify via `scripts/agency-pages-deploy-eligibility.mjs`. A t3/** branch itself is not an automatic preview branch. Manual workflow_dispatch also qualifies. The workflow installs frozen dependencies, packages Canon/Tufte, builds Agency and runs a Ground release-parity/evidence gate before production deployment. Production command:

```sh
node scripts/run-wrangler.mjs --cwd packages/agency pages deploy .svelte-kit/cloudflare --project-name=create-something-agency --branch=main
```

Agency production deployment will be started by the merge push; do not start a duplicate manual Agency dispatch unless the qualifying automatic run is absent or failed for a diagnosed reason. Workflow production token preference is CLOUDFLARE_PAGES_API_TOKEN else CLOUDFLARE_API_TOKEN; account secret else variable. Repository secret names confirm CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID exist; secret values were not read.

### Ground prerequisite

Current Ground npm package version on origin/main is0.5.4. GitHub release `ground-v0.5.4` exists, published2026-11-01, tag resolves to `3694cf2c7ae1582a71211d2ab495552d33b7db86`. It has all five platform archives, platform smoke receipts, consumer smoke receipts, calibration receipt and SHA256SUMS/CONSUMER-SHA256SUMS required by Agency gate. A source diff between that tag and origin/main is empty across packages/ground and the gate's seven governed config/script/ledger paths. No Ground source release is needed for this Canon change. The CI run still validates npm metadata, checksums and receipt content; this audit did not run or bypass that gate.

Release: https://github.com/createsomethingtoday/create-something-monorepo/releases/tag/ground-v0.5.4

## IO, LTD, Space

`.github/workflows/property-pages-deploy.yml` only supports workflow_dispatch, must run from refs/heads/main, and comments explicitly reserve dispatch until independent review and merge. It maps the allowlisted property to these existing Pages projects:

| Input | Package | Pages project | Canonical domain |
| --- | --- | --- | --- |
| io | @create-something/io | create-something-io | https://createsomething.io |
| ltd | @create-something/ltd | createsomething-ltd | https://createsomething.ltd |
| space | @create-something/space | create-something-space | https://createsomething.space |

After reviewed merge, dispatch:

```sh
gh workflow run property-pages-deploy.yml --ref main -f property=io --repo createsomethingtoday/create-something-monorepo
gh workflow run property-pages-deploy.yml --ref main -f property=ltd --repo createsomethingtoday/create-something-monorepo
gh workflow run property-pages-deploy.yml --ref main -f property=space --repo createsomethingtoday/create-something-monorepo
```

Confirm main still equals the reviewed merge SHA before dispatch and record each run's actual headSha. The workflow only accepts main, not an arbitrary immutable SHA input; concurrent main advancement must therefore be checked. Each run checks out its resolved github.sha, installs frozen deps, builds auth-platform and Canon, checks/builds its property, captures previous production deployments and verifies clean tracked source before deploying with `--branch=main --commit-hash=$GITHUB_SHA`. Each distinct property has its own production concurrency group. No migration/data step runs for io/ltd/space (the workflow's D1 operation is LMS-only).

Canon has no wrangler configuration or standalone production deployment target in this scope. It is a shared packaged library consumed by the four property builds. Its /next routes are private package review fixtures; deployment of the approved shared system does not require inventing a standalone Canon service.

## Baselines and rollback

Authenticated Cloudflare plugin read succeeded for account `9645bd52e640b8a4f40a3a55ff1dd75a`; identity micah@createsomething.io. Shell CLOUDFLARE/WRANGLER env vars were absent. GitHub repository secrets are available to the existing workflows. No credential value was printed/read from secret storage. Cloudflare project/deployment reads require Pages Read or Pages Write; successful read establishes read access, not proof of write ability.

| Project | Current successful production ID | Commit | Created UTC |
| --- | --- | --- | --- |
| create-something-agency | bbee03b8-3b90-4eea-87be-51ff4917e731 | bf957d93d0eb72651e8f207eb48dcfb0f37007fa | 2026-11-13T19:11:20.795779Z |
| create-something-io | 13a41848-85f2-4a42-b4d6-f4ddf256df50 | beb8633a4a09d6fd17e4f9fdd2f71bb2f40bd7fb | 2026-11-11T23:46:53.49311Z |
| createsomething-ltd | ce0080d1-b22f-4584-b3d7-cad7f6843582 | 1eec3b7e4991ba4fe5d9da103a2f13edeee7261c | 2026-11-03T16:48:16.526663Z |
| create-something-space | e8db97a6-013e-4348-896d-f061e2a4a3a1 | 1eec3b7e4991ba4fe5d9da103a2f13edeee7261c | 2026-11-03T16:48:46.980557Z |

All four have production_branch main, latest_stage deploy/success, and www plus canonical domains. These identities are point-in-time baselines; re-read immediately before deployment if another owner has promoted meanwhile.

Cloudflare OpenAPI discovery confirms the rollback action:
`POST /accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/rollback`, requires Pages Write. The old successful production ID above is the target; preview deployments are invalid rollback targets. The operation switches production to that deployment. This audit did not invoke rollback. Page/code rollback does not imply reverting D1/KV/R2 data. Post-rollback read canonical_deployment and exercise the relevant canonical pages.

Official docs inspected: https://developers.cloudflare.com/pages/configuration/rollbacks/ and https://developers.cloudflare.com/workers/authorization/workers/ .

### Full read-only baseline metadata

```json
[
  {
    "name": "create-something-agency",
    "domains": [
      "create-something-agency.pages.dev",
      "createsomething.agency",
      "www.createsomething.agency"
    ],
    "production_branch": "main",
    "canonical_deployment": {
      "id": "bbee03b8-3b90-4eea-87be-51ff4917e731",
      "url": "https://bbee03b8.create-something-agency.pages.dev",
      "created_on": "2026-11-13T19:11:20.795779Z",
      "environment": "production",
      "latest_stage": {
        "name": "deploy",
        "started_on": null,
        "ended_on": "2026-11-13T19:11:27.975905Z",
        "status": "success"
      },
      "deployment_trigger": {
        "type": "ad_hoc",
        "metadata": {
          "branch": "main",
          "commit_hash": "bf957d93d0eb72651e8f207eb48dcfb0f37007fa",
          "commit_message": "feat(agency): polish NPG analyst workspace and motion (CRE-2437) (#2274)",
          "commit_dirty": false
        }
      }
    },
    "production_deployments": [
      {
        "id": "bbee03b8-3b90-4eea-87be-51ff4917e731",
        "url": "https://bbee03b8.create-something-agency.pages.dev",
        "created_on": "2026-11-13T19:11:20.795779Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-11-13T19:11:27.975905Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "bf957d93d0eb72651e8f207eb48dcfb0f37007fa",
            "commit_message": "feat(agency): polish NPG analyst workspace and motion (CRE-2437) (#2274)",
            "commit_dirty": false
          }
        }
      },
      {
        "id": "a4277bc6-0916-4427-a564-29b95ac45334",
        "url": "https://a4277bc6.create-something-agency.pages.dev",
        "created_on": "2026-11-12T19:55:00.074134Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-11-12T19:55:07.163039Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "b62d98906d3e8bf02ad3de9a587b16afa5a5301a",
            "commit_message": "Polish NPG chat, evidence, and exact review experience (#2261)\r\n\r\n* Polish NPG research workspace and exact review flow\r\n\r\n* Refine NPG composer, typography, and state colors",
            "commit_dirty": false
          }
        }
      },
      {
        "id": "d9b7f97c-d82c-45ad-aeab-286f5c84ca36",
        "url": "https://d9b7f97c.create-something-agency.pages.dev",
        "created_on": "2026-11-12T16:38:55.392086Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-11-12T16:39:01.189887Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "39246f50408d7016ebaa63871a82799d110543fb",
            "commit_message": "feat(agency): publish connected-work lab demo (#2259)",
            "commit_dirty": false
          }
        }
      }
    ]
  },
  {
    "name": "create-something-io",
    "domains": [
      "create-something-io.pages.dev",
      "createsomething.io",
      "www.createsomething.io"
    ],
    "production_branch": "main",
    "canonical_deployment": {
      "id": "13a41848-85f2-4a42-b4d6-f4ddf256df50",
      "url": "https://13a41848.create-something-io.pages.dev",
      "created_on": "2026-11-11T23:46:53.49311Z",
      "environment": "production",
      "latest_stage": {
        "name": "deploy",
        "started_on": null,
        "ended_on": "2026-11-11T23:46:58.243878Z",
        "status": "success"
      },
      "deployment_trigger": {
        "type": "ad_hoc",
        "metadata": {
          "branch": "main",
          "commit_hash": "beb8633a4a09d6fd17e4f9fdd2f71bb2f40bd7fb",
          "commit_message": "CRE-2415 reviewed audience scorecard and authoritative scheduler outcomes",
          "commit_dirty": false
        }
      }
    },
    "production_deployments": [
      {
        "id": "13a41848-85f2-4a42-b4d6-f4ddf256df50",
        "url": "https://13a41848.create-something-io.pages.dev",
        "created_on": "2026-11-11T23:46:53.49311Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-11-11T23:46:58.243878Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "beb8633a4a09d6fd17e4f9fdd2f71bb2f40bd7fb",
            "commit_message": "CRE-2415 reviewed audience scorecard and authoritative scheduler outcomes",
            "commit_dirty": false
          }
        }
      },
      {
        "id": "564b8c1c-f3d2-4231-b487-4d75822303fa",
        "url": "https://564b8c1c.create-something-io.pages.dev",
        "created_on": "2026-11-06T19:19:25.966924Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-11-06T19:19:30.388206Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "b3f7310ec886e3543159d5e3d613d9d3f18ed13c",
            "commit_message": "Replace retiring analytics model",
            "commit_dirty": false
          }
        }
      },
      {
        "id": "9944c69b-71cb-4af8-bb1e-fd9d4a601d63",
        "url": "https://9944c69b.create-something-io.pages.dev",
        "created_on": "2026-11-03T19:18:50.208889Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-11-03T19:18:54.655046Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "0d838edab578d69da8be918645897dc2cdfb685c",
            "commit_message": "Merge pull request #2172 from createsomethingtoday/codex/cre-2337-newsletter\r\n\r\nMake newsletter editions governed and attribute confirmed signups",
            "commit_dirty": false
          }
        }
      }
    ]
  },
  {
    "name": "createsomething-ltd",
    "domains": [
      "createsomething-ltd.pages.dev",
      "createsomething.ltd",
      "www.createsomething.ltd"
    ],
    "production_branch": "main",
    "canonical_deployment": {
      "id": "ce0080d1-b22f-4584-b3d7-cad7f6843582",
      "url": "https://ce0080d1.createsomething-ltd.pages.dev",
      "created_on": "2026-11-03T16:48:16.526663Z",
      "environment": "production",
      "latest_stage": {
        "name": "deploy",
        "started_on": null,
        "ended_on": "2026-11-03T16:48:20.424805Z",
        "status": "success"
      },
      "deployment_trigger": {
        "type": "ad_hoc",
        "metadata": {
          "branch": "main",
          "commit_hash": "1eec3b7e4991ba4fe5d9da103a2f13edeee7261c",
          "commit_message": "Fix SEO offer metadata and add scoped search-impact reporting (#2171)\r\n\r\n* fix(seo): validate service prices and scope search impact reporting\r\n\r\n* fix(analytics): redact protected paths and record Search Console evidence",
          "commit_dirty": false
        }
      }
    },
    "production_deployments": [
      {
        "id": "ce0080d1-b22f-4584-b3d7-cad7f6843582",
        "url": "https://ce0080d1.createsomething-ltd.pages.dev",
        "created_on": "2026-11-03T16:48:16.526663Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-11-03T16:48:20.424805Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "1eec3b7e4991ba4fe5d9da103a2f13edeee7261c",
            "commit_message": "Fix SEO offer metadata and add scoped search-impact reporting (#2171)\r\n\r\n* fix(seo): validate service prices and scope search impact reporting\r\n\r\n* fix(analytics): redact protected paths and record Search Console evidence",
            "commit_dirty": false
          }
        }
      },
      {
        "id": "8e1dee89-7840-43e1-8ee8-1f9489bd95ee",
        "url": "https://8e1dee89.createsomething-ltd.pages.dev",
        "created_on": "2026-10-31T02:00:15.835806Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-10-31T02:00:18.857092Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "9a4a1e2aa8058073f6753a09e2e390c20f105086",
            "commit_message": "Migrate TASTE discovery to authenticated Are.na v3 search (#2123)\r\n\r\n* Migrate TASTE discovery to operator-only Are.na v3 search\r\n\r\n* Preserve v3 plain text and configure Premium discovery operator",
            "commit_dirty": false
          }
        }
      },
      {
        "id": "174c14fe-dcea-4a08-aced-ab8f1e23722d",
        "url": "https://174c14fe.createsomething-ltd.pages.dev",
        "created_on": "2026-10-31T00:46:18.132545Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-10-31T00:46:21.069665Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "81dc2eec30af707bdc18af171e58358b1999faf1",
            "commit_message": "CRE-2297 TASTE provenance and design research",
            "commit_dirty": false
          }
        }
      }
    ]
  },
  {
    "name": "create-something-space",
    "domains": [
      "create-something-space.pages.dev",
      "createsomething.space",
      "www.createsomething.space"
    ],
    "production_branch": "main",
    "canonical_deployment": {
      "id": "e8db97a6-013e-4348-896d-f061e2a4a3a1",
      "url": "https://e8db97a6.create-something-space.pages.dev",
      "created_on": "2026-11-03T16:48:46.980557Z",
      "environment": "production",
      "latest_stage": {
        "name": "deploy",
        "started_on": null,
        "ended_on": "2026-11-03T16:48:50.590151Z",
        "status": "success"
      },
      "deployment_trigger": {
        "type": "ad_hoc",
        "metadata": {
          "branch": "main",
          "commit_hash": "1eec3b7e4991ba4fe5d9da103a2f13edeee7261c",
          "commit_message": "Fix SEO offer metadata and add scoped search-impact reporting (#2171)\r\n\r\n* fix(seo): validate service prices and scope search impact reporting\r\n\r\n* fix(analytics): redact protected paths and record Search Console evidence",
          "commit_dirty": false
        }
      }
    },
    "production_deployments": [
      {
        "id": "e8db97a6-013e-4348-896d-f061e2a4a3a1",
        "url": "https://e8db97a6.create-something-space.pages.dev",
        "created_on": "2026-11-03T16:48:46.980557Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-11-03T16:48:50.590151Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "1eec3b7e4991ba4fe5d9da103a2f13edeee7261c",
            "commit_message": "Fix SEO offer metadata and add scoped search-impact reporting (#2171)\r\n\r\n* fix(seo): validate service prices and scope search impact reporting\r\n\r\n* fix(analytics): redact protected paths and record Search Console evidence",
            "commit_dirty": false
          }
        }
      },
      {
        "id": "5f526f7b-a0a4-47c6-bf96-358670358a9f",
        "url": "https://5f526f7b.create-something-space.pages.dev",
        "created_on": "2026-10-23T17:47:20.534899Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-10-23T17:47:23.382005Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "4d64c5041c78c9f6bfac4c2c7bfe8cd3a0e50298",
            "commit_message": "Align .io, .ltd and .space with Agency visual stories (#2052)\r\n\r\n* feat(properties): align research library and workshop imagery\r\n\r\n* refine(properties): polish openings and interior continuity\r\n\r\n* fix(properties): keep mobile search clear of navigation\r\n\r\n* fix(properties): reserve mobile header space for public search\r\n\r\n* fix(properties): keep search above fixed navigation\r\n\r\n*\n\n[commit_message truncated]",
            "commit_dirty": false
          }
        }
      },
      {
        "id": "8c168670-813b-42bb-b45b-828ac3143c2e",
        "url": "https://8c168670.create-something-space.pages.dev",
        "created_on": "2026-10-20T04:46:45.084726Z",
        "environment": "production",
        "latest_stage": {
          "name": "deploy",
          "started_on": null,
          "ended_on": "2026-10-20T04:46:47.444521Z",
          "status": "success"
        },
        "deployment_trigger": {
          "type": "ad_hoc",
          "metadata": {
            "branch": "main",
            "commit_hash": "fa18b1c8345c768adfb1fd0b41ea31a222e6404d",
            "commit_message": "Direct public contact addresses to support@createsomething.io (#1998)\r\n\r\n* fix: direct public contact surfaces to support email\r\n\r\n* ci: serialize checks that rebuild shared Canon output",
            "commit_dirty": false
          }
        }
      }
    ]
  }
]
```

## Three gates for this audit

- Functional correctness: passed for read-only pipeline discovery and source/API readback; no app test/build or deployment performed.
- Perceptual/product quality: not applicable to pipeline discovery. Parent owns actual release output verification.
- Release readiness: infrastructure and required commands identified; final approved source revision, PR checks/review, merge, deployment and live acceptance remain parent-owned.
