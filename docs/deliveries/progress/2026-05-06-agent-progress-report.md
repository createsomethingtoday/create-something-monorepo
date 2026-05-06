# Delivery Agent Progress Report

**Generated:** 2026-05-06
**Agent:** Delivery Update Agent
**Mode:** draft_and_stage
**Source of truth:** monorepo

## Current Position

Agents can generate and stage delivery updates automatically from the monorepo. They should not send client messages, publish public case studies, promote private portals, or change scope language without human approval.

## Project Status

| Project | Client | Audience | Components | Missing Evidence | Image 2 | Latest Update |
| --- | --- | --- | ---: | ---: | --- | --- |
| Abundance Nurse Staffing System | The NP Group | client_summary | 3 | 0 | blocked | [2026-05-06-project-update.md](../abundance/2026-05-06-project-update.md) |

## Automatic Actions Allowed

- read_delivery_project_manifests
- validate_evidence_paths
- generate_project_update_markdown
- generate_deterministic_evidence_images
- write_image2_prompts
- attempt_image2_generation_when_requested
- generate_operator_progress_report
- record_loom_evidence

## Human Approval Required

- send_client_email_or_message
- publish_public_case_study
- promote_to_client_portal
- include_real_client_data
- include_credentials_or_secrets
- change_project_scope_or_commercial_commitments
- downgrade_image_model_when_gpt_image_2_is_blocked

## Blocked Content

- secrets
- raw_bearer_tokens
- raw_api_keys
- PHI
- unredacted_candidate_or_patient_data
- unapproved_client_private_data
- fake_screenshots_presented_as_real_product_state

## Delivery Surfaces

| Surface | Status | Visibility | Rule |
| --- | --- | --- | --- |
| repo_markdown | active | operator | docs/deliveries |
| cloudflare_delivery_page | planned | client_summary | Render from generated delivery artifacts and manifests. |
| retool_operator_console | optional | private_internal | Use for operator/admin surfaces, not durable delivery truth. |

## Next Operator Decisions

- Decide whether the NPG delivery URL should remain on public Pages or move behind private-link or authenticated access.
- Finish brand/image alignment before replacing deterministic evidence images with Image 2 assets.
- Verify OpenAI organization access for `gpt-image-2`, then rerun the Image 2 delivery command.
- Decide the first client portal auth mode: private link, magic link, or authenticated account.

## Regenerate

```bash
pnpm delivery:progress
```
