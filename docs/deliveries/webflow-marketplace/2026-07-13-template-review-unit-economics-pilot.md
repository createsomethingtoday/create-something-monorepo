# Template Review single-case unit-economics pilot

Date: July 13, 2026

Linear: CRE-1237

Implementation: CRE-1236 / PR 950

Classification: live single-case provider-cost observation

## Decision

One private blind case completed the direct E2B evidence collector and the GPT-5.5 shadow reviewer. The measured provider cost for that completed packet was **USD 0.111723457**.

This is not evidence of human time saved, annual capacity value, or cash savings. The sample size is one. Private template, reviewer, URL, and historical outcome details are intentionally omitted.

## Observed receipt

| Lane | Runtime | Usage | Measured provider cost |
|---|---:|---|---:|
| Direct E2B evidence collection | 32.661 seconds | 2 vCPU, 2 GiB RAM; model tokens not applicable | USD 0.001208457 |
| GPT-5.5 shadow reviewer | 44.956 seconds | 5,321 input; 0 cached input; 2,797 output; 516 reasoning tokens included in output | USD 0.110515 |
| Completed packet | 77.617 seconds of sequential active stages | 99.537 seconds end-to-end elapsed | USD 0.111723457 |

The elapsed duration includes the coordinator handoff between the collector completing and the reviewer request starting. The sequential active duration sums only the two measured provider stages.

## Rate-card calculation

Rate card checked July 13, 2026:

- E2B CPU: USD 0.000014 per vCPU-second.
- E2B memory: USD 0.0000045 per GiB-second.
- GPT-5.5 input: USD 5.00 per million tokens.
- GPT-5.5 cached input: USD 0.50 per million tokens.
- GPT-5.5 output: USD 30.00 per million tokens.

Calculations:

```text
E2B = 32.661 × ((2 × 0.000014) + (2 × 0.0000045))
    = USD 0.001208457

GPT-5.5 = (5,321 × 5.00 + 0 × 0.50 + 2,797 × 30.00) / 1,000,000
        = USD 0.110515

Measured packet provider cost = 0.001208457 + 0.110515
                              = USD 0.111723457
```

Reasoning tokens are included within output tokens and are not priced twice.

Sources:

- [E2B pricing](https://e2b.dev/pricing)
- [E2B billing](https://e2b.dev/docs/billing)
- [GPT-5.5 model pricing](https://developers.openai.com/api/docs/models/gpt-5.5)

## What remains unmeasured

- storage and external tool cost;
- failed-retry usage outside the successful response receipt;
- recurring maintenance cost;
- human objective-check time before assistance;
- human verification time after the packet is available;
- eligible annual review volume for this exact lane;
- realized annual cash savings.

A tiny multimodal readiness request was also sent before the matched reviewer run. Its usage was not captured by the packet receipt and is excluded from the per-packet cost above.

## Safety and privacy

- Airtable was read only.
- No review status, rating, feedback, approval, rejection, D1, R2, Dify, or production write occurred.
- The model prompt excluded private historical outcomes.
- Raw receipts and private joined artifacts remain local under `/tmp/cre-1237-*` and are not committed.
