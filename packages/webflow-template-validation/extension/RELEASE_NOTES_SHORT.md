# Webflow Way Validator v1.3.12

## Changes/Fixes

- Faster runs on large sites: the Validator reads variables, components, styles and pages eight at a time, not one at a time.
- The progress bar moves during the read and says what is being read ("Reading components (120 of 377)...").
- No change to checks or findings.

## Worker pairing

No Worker change required. Works with Worker 2.13.2.
