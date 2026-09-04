# Marketing Screenshot Image Workflow

Use this workflow when a real product screenshot is the evidence object inside
a public marketing image. The screenshot remains deterministic evidence; the
surrounding copy and framing are authored layers rather than generated UI.

## Public contract

```bash
pnpm marketing:image:screenshot -- \
  --input "/absolute/path/to/screenshot.png" \
  --output-dir "packages/agency/content/assets/brand/example.v20260904" \
  --slug "example" \
  --redact "0.40,0.39,0.40,0.34" \
  --headline "Find the market before you recruit it." \
  --dek "Nationwide provider coverage with verification gates." \
  --proof "Market coverage" \
  --owner "CREATE SOMETHING" \
  --review-status "approved" \
  --rights-note "Operator-captured product evidence." \
  --source-url "https://example.com/source" \
  --checked-date "2026-09-04" \
  --refresh-due "2026-09-11"
```

Coordinates use normalized `x,y,width,height` values from 0 to 1. Repeat
`--redact` for every region and `--proof` for up to three proof labels. An
optional `--background` image can supply a generated or photographed backdrop;
the screenshot is still composited afterward as the evidence layer.

The command emits:

- `<slug>-redacted.png`: source-resolution evidence with opaque redactions.
- `<slug>-linkedin.png`: a 1080×1350 LinkedIn composition.
- `<slug>-manifest.json`: source URL, review dates, coordinates, copy, dimensions,
  and SHA-256 hashes.

## Approval gate

Before publishing:

1. Inspect the redacted source at full resolution.
2. Confirm names, contact information, tokens, private prompts, and client-only
   data are absent.
3. Confirm the headline does not overstate what the screenshot proves.
4. Check the final composition at 50% size.
5. Preserve the generated manifest beside the image.

`--allow-unredacted` is an explicit exception for screenshots already confirmed
to contain no sensitive or identifying information. It is not the default.
