# Plugin Distribution Page

## Overview

Build a plugin distribution page at `createsomething.io/plugins` where authenticated users can browse, enable/disable plugins, and export settings for Claude Code integration.

**Philosophy**: The tool recedes; the methodology propagates. Users discover plugins through a clean interface, toggle preferences, and export configuration—no manual JSON editing.

**Architecture**:
- Host on createsomething.io (tools/research property)
- Auth via Identity system at id.createsomething.space
- Store user preferences in packages/io D1 database
- Export downloadable settings.json snippet for Claude Code

**Token Mappings** (Canon compliance):
- Card backgrounds: `var(--color-bg-surface)`
- Borders: `var(--color-border-default)`
- Text: `var(--color-fg-primary)`, `var(--color-fg-secondary)`
- Interactive states: `var(--color-hover)`, `var(--color-active)`

## Features

### Create database migration for user_plugins
Create `packages/io/migrations/0001_user_plugins.sql` with schema for storing user plugin preferences.
- Table: user_plugins with id, user_id, plugin_slug, enabled, enabled_at, disabled_at, settings_json
- UNIQUE constraint on (user_id, plugin_slug)
- Index on user_id for efficient queries

### Create TypeScript types for plugins
Create `packages/io/src/lib/types/plugins.ts` with interfaces for Plugin, UserPlugin, and API responses.
- Plugin interface with slug, name, description, category, tags, features
- UserPlugin interface matching database schema
- Export response types for API endpoints

### Create plugin configuration
Create `packages/io/src/lib/config/plugins.ts` with definitions for all 4 plugins.
- canon: Design system enforcement with Dieter Rams principles
- hermeneutic-review: Code review through the Subtractive Triad lens
- voice-validator: Content validation against Five Principles
- understanding-graphs: Minimal dependency graphs for codebase comprehension
- Include category, tags, and features array for each

### Create PluginCard component
Create `packages/io/src/lib/components/plugins/PluginCard.svelte` for displaying plugin in grid.
- Icon/badge area with category tag
- Plugin name and description
- Feature list preview
- Toggle switch (disabled if not authenticated)
- "View Details" link
- Canon-compliant styling with tokens

### Create PluginToggle component
Create `packages/io/src/lib/components/plugins/PluginToggle.svelte` for enable/disable functionality.
- Toggle switch with loading state
- Calls API to update user preference
- Shows login prompt if not authenticated
- Optimistic UI updates with rollback on error

### Create PluginExportModal component
Create `packages/io/src/lib/components/plugins/PluginExportModal.svelte` for exporting settings.
- Shows generated settings.json based on enabled plugins
- Copy to clipboard button
- Download as file button
- Instructions for merging with existing Claude Code settings

### Create public plugins API endpoint
Create `packages/io/src/routes/api/plugins/+server.ts` for listing all plugins.
- GET: Return all plugins from config
- No authentication required
- Include metadata for frontend display

### Create user plugins API endpoint
Create `packages/io/src/routes/api/plugins/user/+server.ts` for user's enabled plugins.
- GET: Return user's enabled plugins from D1
- Requires authentication (check session)
- Return empty array if no preferences set

### Create plugin toggle API endpoint
Create `packages/io/src/routes/api/plugins/user/[slug]/+server.ts` for enabling/disabling.
- POST: Enable plugin for user (insert/update in D1)
- DELETE: Disable plugin for user (update disabled_at)
- Requires authentication
- Return updated plugin state

### Create plugins listing page
Create `packages/io/src/routes/plugins/+page.svelte` and `+page.server.ts` for plugin grid.
- Load all plugins from config
- Load user's enabled plugins if authenticated
- Display PluginCard grid with responsive layout
- Category filter chips
- Export button (opens modal)
- Canon-compliant layout using Tailwind for structure

### Create plugin detail page
Create `packages/io/src/routes/plugins/[slug]/+page.svelte` and `+page.server.ts` for single plugin.
- Load plugin details from config
- Show full description and all features
- Installation instructions
- PluginToggle component
- Back link to plugins listing

### Create settings export endpoint
Create `packages/io/src/routes/plugins/export/+server.ts` for downloading settings.json.
- GET: Generate settings.json with user's enabled plugins
- Requires authentication
- Set Content-Disposition header for download
- Format matches Claude Code settings structure

### Protect user API routes
Update `packages/io/src/hooks.server.ts` to protect `/api/plugins/user/*` routes.
- Check for valid session on user-specific endpoints
- Return 401 if not authenticated
- Allow public endpoints to pass through

### Verification
Confirm all changes work correctly.
- Run `pnpm --filter=io build` with zero errors
- Run `pnpm --filter=io check` for type checking
- Verify /plugins page loads and displays all 4 plugins
- Verify toggle works for authenticated users
- Verify export generates valid JSON
