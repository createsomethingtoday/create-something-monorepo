# Session Duration Tracking Fix

## Overview

Fix session duration tracking which currently always returns 0. The issue is that duration calculation relies on multiple events per session, but single-page visits have only one event.

**Location**: `packages/components/src/lib/analytics/`

## Features

### Add session start timestamp to client
Track when the session actually started for accurate duration calculation.
- Add `sessionStartedAt` to session data in sessionStorage
- Set timestamp when session is first created
- Preserve across page navigations within same session

### Send session_end event on page unload
Capture actual elapsed time from the client before the page closes.
- Add session_end event to flush() in client.ts
- Calculate elapsed time from sessionStartedAt to now
- Include elapsed seconds in event value field
- Fire before existing event flush

### Update server to use client-reported duration
Server should prefer client-calculated duration over timestamp difference.
- In updateSessionSummaries, look for session_end event
- Use session_end.value as duration if present
- Fall back to timestamp calculation if no session_end
- Ensure duration_seconds is never 0 if session_end provides value

### Add session_end to valid actions list
Ensure the new event type passes validation.
- Add 'session_end' to valid actions in server.ts validateEvent
- Or use existing 'content' category which is already valid

### Handle visibility change for accurate timing
Pause time tracking when tab is hidden, resume when visible.
- Track cumulative active time, not wall clock time
- Use visibilitychange event to pause/resume
- Report active time in session_end event

### Add minimum duration fallback
Prevent 0 duration for sessions that clearly had activity.
- If session has page_view but duration calculates to 0, use 1 second minimum
- Only apply when there's clear evidence of user presence

## Success Criteria

- [ ] Single-page session visits show duration > 0
- [ ] Multi-page sessions show accurate cumulative duration
- [ ] Duration reflects active time (excludes hidden tab time)
- [ ] Existing analytics functionality unchanged
- [ ] Build passes: `pnpm --filter=components build`
