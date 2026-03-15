# Webflow Dashboard Port - Created Issues Summary

**Date**: January 7, 2026  
**Total Issues Created**: 11  
**Status**: All issues created successfully, but blocked by `bd show` bug

---

## Issue List

### Phase 1: Review & Planning (2 issues)

#### 1. csm-5uxdj - Review webflow-dashboard feature parity analysis and prioritize roadmap
- **Complexity**: simple
- **Phase**: review
- **Description**: Review FEATURE_PARITY_ANALYSIS.md and prioritize the missing features across three tiers: Business-Critical (submission tracking, validation UI, marketplace insights), High-Value (versioning, animations), and Supporting (status history, related assets). Create a deployment timeline based on business priorities.
- **Model Recommendation**: Haiku (basic)

#### 2. csm-3dc7d - Plan Phase 1 implementation: Critical features for production deployment
- **Complexity**: standard
- **Phase**: planning
- **Description**: Create detailed implementation plan for Phase 1 critical features: 1) Submission tracking system (5 days), 2) GSAP validation UI (3 days), 3) Multi-image upload (3 days). Define task breakdown, dependencies, testing strategy, and acceptance criteria for each feature.
- **Model Recommendation**: Sonnet (shiny)

---

### Phase 2: Architecture (3 issues)

#### 3. csm-rydk4 - Design submission tracking system architecture for SvelteKit
- **Complexity**: complex
- **Phase**: architecture
- **Description**: Design the submission tracking system architecture porting from Next.js to SvelteKit. Must include: hybrid API integration (external + local calculation), 30-day rolling window logic, UTC date handling, template list with expiry dates, next available slot calculations, and CORS handling for development. Reference: original uses https://check-asset-name.vercel.app/api/checkTemplateuser
- **Model Recommendation**: Opus (chrome)
- **Estimated Effort**: 2-3 days architecture work

#### 4. csm-hkc80 - Design multi-image upload architecture for R2 storage
- **Complexity**: standard
- **Phase**: architecture
- **Description**: Design architecture for carousel and secondary thumbnail uploads using Cloudflare R2. Must support: multiple image uploads per asset, WebP-only validation, aspect ratio checks (150:199 for thumbnails), file size limits (10MB), drag-and-drop UI, upload progress tracking, and image management (view/delete). Port from CarouselUploader.jsx and SecondaryThumbnailUploader.jsx patterns.
- **Model Recommendation**: Sonnet (shiny)
- **Estimated Effort**: 1-2 days architecture work

#### 5. csm-c5e4r - Design GSAP validation UI architecture with results display
- **Complexity**: standard
- **Phase**: architecture
- **Description**: Design validation UI architecture porting from GsapValidationModal.jsx. Must include: modal/page component for validation playground, URL input with real-time validation, results display with tabs (Overview, Pages, Issues, Recommendations), integration with existing /api/validation/gsap endpoint, error handling, loading states, and accessibility. Consider whether to use modal or dedicated route.
- **Model Recommendation**: Sonnet (shiny)
- **Estimated Effort**: 1-2 days architecture work

---

### Phase 3: Implementation (6 issues)

#### 6. csm-n73re - Implement submission tracking system component
- **Complexity**: complex
- **Phase**: build
- **Description**: Build SubmissionTracker component for webflow-dashboard. Implement: hybrid API integration (external + local calc), 30-day rolling window with UTC handling, template list display with expiry dates, next available slot calculations, submission limit warnings (6/month), whitelist status display, tooltip with detailed status, and CORS-aware development mode.
- **Model Recommendation**: Opus (chrome)
- **Estimated Effort**: 5 days

#### 7. csm-ky3b2 - Implement GSAP validation UI and results display
- **Complexity**: standard
- **Phase**: build
- **Description**: Build GSAP validation UI for webflow-dashboard. Create: validation modal/page component, URL input field with validation, tabs for results display (Overview, Pages, Issues, Recommendations), integration with /api/validation/gsap endpoint, loading and error states, accessibility features. Port patterns from GsapValidationModal.jsx.
- **Model Recommendation**: Sonnet (shiny)
- **Estimated Effort**: 3 days

#### 8. csm-xdfzt - Implement carousel and secondary thumbnail upload components
- **Complexity**: standard
- **Phase**: build
- **Description**: Build multi-image upload components for webflow-dashboard. Create: ImageUploader component with carousel support, secondary thumbnail uploader, drag-and-drop UI, WebP validation with aspect ratio checks (150:199), file size limits (10MB), upload progress indicators, R2 storage integration, image management (view/delete). Port from CarouselUploader.jsx and SecondaryThumbnailUploader.jsx.
- **Model Recommendation**: Sonnet (shiny)
- **Estimated Effort**: 3 days

#### 9. csm-4iqn5 - Implement marketplace insights component with analytics
- **Complexity**: complex
- **Phase**: build
- **Description**: Build MarketplaceInsights component (770+ lines from original). Implement: Top 5 templates leaderboard with rankings, trending categories with revenue analytics, auto-generated market insights (trends/opportunities/warnings), user template highlighting, category performance tables, competition level indicators, animated metrics integration. Connect to existing /api/analytics/leaderboard and /api/analytics/categories endpoints.
- **Model Recommendation**: Opus (chrome)
- **Estimated Effort**: 7 days

#### 10. csm-31xzb - Implement asset versioning system
- **Complexity**: standard
- **Phase**: build
- **Description**: Build asset versioning system for webflow-dashboard. Create: version creation API endpoint (/api/assets/[id]/version), version history tracking in Airtable, version comparison UI, rollback functionality, version metadata (timestamp, changes, user). Port from /api/asset/createVersion/[id].js pattern.
- **Model Recommendation**: Sonnet (shiny)
- **Estimated Effort**: 4 days

#### 11. csm-ist47 - Add design enhancements: animations and kinetic numbers
- **Complexity**: standard
- **Phase**: build
- **Description**: Add design enhancements to webflow-dashboard. Implement: Svelte animation library integration (svelte/motion or auto-animate), kinetic number animations for metrics, status card animations (stagger, hover effects), animated donut chart for status distribution, glassmorphism card variants, smooth dark mode transitions, progress bar animations, reduced motion support. Reference DESIGN_ENHANCEMENTS.md.
- **Model Recommendation**: Sonnet (shiny)
- **Estimated Effort**: 5 days

---

## Total Effort Estimate

- **Review/Planning**: 2-3 days
- **Architecture**: 4-7 days
- **Implementation**: 27 days
- **Total**: ~33-37 days (6-7 weeks)

---

## Priority Breakdown

### Tier 1: Business-Critical (Blocks Production)
- csm-n73re - Submission tracking (5 days)
- csm-ky3b2 - GSAP validation UI (3 days)
- csm-xdfzt - Multi-image upload (3 days)
- **Subtotal**: 11 days

### Tier 2: High-Value Features
- csm-4iqn5 - Marketplace insights (7 days)
- csm-31xzb - Asset versioning (4 days)
- csm-ist47 - Design enhancements (5 days)
- **Subtotal**: 16 days

### Tier 3: Planning & Architecture
- csm-5uxdj - Review & prioritize (1 day)
- csm-3dc7d - Phase 1 planning (1 day)
- csm-rydk4 - Submission tracking architecture (2 days)
- csm-hkc80 - Multi-image architecture (1 day)
- csm-c5e4r - GSAP validation architecture (1 day)
- **Subtotal**: 6 days

---

## Model Routing Recommendations

Based on complexity labels:

- **Haiku (basic)**: csm-5uxdj (review task)
- **Sonnet (shiny)**: csm-3dc7d, csm-hkc80, csm-c5e4r, csm-ky3b2, csm-xdfzt, csm-31xzb, csm-ist47
- **Opus (chrome)**: csm-rydk4, csm-n73re, csm-4iqn5

---

## Current Blocker: BD Show Bug

**Issue**: `bd show <issue-id>` cannot find issues that `bd list --id <issue-id>` can find.

**Impact**: Prevents `gt sling` from assigning work to Gas Town polecats.

**Workaround Options**:

1. **Manual Assignment** (Immediate):
   ```bash
   bd assign csm-5uxdj <assignee>
   ```

2. **Direct Polecat Creation** (Alternative):
   ```bash
   # Create polecat manually and assign work
   gt polecat create <name> --rig csm
   bd assign csm-5uxdj csm-csm-polecat-<name>
   ```

3. **Wait for BD Fix** (Long-term):
   - Reported bug to BD maintainers
   - Upgraded to 0.44.0 (still exhibits bug)
   - May need to wait for 0.46.0 or later

**See**: `BD_SYNC_ISSUE_REPORT.md` for full diagnostic details.

---

## Next Steps

1. **Immediate**: Review `FEATURE_PARITY_ANALYSIS.md` to understand scope
2. **Short-term**: Manually assign Tier 1 issues to Gas Town polecats
3. **Medium-term**: Complete Phase 1 (Tier 1) before production deployment
4. **Long-term**: Complete Tiers 2-3 for full feature parity

---

## Related Documents

- **Feature Analysis**: `packages/webflow-dashboard/FEATURE_PARITY_ANALYSIS.md`
- **Production Readiness**: `packages/webflow-dashboard/PRODUCTION_READINESS.md`
- **BD Bug Report**: `BD_SYNC_ISSUE_REPORT.md`

---

**Created by**: Gas Town Smart Sling Analysis  
**Model**: Claude Sonnet 4.5  
**Date**: January 7, 2026

