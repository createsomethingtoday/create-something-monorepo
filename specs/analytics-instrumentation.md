# Analytics Instrumentation Spec

Comprehensive analytics collection across CREATE SOMETHING properties to understand user experience and intent.

## Overview

The latent demand analysis framework (`packages/io/src/lib/analysis/latent-demand.ts`) identifies patterns from user behavior. Currently, analytics data is mock/placeholder. This spec defines the instrumentation needed to capture real behavioral signals that inform UI/content improvements.

**Philosophy**: "Find the intent users already have and steer it." — Boris Cherny

We're not tracking for tracking's sake. Each data point must answer a specific question about user experience or intent.

## Goals

1. **Validate abuse patterns** - Confirm or refute hypothesized feature misuse
2. **Discover new intents** - Find unanticipated user needs
3. **Measure friction** - Identify where users struggle or abandon
4. **Guide content** - Understand what content resonates
5. **Inform product** - Data-driven feature prioritization

## Features

### Core Event Schema (P1)

Define a unified event schema across all properties.

```typescript
interface AnalyticsEvent {
  // Identity
  eventId: string;           // Unique event ID
  sessionId: string;         // Session grouping
  userId?: string;           // Authenticated user (optional)

  // Context
  property: 'space' | 'io' | 'agency' | 'ltd' | 'lms';
  timestamp: string;         // ISO 8601
  url: string;               // Current page URL
  referrer?: string;         // Previous page

  // Event
  category: EventCategory;
  action: string;            // Specific action
  target?: string;           // Element or content ID
  value?: number;            // Numeric value if applicable

  // Metadata
  metadata?: Record<string, unknown>;
}

type EventCategory =
  | 'navigation'      // Page views, route changes
  | 'interaction'     // Clicks, hovers, scrolls
  | 'search'          // Search queries, filters
  | 'content'         // Content engagement
  | 'conversion'      // Goal completions
  | 'error'           // Errors encountered
  | 'performance';    // Load times, vitals
```

### Navigation Analytics (P1)

Track user journeys through properties.

**Events**:
- `page_view` - Page load with timing
- `route_change` - SPA navigation
- `external_link` - Outbound clicks
- `back_navigation` - Browser back button usage

**Questions answered**:
- Which pages have high bounce rates?
- What are common navigation paths?
- Where do users get lost?

**Implementation**:
```typescript
// In +layout.svelte for each property
import { page } from '$app/stores';
import { track } from '$lib/analytics';

$: track('page_view', {
  path: $page.url.pathname,
  title: document.title,
  loadTime: performance.now()
});
```

### Search Behavior Analytics (P2)

Understand what users are looking for.

**Events**:
- `search_query` - Search term entered
- `search_result_click` - Result selected
- `search_no_results` - Zero results returned
- `search_abandon` - Search started but abandoned

**Questions answered**:
- What content are users seeking?
- Are search results satisfying intent?
- What's missing from the content?

**Abuse pattern validated**: "Search as Navigation" (csm-j7ww)

### Content Engagement Analytics (P1)

Measure how users consume content.

**Events**:
- `content_scroll_depth` - 25%, 50%, 75%, 100%
- `content_time_on_page` - Engagement duration
- `content_copy` - Text copied
- `content_highlight` - Text selected
- `content_link_click` - Internal content links

**Questions answered**:
- Which content keeps attention?
- Where do users lose interest?
- What do users reference/share?

### Interaction Analytics (P2)

Track UI interactions for UX optimization.

**Events**:
- `button_click` - CTA and action buttons
- `form_start` - Form interaction begins
- `form_field_focus` - Field-level engagement
- `form_submit` - Form completion
- `form_abandon` - Form started but not completed
- `dropdown_open` - Menu/dropdown interactions
- `modal_open` / `modal_close` - Dialog engagement
- `tooltip_view` - Help content engagement

**Questions answered**:
- Which CTAs are effective?
- Where do forms cause friction?
- Is help content being used?

### Error & Friction Analytics (P1)

Identify pain points.

**Events**:
- `error_displayed` - Error messages shown to user
- `validation_failure` - Form validation errors
- `404_page` - Page not found
- `api_error` - API failures affecting UX
- `rage_click` - Rapid repeated clicks (frustration signal)

**Questions answered**:
- Where are users frustrated?
- What errors are most common?
- Which errors lead to abandonment?

### Keyboard & Accessibility Analytics (P2)

Understand keyboard-first and accessibility needs.

**Events**:
- `keyboard_shortcut` - Shortcut usage (if any)
- `tab_navigation` - Tab key usage patterns
- `skip_link_use` - Skip-to-content activation
- `screen_reader_detected` - AT detection (respectfully)

**Questions answered**:
- How many users prefer keyboard navigation?
- Is our a11y implementation being used?
- Should we add command palette?

**Intent validated**: "Keyboard-First Navigation" (csm-5lkd)

### Template/Site Analytics (.space specific) (P1)

Track template usage patterns.

**Events**:
- `template_preview` - Template previewed
- `template_select` - Template chosen
- `config_change` - Configuration modified
- `config_json_edit` - Raw JSON edited (abuse signal)
- `deploy_start` / `deploy_complete` - Deployment flow
- `experiment_create` - Experiment created
- `experiment_share` - Experiment URL copied (staging abuse signal)

**Questions answered**:
- Which templates are popular?
- Where does configuration cause friction?
- Are experiments being used as staging?

**Abuse patterns validated**: "Template Config via JSON", "Experiments as Staging"

### Learning Analytics (.lms specific) (P2)

Track learning engagement.

**Events**:
- `lesson_start` - Lesson opened
- `lesson_complete` - Lesson finished
- `lesson_abandon` - Lesson started but not completed
- `quiz_attempt` - Quiz interaction
- `certificate_earned` - Completion milestone
- `bookmark_create` - Lesson bookmarked (abuse signal)
- `progress_check` - Progress page viewed

**Questions answered**:
- Where do learners drop off?
- Which lessons are most engaging?
- Is progress tracking adequate?

**Abuse pattern validated**: "Bookmark as Progress Tracker"

### Performance Analytics (P3)

Track Core Web Vitals and performance.

**Events**:
- `web_vital_lcp` - Largest Contentful Paint
- `web_vital_fid` - First Input Delay
- `web_vital_cls` - Cumulative Layout Shift
- `resource_timing` - Slow resource loads

**Questions answered**:
- Which pages are slow?
- Does performance affect engagement?

## Implementation Architecture

### Client-Side Collection

```
┌─────────────────────────────────────────────────────────┐
│                    Browser                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │              analytics.ts                         │   │
│  │  • Event batching (5s or 10 events)             │   │
│  │  • Session management                            │   │
│  │  • Privacy controls (respect DNT)               │   │
│  └──────────────────────┬──────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              /api/analytics/events                       │
│              (Cloudflare Worker)                         │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     ┌─────────┐    ┌──────────┐    ┌──────────┐
     │   D1    │    │ Analytics│    │    KV    │
     │ (raw)   │    │  Engine  │    │ (agg)    │
     └─────────┘    └──────────┘    └──────────┘
```

### Storage Strategy

| Data Type | Storage | Retention | Purpose |
|-----------|---------|-----------|---------|
| Raw events | D1 | 30 days | Debugging, analysis |
| Aggregates | KV | 1 year | Dashboards, trends |
| Real-time | Analytics Engine | 90 days | Live monitoring |

### Privacy Considerations

1. **No PII in events** - Never log emails, names, passwords
2. **Respect DNT** - Honor Do Not Track header
3. **Session, not user** - Focus on sessions over individuals
4. **Anonymize** - Hash any identifiers
5. **GDPR-ready** - Support data deletion requests

## Rollout Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Define event schema in shared types
- [ ] Create analytics client library
- [ ] Set up /api/analytics/events endpoint
- [ ] Implement D1 storage
- [ ] Add navigation events to all properties

### Phase 2: Core Events (Week 3-4)
- [ ] Content engagement tracking
- [ ] Error and friction tracking
- [ ] Template analytics (.space)
- [ ] Search analytics

### Phase 3: Advanced (Week 5-6)
- [ ] Keyboard/a11y analytics
- [ ] Learning analytics (.lms)
- [ ] Performance analytics
- [ ] Real-time dashboard

### Phase 4: Analysis (Week 7+)
- [ ] Connect to latent-demand.ts framework
- [ ] Automate pattern detection
- [ ] Generate weekly insights reports

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event coverage | >80% of user actions | Audit against event schema |
| Data quality | <5% invalid events | Validation error rate |
| Latency impact | <50ms p95 | RUM metrics |
| Privacy compliance | 100% | No PII in logs |
| Actionable insights | 3+/month | Product decisions informed |

## Dependencies

- Cloudflare D1 (raw event storage)
- Cloudflare Analytics Engine (real-time)
- Cloudflare KV (aggregates)
- `@create-something/components` (shared tracking utils)

## References

- [Latent Demand Analysis Framework](../packages/io/src/lib/analysis/latent-demand.ts)
- [Known Abuse Patterns](../packages/io/src/lib/analysis/latent-demand.ts#KNOWN_ABUSE_PATTERNS)
- [Boris Cherny Interview Insights](./boris-cherny-infra-improvements.md)
