/**
 * OUTERFIELDS PCN Documentation Content
 * Comprehensive platform documentation for MCP server
 */

export const COMPONENT_DOCS: Record<string, string> = {
	VideoModal: `# VideoModal Component

## Purpose
Full-screen cinematic video player with engagement tracking. Records every second watched and stores it in Cloudflare KV for heatmap visualization.

## Key Features
- Custom play/pause controls matching OUTERFIELDS brand (#7c2bee purple)
- Real-time engagement tracking (10-second intervals)
- Glassmorphism overlay UI
- Keyboard controls (Space to play/pause, Escape to close)
- Auto-tracking: Replays detected and logged separately

## Implementation Details

**Location**: \`src/lib/components/VideoModal.svelte\`

**Props**:
\`\`\`typescript
interface Props {
  videoId: string;
  videoUrl: string;
  title: string;
  show: boolean;
  onclose?: () => void;
}
\`\`\`

**Engagement Tracking**:
\`\`\`typescript
// Tracks engagement every 10 seconds
async function trackEngagement() {
  const currentTime = video.currentTime;
  const duration = video.duration;

  await fetch(\\\`/api/videos/\\\${videoId}/engagement\\\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: currentTime,
      duration,
      completed: currentTime >= duration * 0.95
    })
  });
}
\`\`\`

**Storage**: Cloudflare KV
- Key pattern: \`video:{videoId}:engagement\`
- Value: JSON array of \`{ timestamp, count, lastWatched }\` objects

## Usage Example
\`\`\`svelte
<VideoModal
  videoId="demo-video"
  videoUrl="/videos/demo.mp4"
  title="Platform Demo"
  show={showModal}
  onclose={() => showModal = false}
/>
\`\`\`

## Related Components
- **Heatmap**: Visualizes this engagement data
- **MetricsDashboard**: Displays aggregate stats`,

	Heatmap: `# Heatmap Component

## Purpose
Visual representation of video replay patterns. Shows which moments viewers rewatch, revealing the most engaging content.

## Key Features
- Interactive visualization of engagement data
- Color intensity: dark (low replays) to purple (high replays)
- Hover tooltips showing exact replay counts
- Real-time updates from Svelte store
- Responsive grid layout

## Implementation Details

**Location**: \`src/lib/components/Heatmap.svelte\`

**Props**:
\`\`\`typescript
interface Props {
  videoId: string;
}
\`\`\`

**Data Source**:
\`\`\`typescript
import { engagementStats } from '$lib/stores/engagementStats';

// Reactive to store updates
$: stats = $engagementStats[videoId] || [];
\`\`\`

**Visualization Logic**:
- Divides video into 100 segments (0-99%)
- Each segment shows replay count
- Color scale: \`rgba(124, 43, 238, {intensity})\`
- Max intensity = most replayed moment

## CSS Pattern
\`\`\`css
.heatmap-cell {
  background: linear-gradient(
    to bottom,
    rgba(124, 43, 238, var(--intensity)),
    rgba(124, 43, 238, calc(var(--intensity) * 0.5))
  );
  transition: all var(--duration-micro) var(--ease-standard);
}
\`\`\`

## Usage Example
\`\`\`svelte
<Heatmap videoId="demo-video" />
\`\`\`

## Related Components
- **VideoModal**: Generates the engagement data
- **engagementStats**: Svelte store managing state`,

	MetricsDashboard: `# MetricsDashboard Component

## Purpose
Real-time analytics display showing platform-wide video engagement metrics.

## Key Features
- Total views counter
- Average completion rate (%)
- Total watch time (hours:minutes)
- Live updates from engagement data
- Glassmorphism cards with hover states

## Implementation Details

**Location**: \`src/lib/components/MetricsDashboard.svelte\`

**Metrics Calculation**:
\`\`\`typescript
// From engagement store
const totalViews = Object.values($engagementStats)
  .reduce((sum, video) => sum + video.length, 0);

const avgCompletion = Object.values($engagementStats)
  .map(video => video.filter(e => e.completed).length / video.length)
  .reduce((sum, rate) => sum + rate, 0) / videoCount;
\`\`\`

## Usage Example
\`\`\`svelte
<MetricsDashboard />
\`\`\``,

	ComponentLab: `# ComponentLab Component

## Purpose
Live preview system for showcasing PCN components with interactive demos and documentation links.

## Key Features
- Grid layout with component cards
- Hover overlays with "View Docs" buttons
- Live component previews embedded in cards
- Anchor link navigation to detailed docs

## Implementation Details

**Location**: \`src/lib/components/ComponentLab.svelte\`

**Usage Example**:
\`\`\`svelte
<ComponentLab />
\`\`\``,

	Navigation: `# Navigation Component

## Purpose
Fixed header navigation with authentication state awareness and OUTERFIELDS branding.

## Key Features
- Fixed positioning with glassmorphism background
- Logo with purple accent (#7c2bee)
- Auth state display
- Responsive design

## Implementation Details

**Location**: \`src/lib/components/Navigation.svelte\`

**Usage Example**:
\`\`\`svelte
<Navigation user={data.user} />
\`\`\``
};

export const PATTERN_DOCS: Record<string, string> = {
	'engagement-tracking': `# Engagement Tracking Pattern

## Architecture

\`\`\`
VideoModal (Frontend)
    ↓ trackEngagement() every 10s
API Endpoint (/api/videos/[id]/engagement)
    ↓ Store in KV
Cloudflare KV (Storage)
    ↓ Read by
engagementStats Store (State)
    ↓ Consumed by
Heatmap + MetricsDashboard (Display)
\`\`\`

## Frontend Tracking

\`\`\`typescript
let trackingInterval: number;

function startTracking() {
  trackingInterval = setInterval(() => {
    trackEngagement();
  }, 10000); // Every 10 seconds
}

async function trackEngagement() {
  const res = await fetch(\\\`/api/videos/\\\${videoId}/engagement\\\`, {
    method: 'POST',
    body: JSON.stringify({
      timestamp: video.currentTime,
      duration: video.duration,
      completed: video.currentTime >= duration * 0.95
    })
  });
}
\`\`\`

## API Endpoint

\`\`\`typescript
export const POST: RequestHandler = async ({ params, request, platform }) => {
  const { videoId } = params;
  const { timestamp, duration, completed } = await request.json();

  const kv = platform?.env.KV;
  const key = \\\`video:\\\${videoId}:engagement\\\`;

  const existing = await kv.get(key, 'json') || [];
  const segmentIndex = Math.floor((timestamp / duration) * 100);

  existing[segmentIndex] = {
    timestamp,
    count: (existing[segmentIndex]?.count || 0) + 1,
    lastWatched: Date.now()
  };

  await kv.put(key, JSON.stringify(existing));
  return json({ success: true });
};
\`\`\`

## Best Practices
- Track in 10-second intervals
- Use 100 segments for heatmap
- Detect replays: count > 1
- Completion threshold: 95% watched`,

	'analytics-pipeline': `# Analytics Pipeline Pattern

## Data Flow

\`\`\`
Video Engagement (KV)
    ↓ API fetch
engagementStats Store
    ↓ Reactive ($)
Components Subscribe
    ↓ Calculate metrics
Display Updates
\`\`\`

## Store Implementation

\`\`\`typescript
import { writable, derived } from 'svelte/store';

export const engagementStats = writable<Record<string, EngagementData[]>>({});

export const totalViews = derived(
  engagementStats,
  $stats => Object.values($stats).reduce((sum, video) => sum + video.length, 0)
);
\`\`\``,

	'cloudflare-integration': `# Cloudflare Integration Pattern

## Resources Used

**D1 (SQLite Database)**: User accounts, video metadata
**KV (Key-Value Store)**: Engagement tracking, sessions
**R2 (Object Storage)**: Video files, thumbnails
**Pages (Hosting)**: SvelteKit application

## Configuration

\`\`\`json
{
  "name": "outerfields-pcn",
  "d1_databases": [{
    "binding": "DB",
    "database_id": "..."
  }],
  "kv_namespaces": [{
    "binding": "KV",
    "id": "..."
  }]
}
\`\`\`

## Access Pattern

\`\`\`typescript
export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  const kv = platform?.env.KV;

  const users = await db.prepare('SELECT * FROM users').all();
  const engagement = await kv.get('video:demo:engagement', 'json');

  return { users, engagement };
};
\`\`\``,

	authentication: `# Authentication Pattern

## Flow

\`\`\`
User enters email
    ↓
Magic link generated
    ↓
Email sent
    ↓
User clicks link
    ↓
Session created in KV
    ↓
Cookie set
    ↓
Protected routes accessible
\`\`\`

## Implementation

\`\`\`typescript
// Login endpoint
export const POST: RequestHandler = async ({ request, platform }) => {
  const { email } = await request.json();
  const token = crypto.randomUUID();

  await platform.env.KV.put(
    \\\`magic:\\\${token}\\\`,
    JSON.stringify({ email, created: Date.now() }),
    { expirationTtl: 900 }
  );

  await sendEmail(email, \\\`https://outerfields.io/auth/verify?token=\\\${token}\\\`);
  return json({ success: true });
};
\`\`\``,

	deployment: `# Deployment Pattern

## Build Process

\`\`\`bash
pnpm install
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=outerfields-pcn
\`\`\`

## Environment Variables

**Production**: Set in Cloudflare Dashboard
**Local**: \`.dev.vars\` file

\`\`\`
DATABASE_URL=http://localhost:8787
KV_NAMESPACE_ID=local
RESEND_API_KEY=re_...
\`\`\`

## Monitoring

\`\`\`bash
wrangler pages deployment tail --project-name=outerfields-pcn
\`\`\``
};

export const EXTENSION_GUIDES: Record<string, string> = {
	'add-metric': `# Guide: Add a New Analytics Metric

## Step-by-Step

### 1. Add Calculation to Store

**File**: \`src/lib/stores/engagementStats.ts\`

\`\`\`typescript
import { derived } from 'svelte/store';
import { engagementStats } from './engagementStats';

export const mostReplayedVideo = derived(
  engagementStats,
  $stats => {
    let maxReplays = 0;
    let videoId = '';

    for (const [id, data] of Object.entries($stats)) {
      const totalReplays = data.reduce((sum, segment) => sum + segment.count, 0);
      if (totalReplays > maxReplays) {
        maxReplays = totalReplays;
        videoId = id;
      }
    }

    return { videoId, replays: maxReplays };
  }
);
\`\`\`

### 2. Add Metric Card to Dashboard

**File**: \`src/lib/components/MetricsDashboard.svelte\`

\`\`\`svelte
<script lang="ts">
  import { mostReplayedVideo } from '$lib/stores/engagementStats';
  $: topVideo = $mostReplayedVideo;
</script>

<div class="metric-card">
  <span class="metric-value">{topVideo.videoId}</span>
  <span class="metric-label">Most Replayed Video</span>
</div>
\`\`\`

### 3. Test

\`\`\`bash
pnpm dev
# Visit /admin-demo to verify
\`\`\``,

	'new-video-feature': `# Guide: Add Video Player Feature

## Example: Playback Speed Control

### 1. Add State

\`\`\`typescript
let playbackSpeed = 1;
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

function changeSpeed(newSpeed: number) {
  playbackSpeed = newSpeed;
  if (video) {
    video.playbackRate = newSpeed;
  }
}
\`\`\`

### 2. Add UI

\`\`\`svelte
<button on:click={() => showSpeedMenu = !showSpeedMenu}>
  {playbackSpeed}x
</button>
\`\`\``,

	'custom-heatmap': `# Guide: Create Custom Heatmap

## Example: Timeline Heatmap

\`\`\`svelte
<script lang="ts">
  import { engagementStats } from '$lib/stores/engagementStats';

  export let videoId: string;
  $: stats = $engagementStats[videoId] || [];
</script>

<div class="timeline-heatmap">
  {#each stats as segment}
    <div class="segment" style="--intensity: {segment.count / maxCount}" />
  {/each}
</div>
\`\`\``,

	'api-endpoint': `# Guide: Create New API Endpoint

## Example: Video Statistics

**File**: \`src/routes/api/videos/[id]/stats/+server.ts\`

\`\`\`typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform }) => {
  const { id } = params;
  const kv = platform?.env.KV;

  const engagement = await kv.get(\\\`video:\\\${id}:engagement\\\`, 'json') || [];

  const stats = {
    totalViews: engagement.length,
    totalReplays: engagement.reduce((sum, s) => sum + s.count, 0),
    completionRate: engagement.filter(s => s.completed).length / engagement.length
  };

  return json(stats);
};
\`\`\`

## Test

\`\`\`bash
curl http://localhost:5173/api/videos/demo-video/stats
\`\`\``,

	'admin-feature': `# Guide: Add Admin-Only Feature

## Example: Video Management Panel

### 1. Create Auth Guard

\`\`\`typescript
export async function requireAdmin(event: RequestEvent) {
  const session = await getSession(event);
  if (!session || session.role !== 'admin') {
    throw error(403, 'Admin access required');
  }
  return session;
}
\`\`\`

### 2. Create Admin Route

**File**: \`src/routes/admin/videos/+page.server.ts\`

\`\`\`typescript
export const load: PageServerLoad = async (event) => {
  const admin = await requireAdmin(event);
  const videos = await event.platform?.env.DB.prepare('SELECT * FROM videos').all();
  return { admin, videos: videos.results };
};
\`\`\``
};

export const DEPLOYMENT_DOCS: Record<string, string> = {
	'build-deploy': `# Build and Deploy

## Local Build

\`\`\`bash
pnpm install
pnpm build
pnpm preview
\`\`\`

## Deploy to Cloudflare Pages

\`\`\`bash
wrangler pages deploy .svelte-kit/cloudflare --project-name=outerfields-pcn
\`\`\`

## Automatic Deployment

Push to main branch for auto-deploy via Cloudflare Git integration.`,

	'environment-vars': `# Environment Variables

## Required Variables

### Local (.dev.vars)

\`\`\`
DATABASE_URL=http://localhost:8787
KV_NAMESPACE_ID=local
RESEND_API_KEY=re_...
\`\`\`

### Production

Set in Cloudflare Dashboard → Pages → Environment variables

## Access in Code

\`\`\`typescript
const key = platform?.env.RESEND_API_KEY;
\`\`\``,

	troubleshooting: `# Troubleshooting

## Build Fails

\`\`\`bash
rm -rf node_modules .svelte-kit
pnpm install
pnpm build
\`\`\`

## Type Errors

\`\`\`bash
pnpm exec wrangler types
pnpm exec svelte-kit sync
\`\`\`

## Runtime Errors

Check platform.env is defined:

\`\`\`typescript
if (!platform?.env.KV) {
  throw error(500, 'KV not available');
}
\`\`\``,

	'database-migrations': `# Database Migrations

## Create Migration

\`\`\`bash
wrangler d1 migrations create outerfields_pcn add_feature
\`\`\`

## Apply Migration

\`\`\`bash
# Local
wrangler d1 migrations apply outerfields_pcn --local

# Production
wrangler d1 migrations apply outerfields_pcn
\`\`\``,

	monitoring: `# Monitoring

## Cloudflare Analytics

View in Dashboard → Pages → outerfields-pcn → Analytics

## Logs

\`\`\`bash
wrangler pages deployment tail --project-name=outerfields-pcn
\`\`\`

## Custom Analytics

\`\`\`typescript
await fetch('/api/analytics', {
  method: 'POST',
  body: JSON.stringify({
    event: 'video_play',
    data: { videoId, userId }
  })
});
\`\`\``
};

export const ARCHITECTURE_DOC = `# OUTERFIELDS PCN Architecture

## System Overview

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    OUTERFIELDS PCN                           │
│             Premium Content Network Platform                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (SvelteKit)                        │
├─────────────────────────────────────────────────────────────┤
│  • VideoModal: Player + engagement tracking                 │
│  • Heatmap: Replay visualization                            │
│  • MetricsDashboard: Real-time analytics                    │
│  • ComponentLab: Live previews                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Edge Platform                    │
├─────────────────────────────────────────────────────────────┤
│  D1 Database  │  KV Storage   │  R2 Storage  │  Pages      │
│  • users      │  • engagement │  • videos    │  • Hosting  │
│  • videos     │  • sessions   │  • assets    │  • Edge     │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Data Flow: Engagement Tracking

\`\`\`
1. User plays video → VideoModal
2. Track every 10s → POST /api/videos/[id]/engagement
3. Store in KV → video:{id}:engagement
4. Fetch on demand → engagementStats store
5. Reactive display → Heatmap + MetricsDashboard
\`\`\`

## Technology Stack

**Frontend**: SvelteKit 2.0, TypeScript, Tailwind + Canon
**Backend**: Cloudflare Workers, D1, KV, R2
**Deployment**: Cloudflare Pages (global edge)`;
