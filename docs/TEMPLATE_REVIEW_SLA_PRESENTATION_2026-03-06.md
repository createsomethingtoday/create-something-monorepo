# Template Review SLA Analysis

Date: March 6, 2026

Scope:
- Airtable base: `👛Marketplace Assets` (`appMoIgXMTTTNIc3p`)
- Analysis window: submissions on or after January 1, 2025
- Asset scope: Template assets only
- End-to-end unit: `Assets`
- Cycle-level unit: `🖌️Asset Versions`

## How This Analysis Was Completed

This analysis was completed directly from live Airtable data accessed through the CREATE SOMETHING Hub using the Airtable Composio toolkit.

### Procedure

1. Confirmed Hub connectivity and Airtable row access through the deployed `mj.mcp` route.
2. Verified the correct Airtable base and resolved the relevant table identifiers:
   - `👛Assets` -> `tblRwzpWoLgE9MrUm`
   - `🖌️Asset Versions` -> `tblHxZ2hgSFLZxsZu`
3. Pulled `New Asset` review rows from `🖌️Asset Versions` for submissions on or after January 1, 2025.
4. Extracted the linked parent asset IDs from those version rows.
5. Read the linked parent asset records in batches from `👛Assets`.
6. Restricted the analysis population to parent assets where `⚙️🆎Type (Text) = 'Template🏗️'`.
7. Computed:
   - end-to-end SLA from `Assets.{📅Submitted Date}` to `Assets.{🚀📅Decision Date}`
   - cycle-level SLA from `Asset Versions.{📅Submission Datetime}` to `Asset Versions.{📅Decision Made Datetime}`
8. Segmented the results by:
   - review-cycle count
   - reviewer
   - outcome
   - quality bucket
   - normalized feedback bucket
9. Built the feedback taxonomy by normalizing `🚩Rejection Reason` and `✨Improvement Areas` into canonical issue buckets.
10. Added Airtable record links for spot-checking representative cases.

### Data Handling Choices

- The analysis window was limited to submissions on or after January 1, 2025 to avoid distortions from older legacy review records and process changes.
- Template scope was determined from the parent `Assets` record rather than the version row.
- End-to-end SLA and cycle-level SLA were treated as separate metrics because they answer different operational questions.
- Reviewer statistics were based on closed cycle-level rows only.
- Open states such as `In Review`, `Ready for Review`, and `Response to Review` were excluded from closed-cycle percentile calculations.
- Feedback categories were normalized into a smaller taxonomy so the results would not depend on inconsistent freeform phrasing.

### Validation Steps

- Confirmed that the linked parent asset for each included version row was a Template asset.
- Confirmed that representative slow and fast cases were traceable from version record to parent asset.
- Confirmed that multi-cycle counts on the asset record aligned with the end-to-end SLA interpretation.
- Confirmed that reviewer, quality, and feedback fields were present and usable in the live version records.

### Limitations

- The feedback taxonomy is normalized from semi-structured fields and reviewer text, so some edge cases still require human interpretation.
- Reviewer-level comparisons should be read as queue-shape indicators, not pure performance rankings.
- Airtable contains legacy and special-case records, so the chosen date window materially affects results.

## Executive Summary

The SLA story for Template reviews is primarily a multi-cycle approval story, not a simple reviewer-speed story.

Across `4,479` closed Template assets submitted since January 1, 2025, median end-to-end SLA was `8.5 days`, p75 was `14.9 days`, and p90 was `24.9 days`. The strongest driver of delay is review-cycle count:

- `0` cycles: median `5.1 days`
- `1` cycle: median `10.6 days`
- `2+` cycles: median `18.6 days`

Among assets above the p75 SLA threshold, `59.5%` had `2+` cycles, while only `21.0%` had `0` cycles. Quick rejection appears comparatively efficient. The longer SLA burden sits in approvals and iterative improvement paths.

At the cycle level, `UI/UX` and `Low quality` feedback are the clearest fast-reject patterns. `Guidelines`, `Graphic design`, `Responsive`, and `Accessibility` issues are more likely to create slower iterative approval paths.

## Leadership Summary

### Headline Numbers

- Closed Template assets: `4,479`
- Closed Template `New Asset` review rows: `4,460`
- Median end-to-end SLA: `8.5 days`
- p75 end-to-end SLA: `14.9 days`
- p90 end-to-end SLA: `24.9 days`

### Core Finding

Long SLA is mostly explained by repeat review cycles:

| Cycle bucket | Volume | Median days | p75 days | Approval rate |
|---|---:|---:|---:|---:|
| `0` | 2,360 | 5.1 | 8.2 | 52.9% |
| `1` | 1,129 | 10.6 | 13.6 | 91.1% |
| `2+` | 990 | 18.6 | 26.5 | 91.1% |

Slow-tail composition:

- Above p75 SLA threshold, `59.5%` of assets had `2+` cycles
- Above p75 SLA threshold, `21.0%` of assets had `0` cycles

### Business Implication

If the objective is to improve SLA, the highest-leverage intervention is reducing multi-cycle approvals and repeat submissions. Reviewer throughput alone will not move the metric nearly as much as improving first-pass quality and reducing the number of rounds needed to reach publishable quality.

## Statistical Findings

### Outcome Statistics

| Outcome | Volume | Median hours | p75 hours | Breach rate |
|---|---:|---:|---:|---:|
| `✅Approved` | 6,574 | 103 | 146 | 74.9% |
| `❌Rejected` | 1,821 | 92 | 131 | 64.2% |
| `☠️Archived` | 209 | 87 | 132 | 62.7% |
| `✅Approved (No Notification)` | 26 | 99.5 | 200 | 57.7% |

Interpretation:

- Approved work is slower than rejected work.
- Quick rejection is relatively efficient.
- Approval paths carry more of the operational SLA burden.

### Reviewer Statistics

| Reviewer | Volume | Median hrs | p75 hrs | p90 hrs | Breach rate | Rejection rate |
|---|---:|---:|---:|---:|---:|---:|
| Natalia Ledford | 2,109 | 104 | 142 | 174 | 78.4% | 11.1% |
| Sudiksha Khanduja | 1,518 | 102.5 | 144 | 201 | 74.4% | 8.3% |
| Mariana Segura | 1,328 | 103 | 134 | 169 | 74.5% | 45.2% |
| Meghan Martin | 1,074 | 78 | 113 | 149 | 54.7% | 29.3% |
| Eric Unger | 1,036 | 103 | 156 | 208 | 72.3% | 22.7% |
| Vicki Chen | 990 | 136 | 180 | 227 | 76.7% | 28.1% |
| Sónia Alves | 494 | 81 | 106 | 144 | 63.4% | 1.2% |

Interpretation:

- Mariana Segura’s queue is materially more rejection-heavy.
- Natalia Ledford and Sudiksha Khanduja are handling larger approval-heavy queues with similar medians.
- Vicki Chen’s queue is slower at the median and also more rejection-heavy than Natalia or Sudiksha.
- Meghan Martin and Sónia Alves are faster at the median, likely reflecting queue mix rather than pure efficiency alone.

### Quality Statistics

| Quality bucket | Volume | Median hrs | p75 hrs | Breach rate | Rejection rate |
|---|---:|---:|---:|---:|---:|
| `Good` | 5,757 | 103 | 147 | 74.8% | 0.3% |
| `Low quality` | 1,649 | 87 | 128 | 60.6% | 92.3% |
| `Exceptional` | 830 | 101.5 | 139 | 74.1% | 0.2% |
| `Satisfactory` | 271 | 113 | 163 | 84.5% | 67.9% |
| `Unknown` | 138 | 110.5 | 147 | 70.3% | 74.6% |

Interpretation:

- `Low quality` is faster and overwhelmingly rejected.
- `Good` and `Exceptional` are slower because they remain alive in approval workflows.
- `Satisfactory` is an unstable bucket: high breach, high rejection, and likely a strong predictor of iteration risk.

### Feedback Bucket Statistics

| Feedback type | Volume | Median hrs | p75 hrs | Breach rate | Rejection rate |
|---|---:|---:|---:|---:|---:|
| `None` | 4,431 | 98 | 138 | 72.4% | 0.0% |
| `UI/UX` | 1,275 | 84 | 123 | 59.0% | 92.9% |
| `Guidelines` | 1,140 | 118 | 151 | 79.9% | 14.9% |
| `Other` | 562 | 128 | 176 | 77.0% | 54.3% |
| `Graphic design` | 395 | 112 | 156 | 82.8% | 21.3% |
| `Design execution` | 321 | 101 | 149 | 70.7% | 22.4% |
| `Responsive` | 235 | 104 | 140 | 74.9% | 0.4% |
| `Accessibility` | 145 | 119 | 160 | 77.2% | 4.8% |
| `Technical` | 141 | 107 | 137 | 74.5% | 3.5% |

Interpretation:

- `UI/UX` is the clearest fast-reject bucket.
- `Guidelines` and `Graphic design` are slower and more iterative.
- `Responsive`, `Accessibility`, and `Technical` often appear in fixable approval-delay paths rather than immediate rejection.

## Operator Matrix

| Bucket | Subcategory | Definition | Typical reviewer language | Statistical pattern | Agent confidence | Human review needed | Typical outcome | Suggested remediation |
|---|---|---|---|---|---|---|---|---|
| `UI/UX` | Outdated visual style | Overall design feels dated or below marketplace quality | “outdated”, “older website”, “not modern”, “lacks visual appeal” | 1,275 rows, median 84h, rejection 92.9% | High | Low | Reject | Refresh visual direction and benchmark against current marketplace examples |
| `UI/UX` | Weak layout variety | Pages feel repetitive or structurally generic | “basic layouts”, “lacks interesting layouts”, “no wow factor” | Usually co-occurs with rejection-heavy UI/UX bucket | High | Low | Reject or changes | Add section variation and stronger page rhythm |
| `UI/UX` | Weak hierarchy | Content order and emphasis are unclear | “poor hierarchy”, “visual balance issues” | Common inside iterative design feedback | Medium | Medium | Changes | Improve spacing, grouping, and CTA emphasis |
| `UI/UX` | Weak interaction design | Product feels static or unconsidered | “lacks interesting interactions”, “flat” | Common secondary factor in slow approvals | Medium | Medium | Changes | Add purposeful interaction states |
| `Graphic Design` | Low-quality assets | Images or graphics reduce perceived quality | “blurry”, “pixelated”, “low-quality graphics” | 395 rows, median 112h, rejection 21.3% | High | Low | Changes or reject | Replace weak assets and improve consistency |
| `Graphic Design` | Inconsistent visual system | Styles or branding do not cohere | “mixed styles”, “inconsistent branding”, “disjointed visual experience” | Often tied to slower iteration path | High | Medium | Reject or changes | Unify image, icon, color, and illustration systems |
| `Graphic Design` | Disallowed imagery | Uses imagery patterns not permitted | “human cutouts”, “trademark logos” | Usually clear reject trigger when present | High | Low | Reject | Remove prohibited imagery |
| `Typography` | Readability problems | Font use harms comprehension | “tight kerning”, “display fonts for long texts” | Usually paired with UI/UX or accessibility | High | Medium | Changes or reject | Improve font pairing, legibility, and spacing |
| `Responsive Design` | Breakpoint adaptation failure | Layouts do not adapt intentionally across devices | “vertical stacking”, “poor responsiveness”, “not tailored for mobile” | 235 rows, median 104h, rejection 0.4% | High | Medium | Changes or slow approval | Design per breakpoint rather than stacking |
| `Responsive Design` | Media scaling issues | Images/components do not resize well | “image scaling”, “mobile issues” | Common approval-delay factor | High | Low | Changes | Rework image containers and component behavior |
| `Accessibility` | Contrast failure | Text/UI contrast is insufficient | “contrast issues”, “color contrast problems” | 145 rows, median 119h, rejection 4.8% | High | Medium | Changes or reject | Fix contrast pairs and validate against WCAG |
| `Accessibility` | Legibility failure | Text choices reduce accessibility | “hard to read”, “readability” | Often paired with typography concerns | Medium | Medium | Changes | Adjust size, line height, weight, and contrast |
| `Guidelines Compliance` | Naming/policy violation | Submission violates marketplace rules | “disallowed name”, “guideline infringement”, “webflow in URL/path” | 1,140 rows, median 118h, rejection 14.9% | High | Low | Reject or changes | Correct policy, naming, brand, and legal issues |
| `Guidelines Compliance` | Variable/system conventions | Internal build patterns fail policy expectations | “variable naming”, “Webflow Way not followed” | Slower, often iterative | High | Medium | Changes | Normalize naming and implementation conventions |
| `Guidelines Compliance` | Insufficient resubmission improvement | Creator resubmits without meaningful change | “submitted previously”, “no meaningful improvements” | Strong multi-cycle risk signal | High | Medium | Reject | Require substantial redesign before re-review |
| `Technical Requirements` | Functional failure | Product cannot be tested or used properly | “500 error”, “failed to install”, “broken” | 141 rows, median 107h, rejection 3.5% | High | Low | Reject | Fix production issues before resubmission |
| `Technical Requirements` | Missing required setup | Submission lacks required technical inputs | “missing client ID”, “invalid support URL” | Common pre-screen candidate | High | Low | Reject | Complete config, credentials, and QA |
| `Content / Metadata` | Metadata inconsistency | Supporting submission info is incomplete or wrong | “SEO mismatch”, “support URL invalid” | Usually fixable and should be pre-screened | High | Low | Changes or reject | Fix metadata and supporting links |
| `Other` | Mixed / nonstandard issue | Note does not fit cleanly or spans multiple buckets | custom reviewer wording | 562 rows, median 128h, rejection 54.3% | Low | High | Variable | Human review and relabel |

## Agent Tagging Rubric

Recommended classification order:

1. `Technical Requirements`
2. `Guidelines Compliance`
3. `Accessibility`
4. `Responsive Design`
5. `Typography`
6. `Graphic Design`
7. `UI/UX`
8. `Other`

Recommended extraction format:

- `primary_bucket`
- `secondary_tags` (up to 3)
- `severity`
- `predicted_outcome`
- `review_cycle_risk`

Recommended rules:

- `500 error`, `failed to install`, `missing client ID`, `invalid support URL` -> `Technical Requirements`
- `guideline`, `disallowed`, `trademark`, `policy`, `name violation`, `webflow in URL` -> `Guidelines Compliance`
- `contrast`, `readability`, `accessibility` -> `Accessibility`
- `responsive`, `mobile`, `vertical stacking`, `breakpoint` -> `Responsive Design`
- `kerning`, `display fonts for long text`, `typography` -> `Typography`
- `blurry`, `pixelated`, `mixed styles`, `human cutouts`, `visual cohesion` -> `Graphic Design`
- `outdated`, `basic layouts`, `generic`, `no wow factor`, `poor hierarchy`, `flat` -> `UI/UX`

Recommended model outputs:

- `likely_reject`
- `likely_iterative_approval`
- `likely_multi_cycle`
- `needs_human_review`

## Recommended Actions

### For Operators

- Use the matrix above as the canonical review taxonomy.
- Normalize freeform feedback into `primary_bucket` plus `secondary_tags`.
- Track repeat failure modes by creator and by reviewer.
- Pre-flag likely `multi-cycle` submissions before deeper review begins.

### For Leadership

- Prioritize first-pass quality improvement over throughput-only interventions.
- Reduce repeat review cycles through creator coaching and pre-screening.
- Use reviewer metrics as queue-shape indicators, not raw performance rankings.

### For Agent Enablement

Best immediate candidates for automation:

- Policy/guideline violation detection
- Technical pre-screening
- Feedback normalization into canonical buckets
- Multi-cycle risk scoring
- Creator repeat-pattern detection

Keep human review for:

- borderline design judgment
- novel failure modes
- policy exceptions
- mixed-bucket feedback that requires interpretation

## Evidence Appendix

Base and tables:

- Base: [Marketplace Assets](https://airtable.com/appMoIgXMTTTNIc3p)
- Assets table: [👛Assets](https://airtable.com/appMoIgXMTTTNIc3p/tblRwzpWoLgE9MrUm)
- Asset Versions table: [🖌️Asset Versions](https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu)

Representative records for operator validation:

### Fast 0-cycle approval

- Asset: [Petique](https://airtable.com/appMoIgXMTTTNIc3p/tblRwzpWoLgE9MrUm/rec00WQ0dZ3g8WpQG)
- Version: [Petique v0](https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/reckK8373eRd3cZyJ)

### Multi-cycle approval

- Asset: [Aisav](https://airtable.com/appMoIgXMTTTNIc3p/tblRwzpWoLgE9MrUm/rec00XZDTgwZuM0Hf)
- Version: [Aisav v0](https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/recuXZxRSKwLh4ltW)

### Another multi-cycle approval

- Asset: [Airbrick](https://airtable.com/appMoIgXMTTTNIc3p/tblRwzpWoLgE9MrUm/rec05LfhfoymtvmTi)
- Version: [Airbrick v0](https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/recZNfUF8qamkUFzT)

### Fast rejection

- Asset: [Buildify](https://airtable.com/appMoIgXMTTTNIc3p/tblRwzpWoLgE9MrUm/rec03kjph1UhvBTXA)
- Version: [Buildify v0](https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/rec5nPBYTKLb1O6dl)

### Low-quality rejection

- Asset: [GlideGate Rejected 8913mid5](https://airtable.com/appMoIgXMTTTNIc3p/tblRwzpWoLgE9MrUm/rec05EKfrnHlT3L2A)
- Version: [GlideGate v0](https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/recqkETQsL4bsHAjK)

### Operator validation checklist

- Confirm `📅Submitted Date` and `🚀📅Decision Date` on the asset record.
- Confirm `🖌️New Asset Review Cycles` on the asset record.
- Confirm `📅Submission Datetime` and `📅Decision Made Datetime` on the version record.
- Confirm reviewer, quality score, rejection reason, and improvement areas.
- For slow assets, confirm whether delay is explained by repeated cycles rather than a single long first-touch delay.

## Method Notes

- End-to-end SLA is defined as `Assets.{📅Submitted Date}` to `Assets.{🚀📅Decision Date}`.
- Cycle-level SLA is defined as `Asset Versions.{📅Submission Datetime}` to `Asset Versions.{📅Decision Made Datetime}`.
- Template scope is determined from `Assets.{⚙️🆎Type (Text)} = 'Template🏗️'`.
- Reviewer attribution at the cycle level comes from `Asset Versions.{📝Reviewer}`.
- Reviewer attribution at the terminal asset level comes from `Assets.{📝Latest Reviewer}`.
- Feedback buckets were normalized from `🚩Rejection Reason` plus `✨Improvement Areas`.
