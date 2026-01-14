# @create-something/social-agent

Fully autonomous multi-platform social agent for WORKWAY and CREATE SOMETHING.

## Philosophy

**Zuhandenheit**: The agent recedes into transparent operation. When working, you don't think about the agent—you review progress and redirect when needed.

## Architecture

```
Content Sources → Idea Queue → Generator → Self-Review → Scheduler → Platforms
```

### Content Sources
- **Repo Activity**: Git commits, PRDs, code changes
- **Papers/Experiments**: New research from packages/io
- **Manual Input**: API endpoint for direct ideas
- **External Triggers**: News mentions, competitor posts

### Platforms
- **LinkedIn**: Longform posts (up to 3000 chars), research-backed timing
- **Twitter/X**: Threaded posts (280 chars), higher frequency

## Safety Rails

- **Voice compliance**: 85% threshold for autonomous posting
- **Rate limiting**: Max 1 LinkedIn/day, 5 tweets/day
- **Emergency stop**: Create Beads issue \`social-pause\` to halt all activity
- **Audit log**: Full reasoning trace for every post

## Usage

```typescript
import { SocialAgent } from '@create-something/social-agent';

const agent = new SocialAgent({
  db: env.DB,
  kv: env.SESSIONS,
  anthropicApiKey: env.ANTHROPIC_API_KEY
});

// Process pending ideas
await agent.processIdeas();

// Add manual idea
await agent.addIdea({
  source: 'manual',
  content: 'Write about the Subtractive Triad applied to meetings',
  platforms: ['linkedin', 'twitter']
});
```

## Database Schema

See `migrations/0001_ideas.sql` for the idea queue schema.

## Integration with Existing Infrastructure

- Uses `packages/agency/src/lib/social/linkedin-client.ts` for LinkedIn API
- Uses `packages/agency/src/lib/social/strategy.ts` for optimal timing
- Uses `packages/ltd/src/lib/voice-audit/` for content validation
- Integrates with `packages/harness/` for autonomous orchestration

## License

MIT
