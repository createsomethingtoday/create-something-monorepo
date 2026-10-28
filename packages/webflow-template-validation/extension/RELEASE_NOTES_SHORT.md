# Webflow Way Validator v1.3.8

## Changes/Fixes

- Restores the last report only for the site that produced it; earlier builds could show a different site's report and URL when the panel opened on another site.
- Keeps the Fix List per site and clears the old global entries on first load.
- Validator script setup and Designer validation errors now say why the request failed (server status, timeout, or blocked network).

## Worker pairing

No Worker change required. Works with Worker 2.5.3.
