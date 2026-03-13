# Webflow Template Schema

Updated JSON-LD structured data for Webflow template detail pages.

## Files

| File | Purpose |
|------|---------|
| `template-detail-schema.json` | Clean JSON schema (for reference/validation) |
| `template-detail-head-code.html` | Full embed code for Webflow custom head code |

## Changes from Original

### 1. Breadcrumb URL Pattern Fix
```diff
- "https://webflow.com/templates/tag/{{primary-tag:slug}}"
+ "https://webflow.com/templates/category/{{primary-tag:slug}}"
```

### 2. Empty Primary Tag Issue

**Problem**: When templates lack a `primary-tag`, breadcrumb position 2 renders with empty values.

**Remaining action required**: Ensure all templates in the CMS have a `primary-tag` assigned. The schema now uses the correct `/category/` URL pattern, but empty values will still cause validation errors.

**Options to fully resolve**:
1. Make `primary-tag` a required field in the CMS
2. Run a data cleanup to assign categories to all existing templates
3. Use Webflow's conditional visibility to hide the entire breadcrumb block when `primary-tag` is empty

## Related Beads Issues

- `csm-ncku` — Strip creator-injected JSON-LD schema from template previews
- `csm-80wu` — Fix empty breadcrumb category on template detail pages
- `csm-9lzv` — Update breadcrumb URL pattern from /tag/ to /category/

## Usage

Copy the contents of `template-detail-head-code.html` into the Webflow CMS template's custom head code section, replacing the existing structured data block.
