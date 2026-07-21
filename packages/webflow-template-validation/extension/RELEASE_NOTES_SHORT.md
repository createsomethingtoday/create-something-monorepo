# Webflow Way Validator v1.2.2

## Marketplace Custom-Code Enforcement
- Blocks prohibited inline and external custom code with a dedicated validation category.
- Binds persisted results to the current published custom-code surface and policy version.

## New Features
- Error Checklist tab with progress tracking
- Smart checkbox sync (unchecks if errors persist)
- Tabbed interface with persistent state
- Multi-category validation engine

## Changes/Fixes
- Fixed Variable Modes false warning by collecting `collection.getAllVariableModes()`
- Treats missing mode data as unavailable instead of reporting zero modes
- Fixed checkbox alignment with 400px width constraint
- Corrected tab behavior (Overview on new, preserve on refresh)
- Aligned styling with Figma to Webflow patterns

## Improvements
- Persistent progress tracking via localStorage
- Real-time visual feedback
- Responsive design optimized for Designer
