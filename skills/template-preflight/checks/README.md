# Published-site scanner

Run the installed shell entrypoint; it delegates to the adjacent Python file and needs Python 3.10+ (no third-party dependencies). `aspell` is optional.

```bash
./checks/published-site-checks.sh https://aurae-temlis.webflow.io --template-name Aurae --json /tmp/aurae-preflight.json
python3 -m unittest discover -s checks/tests
```

Additional page paths may follow the URL. `--timeout` (or legacy `CURL_TIMEOUT`) bounds each request. `--max-pages` defaults to 200. A limit hit or failed discovered page is a FAIL. Sitemap indexes are bounded at 20 documents with an incomplete-coverage FAIL if exceeded. Crawl is same-origin, recursively follows links, includes utility pages and sitemap entries, removes fragments, preserves query strings, and coalesces actual redirects. It does not assume /page and /page/ are equivalent unless redirected.

Exit 0 means no automated FAILs; it does not resolve MANUAL checks or approve submission. Nonzero is the failure count capped at 255; argument/runtime errors use 2. JSON includes scanned pages, aliases, findings and failure count. HTML body responses are bounded to 5MB. Requests are read-only GET/HEAD; forms are never submitted.

Evidence boundaries:
- Match the PAGE inventory against the Designer and all CMS items. Unlinked pages absent from a sitemap require explicit paths.
- Footer checks parse ancestry and the actual URL origin/path; CSS visibility still requires rendered review.
- Image width AND height must be positive, or a verified ratio box is needed. Inline and matching stylesheet ratio evidence is MANUAL because layout cannot be proven from declarations. CSS matching is a candidate heuristic, not a cascade engine; imports and complex selectors may need a recorded Designer exception. Missing attributes alone must not be reported as final rejection when a ratio box is proven.
- Every page with images gets a MANUAL loading check; no DOM-order guess about the fold. Alt meaning and brands in pixels also remain manual.
- License boilerplate is exact decoded text, once, before substantive body content after headings/chrome. Source links are candidates only; per-font/image/icon coverage requires asset inventory.
- Form labels are individually associated. Plain name/Name is valid. Default messages fail, but runtime submit feedback is always an explicit authorized manual test.
- Copy is parsed without head, scripts, styles, comments, templates, noscript or SVG. CSS-only visibility and context remain review questions.
- OG URL extension checks do not prove image dimensions or actual response format. Image weights sample up to 12 source URLs; responsive sources, CSS backgrounds and remaining assets require inventory review.
- Homepage title uses exact required suffix; inner pages need the same name and separator, without requiring the homepage suffix.

Criteria reference verified 2026-09-07: https://webflow.com/templates/submission-guidelines. Keep raw reports when criteria or published pages change; a live site's findings are not a scanner test failure.

Image-dimension failures are aggregated once per affected page, with counts and up to three examples. JSON findings retain every affected image under `items` and the total under `affected_count`. Failure totals count findings, not individual images.

Lenis smooth scrolling is an allowed custom-code exception. The scanner recognizes `lenis` and legacy `@studio-freight/lenis` distribution scripts on unpkg and jsDelivr npm URLs. Other hosts or bundled copies still need manual source verification; a filename containing “lenis” does not exempt unrelated code. Package URL formats follow the [Lenis installation documentation](https://github.com/darkroomengineering/lenis#installation).
