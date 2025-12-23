# Taste Collections & LLM Context

## Overview

Enable users to curate design reference collections from Are.na taste channels, track their readings/explorations, and expose structured context for AI agents via LLM.txt convention.

**Philosophy**: Taste is cultivated, not consumed. Collections persist understanding across sessions—for humans and machines alike.

## Context

- **Existing**: `createsomething.ltd/taste` syncs Are.na channels with visual references
- **Existing**: `packages/components/src/lib/analytics` tracks user events
- **New**: User collections, reading history, LLM-readable exports

## Features

### 1. User Reading Tracker

Track which taste references a user has viewed/engaged with:

- Record view events when user opens a reference
- Track time spent (scroll depth, dwell time)
- Mark references as "studied" vs "glanced"
- Store in D1 per authenticated user

Schema:
- user_id, reference_id, channel, first_viewed, last_viewed, view_count, total_time_seconds, studied (boolean)

### 2. Collection CRUD

Allow users to create named collections of taste references:

- Create collection with name, description, visibility (private/public)
- Add/remove references to collections
- Reorder references within collection
- Collections can have tags (e.g., "motion", "typography", "color")

Schema:
- collections: id, user_id, name, description, visibility, tags, created_at, updated_at
- collection_items: collection_id, reference_id, position, note, added_at

### 3. Collection UI Components

SvelteKit components for collection management:

- CollectionGrid - Display collection as visual grid
- CollectionPicker - Modal to add reference to collection
- CollectionEditor - Manage collection metadata
- ReadingProgress - Show user's exploration progress

Components use Canon tokens, integrate with AuthProvider from identity work.

### 4. LLM.txt Endpoint

Expose collections as structured context for AI agents:

GET /llm.txt - Returns canonical taste vocabulary
GET /llm.txt?collection={id} - Returns specific collection context
GET /llm.txt?user={id} - Returns user's studied references

Format (plain text, optimized for LLM context windows):
- Title and description
- Visual vocabulary terms with definitions
- Reference links with annotations
- Relationship mappings (e.g., "Rams -> minimalism -> Canon tokens")

### 5. Agent Context API

JSON API for programmatic agent access:

GET /api/taste/context - Structured taste vocabulary
GET /api/taste/context?intent=color - Filtered by design intent
GET /api/taste/references/{id} - Single reference with full metadata

Response includes:
- Visual description (for agents without vision)
- Design principles extracted
- Canon token mappings
- Related references

### 6. Reading Insights Dashboard

Show users their taste exploration patterns:

- Channels explored vs total
- Time spent per channel
- Most-studied references
- Collection growth over time
- "Taste profile" summary for sharing

## Constraints

- Requires Identity authentication (depends on identity-integration work)
- Collections stored in shared D1 (create-something-db)
- LLM.txt must be public/cacheable (no auth required)
- Agent API can require API key for rate limiting
- All UI uses Canon design tokens

## Success Criteria

1. User can mark references as "studied"
2. User can create and populate collections
3. /llm.txt returns parseable taste context
4. Agent API returns structured vocabulary
5. Dashboard shows reading patterns
6. Collections can be shared via public URL

## Out of Scope

- Are.na write-back (we only read from Are.na)
- Social features (following, likes)
- AI-generated collection suggestions (future)
- Export to other formats (PDF, etc.)
