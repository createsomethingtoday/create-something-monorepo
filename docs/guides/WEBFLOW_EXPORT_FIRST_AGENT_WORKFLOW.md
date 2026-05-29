# Webflow Export-First Agent Workflow

This guide codifies the current Webflow development rule for agent-assisted site edits and Code Component work:

> Use a fresh Webflow project export as the fastest local read model for layout, class, style, and asset analysis. Use MCP, Designer APIs, Data APIs, and Webflow CLI as the live mutation and publication layers.

This is a performance rule for agent work, not a claim about published-site runtime speed. The export reduces repeated high-latency inspection calls and gives the agent searchable files. It does not replace live Webflow state.

## Review Verdict

The hypothesis is directionally correct when the work depends on understanding existing structure or recreating native Webflow styling:

- local HTML/CSS/assets are easier to search, diff, and cross-reference than repeated MCP calls
- exported CSS preserves the class vocabulary, combo-class relationships, breakpoint rules, and interaction-adjacent selectors that a Code Component often needs to mimic
- exported HTML gives the agent a stable snapshot for structure comparison before making live edits
- MCP/API calls stay valuable for current element IDs, bindings, CMS data, variables, page metadata, localization, publication, and Designer-only context

Treat the export as a high-bandwidth cache of static design evidence. Treat the live Webflow project as the source of truth for mutation, bindings, dynamic data, and publish state.

## When To Prefer The Export

Use a fresh export early when the task includes:

- recreating a Webflow-native section, filter, card, nav, footer, or layout in React
- building or restyling a Webflow Code Component to match a native site surface
- aligning class names, combo classes, CSS variables, breakpoints, hover states, or asset references
- comparing a Code Component render against existing Webflow markup
- planning bulk element creation where the desired hierarchy is already present in a similar Webflow page

The export is especially useful when MCP/API inspection would require many calls across elements, styles, breakpoints, and assets. Local files let the agent use `rg`, structural search, CSS parsing, and normal diff tools before touching the live project.

## When To Prefer MCP/API First

Use MCP, Designer APIs, Data APIs, or direct Webflow tools first when the task depends on:

- selected element IDs, current page state, branches, comments, or Designer context
- CMS collections/items, collection bindings, ecommerce, membership, or user account data
- localization state, locale-specific content, or localized element settings
- variables as editable Webflow tokens rather than static CSS output
- live component props, component instances, slots, or bindings
- page metadata, publishing, script registration, assets, redirects, robots.txt, or webhooks
- small targeted edits where exporting the whole project would be slower than inspecting one element

Do not use exported files as the write path. Editing exported HTML/CSS does not update the Webflow project.

## Known Export Limits

Current Webflow code exports are static artifacts. They are useful evidence, but they omit or degrade several live features:

- CMS, Ecommerce, User Accounts, collection lists, and collection template content are not exported as working data surfaces
- localized pages, localized elements, and localized content are not included beyond the primary locale
- forms, file upload, reCAPTCHA, site search, password protection, and other hosted Webflow behaviors do not function as they do on Webflow hosting
- Code Components are not included in exported code
- exports can be stale immediately after a Designer edit, library share, CMS sync, branch merge, or publish

If any of these surfaces matter, pair the export with live MCP/API inspection and record which source supplied each conclusion.

## Recommended Agent Flow

1. Identify the target tier:
   - Database: exported files, live Webflow Data API, CMS, assets, variables, D1/Airtable mirrors
   - Automation: MCP/Designer tools, Webflow CLI, component bundle/share, workers
   - Judgment: style parity, binding safety, credential boundaries, publish readiness
2. Capture live coordinates with MCP/API:
   - site ID, page ID, selected element IDs, relevant component names, bindings, and current Designer state
3. Export the Webflow project when structure/style parity matters:
   - keep the export outside tracked source unless the user explicitly asks to commit it
   - name it with site/date/context so staleness is obvious
4. Analyze locally:
   - search HTML for native class names and element hierarchy
   - search CSS for class rules, breakpoints, hover states, variables, and asset URLs
   - map static export evidence to live MCP element/component IDs before mutation
5. Implement through the correct live surface:
   - Code Components: edit the React component and `.webflow.tsx` definition, then bundle/share through Webflow CLI
   - native Webflow edits: use MCP/Designer tools to create elements, reuse styles, bind props, and update settings
   - data-backed behavior: use the owning Worker/API/Data API, not static exported files
6. Verify in the narrowest trustworthy live surface:
   - local typecheck/bundle for Code Components
   - Designer inspection for props, bindings, and layout fit
   - published page or preview check when runtime behavior, scripts, routing, or hydration matters
7. Record evidence in Linear:
   - issue ID, export path/date, commands run, live surface inspected, publish/share status, rollback note

## Code Component Guidance

For Code Components, prefer exported Webflow files as the design reference and repo code as the component source of truth.

Practical implications:

- mirror native class vocabulary only when it improves maintainability or Designer familiarity
- bake required layout and interaction styles into the component when the component cannot inherit the site stylesheet reliably
- keep `.webflow.tsx` declarations next to their React components
- do not rename `.webflow.tsx` definition files casually, because the file name is the component identity Webflow tracks
- keep endpoint defaults empty in reusable components; configure live endpoints per site or trusted composition layer
- after sharing the library, verify in Designer or on the published page, because local export parity does not prove live Code Component hydration

## Decision Table

| Scenario | Preferred starting point | Why |
| --- | --- | --- |
| Recreate a native Webflow card/filter/nav as React | Fresh export plus live Designer coordinates | Export gives class/style/DOM evidence; Designer gives live IDs and bindings |
| Fix one text label or link on a known element | MCP/Designer tool | Exporting the whole site adds avoidable overhead |
| Build a Code Component that must match an existing site section | Fresh export plus component package | Local CSS/HTML search is faster than repeated style inspection |
| Update CMS-bound content or collection behavior | Data API or owning Worker/API | Export omits working CMS data and bindings |
| Diagnose localization behavior | Live API/Designer localization context | Export only captures primary-locale static output |
| Align component styling after screenshots look wrong | Exported HTML/CSS, then Designer verification | Screenshots show symptoms; export reveals the class and CSS contract |
| Publish or share a component library | Webflow CLI plus live Designer verification | Export is read-only evidence and cannot publish |

## Summary Rule

Export first for static design understanding. Mutate live through MCP/API/CLI. Verify live before calling the work done.
