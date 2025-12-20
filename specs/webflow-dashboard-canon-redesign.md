# Webflow Dashboard Canon Redesign

## Overview

Transform the dashboard from "Webflow-branded tool" to "CREATE SOMETHING infrastructure that disappears into use."

**Philosophy**: Zuhandenheit (ready-to-hand) - the UI recedes into transparent use. Users focus on managing assets, not noticing the interface. "Weniger, aber besser" - every color must earn its existence through function, not decoration.

**Current State**: 43 violations across 19 files. `--webflow-blue: #4353ff` pollutes focus states, buttons, links, nav, logos.

**Token Mappings**:
- `--webflow-blue` (focus) → `--color-border-emphasis`
- `--webflow-blue` (active bg) → `--color-active`
- `--webflow-blue` (button) → `--color-fg-primary` (inverted)
- `--webflow-blue` (link) → `--color-fg-secondary`
- `--webflow-blue` (logo) → `--color-fg-primary`
- purple "Upcoming" → `--color-data-3` (#c084fc)

## Features

### Phase 1: Remove webflow-blue from app.css
Delete the `--webflow-blue` and `--webflow-blue-hover` CSS custom property definitions from `packages/webflow-dashboard/src/app.css`. These are the source variables that other files reference.
- Remove lines 4-8 containing the webflow brand color definitions
- Verify the file still imports Canon tokens correctly

### Phase 2: Fix Button component
Update `packages/webflow-dashboard/src/lib/components/ui/Button.svelte` to remove the `webflow` variant and convert to Canon-compliant styling.
- Remove the `webflow` variant entirely
- Update `.btn-link` color from webflow-blue to `--color-fg-secondary`
- Primary buttons should use white background with black text for high contrast
- All focus states should use `--color-border-emphasis`

### Phase 3: Fix Input component
Update `packages/webflow-dashboard/src/lib/components/ui/Input.svelte` focus states.
- Change focus border color from webflow-blue to `--color-border-emphasis`
- Ensure focus ring uses `--color-focus` token

### Phase 4: Fix Textarea component
Update `packages/webflow-dashboard/src/lib/components/ui/Textarea.svelte` focus states.
- Change focus border color from webflow-blue to `--color-border-emphasis`
- Ensure focus ring uses `--color-focus` token

### Phase 5: Fix Header component
Update `packages/webflow-dashboard/src/lib/components/Header.svelte` for Canon compliance.
- Change logo fill from blue to white (`--color-fg-primary`)
- Change active nav background from blue to `--color-active`
- Update button variant from webflow to secondary or primary as appropriate

### Phase 6: Fix Search component
Update `packages/webflow-dashboard/src/lib/components/Search.svelte` focus states.
- Change focus border color from webflow-blue to `--color-border-emphasis`

### Phase 7: Fix StatusBadge component
Update `packages/webflow-dashboard/src/lib/components/StatusBadge.svelte` for Canon compliance.
- Change "Upcoming" status color from hardcoded purple to `--color-data-3`

### Phase 8: Fix OverviewStats component
Update `packages/webflow-dashboard/src/lib/components/OverviewStats.svelte` for Canon compliance.
- Change "Upcoming" color to `--color-data-3`
- Change revenue icon color to `--color-info`

### Phase 9: Fix AssetsDisplay component
Update `packages/webflow-dashboard/src/lib/components/AssetsDisplay.svelte` for Canon compliance.
- Change `.status-upcoming` color to `--color-data-3`

### Phase 10: Fix login page
Update `packages/webflow-dashboard/src/routes/login/+page.svelte` for Canon compliance.
- Change logo fill from blue to white
- Update input focus states to use Canon tokens
- Update submit button from webflow variant to primary

### Phase 11: Fix verify page
Update `packages/webflow-dashboard/src/routes/verify/+page.svelte` for Canon compliance.
- Change logo fill from blue to white
- Update spinner color to use Canon tokens
- Update link colors to `--color-fg-secondary`

### Phase 12: Fix marketplace page
Update `packages/webflow-dashboard/src/routes/marketplace/+page.svelte` for Canon compliance.
- Update link colors from webflow-blue to `--color-fg-secondary`
- Fix pagination styling to use Canon tokens

### Phase 13: Fix validation page
Update `packages/webflow-dashboard/src/routes/validation/+page.svelte` for Canon compliance.
- Update link colors from webflow-blue to `--color-fg-secondary`

### Phase 14: Fix asset detail page
Update `packages/webflow-dashboard/src/routes/assets/[id]/+page.svelte` for Canon compliance.
- Update tab active states to use `--color-active`
- Update link colors to `--color-fg-secondary`

### Phase 15: Fix EditProfileModal component
Update `packages/webflow-dashboard/src/lib/components/EditProfileModal.svelte` for Canon compliance.
- Update spinner color to use Canon tokens

### Phase 16: Fix ImageUploader component
Update `packages/webflow-dashboard/src/lib/components/ImageUploader.svelte` for Canon compliance.
- Update drag border color from webflow-blue to `--color-border-emphasis`

### Phase 17: Fix MarketplaceInsights component
Update `packages/webflow-dashboard/src/lib/components/MarketplaceInsights.svelte` for Canon compliance.
- Update 5 active state colors from webflow-blue to `--color-active`

### Phase 18: Fix ApiKeysManager component
Update `packages/webflow-dashboard/src/lib/components/ApiKeysManager.svelte` for Canon compliance.
- Update checkbox accent color
- Update spinner color
- Remove any gradient using webflow-blue

### Phase 19: Fix SubmissionTracker component
Update `packages/webflow-dashboard/src/lib/components/SubmissionTracker.svelte` for Canon compliance.
- Update progress bar color from webflow-blue to appropriate Canon token

### Phase 20: Fix GsapValidationModal component
Update `packages/webflow-dashboard/src/lib/components/GsapValidationModal.svelte` for Canon compliance.
- Update spinner color to use Canon tokens
- Remove any webflow-blue references

### Phase 21: Verification
Run grep to verify zero violations remain.
- Run: `grep -r "webflow-blue\|#4353ff" packages/webflow-dashboard/src/`
- Should return 0 results
- Build the project to verify no type errors
