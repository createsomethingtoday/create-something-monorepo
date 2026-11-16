# Webflow Way Validator v1.3.10

## Changes/Fixes

- Every blocking finding now lists the page it was found on and what was found, under "View affected page". Earlier builds left this out for some checks (promotional links, form names, Licenses link, trademark symbols).
- The copied report lists the same pages.

## Worker pairing

Works with Worker 2.13.1, which measures title and meta description length after decoding HTML entities such as `&amp;` and `&#x27;`.
