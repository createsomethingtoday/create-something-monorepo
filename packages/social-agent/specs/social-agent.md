# Social Agent Autonomous Spec

## Overview

Fully autonomous multi-platform social agent for WORKWAY and CREATE SOMETHING.
Monitors content sources, generates posts following voice canon, self-reviews content,
and publishes to LinkedIn and Twitter/X via API integration.

## Safety Rails

- **Voice compliance threshold**: 85% minimum for autonomous posting
- **Rate limits**: 1 LinkedIn post/day, 5 tweets/day
- **Emergency stop**: Create Beads issue `social-pause` to halt all activity
- **Human escalation**: Negative sentiment or constructive criticism requires review

## Features

### Phase 1: Core Infrastructure
- [x] D1-backed idea queue with status tracking
- [x] Content generator with Claude integration
- [x] Voice validator for self-review
- [x] Source monitors (repo, paper, external)

### Phase 2: Platform Integration
- [x] LinkedIn API client (existing)
- [x] Twitter/X API client with OAuth 2.0
- [x] Thread generation for long content
- [x] Optimal timing scheduler

### Phase 3: Engagement Automation
- [x] Reply monitoring
- [x] Mention tracking
- [x] Auto-reactions to positive engagement
- [x] Follow-up idea generation from high performers

### Phase 4: Harness Integration
- [x] Cloudflare Worker with cron triggers
- [x] Beads oversight via pause/resume
- [x] Manual trigger endpoints
- [x] Queue-based posting

## Operational Checklist

### Daily Tasks (Automated)
- [ ] Poll content sources for new ideas
- [ ] Process idea queue (generate + review)
- [ ] Send scheduled posts at optimal times
- [ ] Monitor engagement and escalate issues

### Weekly Tasks (Human)
- [ ] Review rejected posts (failed voice validation)
- [ ] Handle escalated engagements
- [ ] Analyze performance metrics
- [ ] Adjust content strategy if needed

### Setup Tasks
- [ ] Deploy D1 database with migrations
- [ ] Configure LinkedIn OAuth tokens
- [ ] Configure Twitter OAuth tokens
- [ ] Set Anthropic API key
- [ ] Deploy worker with cron triggers
- [ ] Test end-to-end flow

## Commands

```bash
# Add manual idea
curl -X POST https://social-agent.workers.dev/ideas \
  -H "Content-Type: application/json" \
  -d '{"content": "Write about the Subtractive Triad", "platforms": ["linkedin"]}'

# Check queue stats
curl https://social-agent.workers.dev/stats

# Pause agent
curl -X POST https://social-agent.workers.dev/pause

# Resume agent
curl -X POST https://social-agent.workers.dev/resume

# Manual poll trigger
curl https://social-agent.workers.dev/trigger/poll

# Manual process trigger
curl https://social-agent.workers.dev/trigger/process
```

## Beads Integration

The agent respects Beads for human oversight:

```bash
# Emergency stop
bd create "Social agent needs pause" --label social-pause

# Resume after review
bd close <issue-id>
```

The worker checks for `social-pause` labeled issues before each run.
