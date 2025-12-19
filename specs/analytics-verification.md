# Analytics Verification Spec

## Overview

Verify that the unified analytics tracking system is properly implemented and recording events across all CREATE SOMETHING properties (.space, .io, .agency, .ltd, .lms).

The system includes:
- Client-side tracking via Analytics.svelte component
- Event batching and session management
- Server-side event processing to D1
- Admin dashboard visualization

## Features

### Client-Side Verification

- Verify Analytics component is mounted in each property layout
  - Check space, io, agency, ltd layouts have Analytics component
  - Confirm property prop matches the package name
- Verify analytics client initializes correctly
  - Check session ID is generated and stored in sessionStorage
  - Confirm events are being queued in memory
- Test page view tracking on navigation
  - Verify initial page_view event is fired on mount
  - Confirm route_change events fire on SPA navigation
- Verify event batching works correctly
  - Check batch flushes after 10 events or 5 second timeout
  - Confirm sendBeacon is used on page unload

### Server-Side Verification

- Test events endpoint accepts POST requests
  - Send test batch to /api/analytics/events
  - Verify 200 response with success: true
- Verify D1 storage works correctly
  - Query unified_events table after sending events
  - Confirm events are stored with correct schema
- Check daily aggregates are updated
  - Query unified_events_daily table
  - Verify counts increment correctly
- Verify session summary updates
  - Query unified_sessions table
  - Confirm page_views and interactions increment

### Admin Dashboard Verification

- Verify behavioral analytics section displays
  - Check Sessions metric renders without NaN
  - Verify Avg Page Views shows correct value
  - Confirm Avg Duration displays in minutes format
- Test category breakdown table
  - Verify categories are capitalized correctly
  - Check counts display properly
- Test top actions table
  - Verify action names display correctly
  - Check counts are accurate

### End-to-End Test

- Record events by visiting production sites
  - Visit each property and navigate pages
  - Perform interactions (clicks, scrolls)
- Query D1 to verify event storage
  - Use wrangler d1 execute to check unified_events
  - Verify event counts match expected actions
- Check admin dashboard reflects recorded events
  - Visit /admin/analytics on each property
  - Verify behavioral analytics shows the recorded data
