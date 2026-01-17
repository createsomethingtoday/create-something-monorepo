#!/usr/bin/env node
/**
 * OUTERFIELDS Premium Content Network (PCN) - MCP Server
 *
 * AI-native platform exploration and guidance for OUTERFIELDS PCN.
 * Provides intelligent codebase understanding, architectural patterns,
 * and extension guidance directly in Claude Desktop.
 *
 * @example
 * # In Claude Desktop settings (~/Library/Application Support/Claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "outerfields-pcn": {
 *       "command": "npx",
 *       "args": ["@outerfields/pcn-tools"]
 *     }
 *   }
 * }
 *
 * Then in any Claude Desktop chat:
 * - "How does engagement tracking work in my PCN platform?"
 * - "Explain the VideoModal component"
 * - "How do I add a new analytics metric?"
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool
} from '@modelcontextprotocol/sdk/types.js';
import { PATTERN_TOOLS, handlePatternTool } from './tools/patterns.js';
import { CODIFICATION_TOOLS, handleCodificationTool } from './tools/codification.js';

const SERVER_NAME = 'outerfields-pcn';
const SERVER_VERSION = '2.0.0'; // Updated for AI-native features

const TOOLS: Tool[] = [
	{
		name: 'pcn_explore_component',
		description: `Understand how a specific component works in your PCN platform.

Available components:
- VideoModal: Cinematic video player with engagement tracking
- Heatmap: Visual replay pattern analysis
- MetricsDashboard: Real-time analytics display
- ComponentLab: Live component preview system
- Navigation: Fixed header with auth state

Returns: Component purpose, key features, implementation details, and usage examples.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				component: {
					type: 'string',
					enum: ['VideoModal', 'Heatmap', 'MetricsDashboard', 'ComponentLab', 'Navigation'],
					description: 'The component to explore'
				}
			},
			required: ['component']
		}
	},
	{
		name: 'pcn_explain_pattern',
		description: `Explain architectural patterns used in your PCN platform.

Available patterns:
- engagement-tracking: How video engagement is tracked and stored
- analytics-pipeline: Real-time metrics collection and display
- cloudflare-integration: D1, KV, R2 usage patterns
- authentication: Auth flow and protected routes
- deployment: Build and deploy process

Returns: Pattern explanation, code examples, and best practices.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				pattern: {
					type: 'string',
					enum: [
						'engagement-tracking',
						'analytics-pipeline',
						'cloudflare-integration',
						'authentication',
						'deployment'
					],
					description: 'The architectural pattern to explain'
				}
			},
			required: ['pattern']
		}
	},
	{
		name: 'pcn_guide_extension',
		description: `Get step-by-step guidance for extending your PCN platform.

Common extensions:
- add-metric: Add a new analytics metric to the dashboard
- new-video-feature: Add functionality to the video player
- custom-heatmap: Create custom heatmap visualizations
- api-endpoint: Create new API endpoints
- admin-feature: Add admin-only functionality

Returns: Implementation steps, code examples, files to modify, and testing guidance.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				extension: {
					type: 'string',
					enum: [
						'add-metric',
						'new-video-feature',
						'custom-heatmap',
						'api-endpoint',
						'admin-feature'
					],
					description: 'The type of extension you want to add'
				},
				details: {
					type: 'string',
					description: 'Optional: Specific details about what you want to build'
				}
			},
			required: ['extension']
		}
	},
	{
		name: 'pcn_deployment',
		description: `Get deployment and maintenance guidance for your PCN platform.

Topics:
- build-deploy: Build process and Cloudflare Pages deployment
- environment-vars: Required environment variables and bindings
- troubleshooting: Common deployment issues and solutions
- database-migrations: D1 database schema updates
- monitoring: Analytics and error tracking

Returns: Deployment commands, configuration details, and best practices.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				topic: {
					type: 'string',
					enum: [
						'build-deploy',
						'environment-vars',
						'troubleshooting',
						'database-migrations',
						'monitoring'
					],
					description: 'The deployment topic'
				}
			},
			required: ['topic']
		}
	},
	{
		name: 'pcn_architecture',
		description: `Get a high-level overview of your PCN platform architecture.

Shows:
- System architecture diagram
- Key components and their relationships
- Data flow (video upload → storage → analytics → display)
- Cloudflare resources (D1, KV, R2, Pages)
- Technology stack (SvelteKit, TypeScript, Tailwind + Canon)

Returns: Comprehensive platform overview with visual diagrams.`,
		inputSchema: {
			type: 'object' as const,
			properties: {}
		}
	}
];

class OuterfieldsServer {
	private server: Server;

	constructor() {
		this.server = new Server(
			{
				name: SERVER_NAME,
				version: SERVER_VERSION
			},
			{
				capabilities: {
					tools: {}
				}
			}
		);

		this.setupHandlers();
	}

	private setupHandlers() {
		// Combine all tools: original + pattern analysis + codification
		const allTools = [...TOOLS, ...PATTERN_TOOLS, ...CODIFICATION_TOOLS];
		
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: allTools
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			try {
				// Handle original tools
				switch (name) {
					case 'pcn_explore_component':
						return await this.handleExploreComponent(args);
					case 'pcn_explain_pattern':
						return await this.handleExplainPattern(args);
					case 'pcn_guide_extension':
						return await this.handleGuideExtension(args);
					case 'pcn_deployment':
						return await this.handleDeployment(args);
					case 'pcn_architecture':
						return await this.handleArchitecture();
				}
				
				// Handle AI-native pattern tools
				if (name.startsWith('pcn_analyze') || name.startsWith('pcn_detect') || name === 'pcn_get_pattern_details') {
					const result = await handlePatternTool(name, args || {});
					return { content: [{ type: 'text' as const, text: result }] };
				}
				
				// Handle AI-native codification tools
				if (name.startsWith('pcn_suggest') || name.startsWith('pcn_update') || name.startsWith('pcn_escalate') || name === 'pcn_list_proposals') {
					const result = await handleCodificationTool(name, args || {});
					return { content: [{ type: 'text' as const, text: result }] };
				}
				
				throw new Error(`Unknown tool: ${name}`);
			} catch (error) {
				return {
					content: [
						{
							type: 'text' as const,
							text: `Error: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		});
	}

	private async handleExploreComponent(args: Record<string, unknown> | undefined) {
		const component = args?.component as string;

		const componentDocs: Record<string, string> = {
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

  await fetch(\`/api/videos/\${videoId}/engagement\`, {
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
- Key pattern: \`video:\${videoId}:engagement\`
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

**Props**:
\`\`\`typescript
interface Props {
  // No props - fetches all platform data
}
\`\`\`

**Metrics Calculation**:
\`\`\`typescript
// From engagement store
const totalViews = Object.values($engagementStats)
  .reduce((sum, video) => sum + video.length, 0);

const avgCompletion = Object.values($engagementStats)
  .map(video => video.filter(e => e.completed).length / video.length)
  .reduce((sum, rate) => sum + rate, 0) / videoCount;

const totalTime = Object.values($engagementStats)
  .reduce((sum, video) => sum + calculateWatchTime(video), 0);
\`\`\`

## Metric Cards
Each metric uses Canon design tokens:
- Background: \`var(--color-bg-surface)\`
- Border: \`var(--color-border-default)\`
- Text: \`var(--color-fg-primary)\`
- Accent: \`#7c2bee\` (OUTERFIELDS purple)

## Usage Example
\`\`\`svelte
<MetricsDashboard />
\`\`\`

## Extension Points
To add a new metric:
1. Calculate value from \`$engagementStats\`
2. Add new card in template
3. Style with existing \`.metric-card\` class`,

			ComponentLab: `# ComponentLab Component

## Purpose
Live preview system for showcasing PCN components with interactive demos and documentation links.

## Key Features
- Grid layout with component cards
- Hover overlays with "View Docs" buttons
- Live component previews embedded in cards
- Anchor link navigation to detailed docs
- Glassmorphism styling

## Implementation Details

**Location**: \`src/lib/components/ComponentLab.svelte\`

**Component Cards**:
\`\`\`typescript
const components = [
  {
    name: 'Cinematic Player',
    description: 'Full-screen video with engagement tracking',
    preview: VideoModal,
    docsLink: '#video-modal-docs'
  },
  {
    name: 'Heatmap Visualization',
    description: 'Interactive replay pattern analysis',
    preview: Heatmap,
    docsLink: '#heatmap-docs'
  },
  // ...
];
\`\`\`

**Hover Interaction**:
- Overlay fades in on hover
- Card scales slightly (\`transform: scale(1.02)\`)
- Border color intensifies
- "View Docs" button appears

## CSS Pattern
\`\`\`css
.component-card:hover .preview-overlay {
  opacity: 1;
}

.component-card:hover {
  transform: scale(1.02);
  border-color: var(--color-border-emphasis);
}
\`\`\`

## Usage Example
\`\`\`svelte
<ComponentLab />
\`\`\`

## Related Pages
- **/design**: Contains ComponentLab section
- **/docs**: Detailed documentation targets`,

			Navigation: `# Navigation Component

## Purpose
Fixed header navigation with authentication state awareness and OUTERFIELDS branding.

## Key Features
- Fixed positioning with glassmorphism background
- Logo with purple accent (#7c2bee)
- Auth state display (logged in user or login/signup links)
- Responsive design
- Smooth transitions

## Implementation Details

**Location**: \`src/lib/components/Navigation.svelte\`

**Props**:
\`\`\`typescript
interface Props {
  user?: { email: string } | null;
}
\`\`\`

**Structure**:
\`\`\`svelte
<header class="nav-header">
  <nav class="nav-content">
    <a href="/" class="logo">
      <Film size={32} color="#7c2bee" />
      <span>OUTERFIELDS</span>
    </a>

    <div class="nav-links">
      {#if user}
        <span>{user.email}</span>
        <a href="/admin-demo">Admin</a>
      {:else}
        <a href="/login">Login</a>
        <a href="/signup">Sign Up</a>
      {/if}
    </div>
  </nav>
</header>
\`\`\`

## Positioning
\`\`\`css
.nav-header {
  position: fixed;
  top: 0;
  z-index: 50;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.9),
    transparent
  );
}
\`\`\`

## Usage Example
\`\`\`svelte
<Navigation user={data.user} />
\`\`\`

## Related Patterns
- Auth state passed from \`+layout.server.ts\`
- Fixed header requires \`scroll-margin-top\` on content`
		};

		const output = componentDocs[component] || 'Component documentation not found.';

		return {
			content: [{ type: 'text' as const, text: output }]
		};
	}

	private async handleExplainPattern(args: Record<string, unknown> | undefined) {
		const pattern = args?.pattern as string;

		const patternDocs: Record<string, string> = {
			'engagement-tracking': `# Engagement Tracking Pattern

## Overview
Tracks every second of video watched, detecting replays and storing data in Cloudflare KV for real-time analytics.

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

## Implementation

**1. Frontend Tracking (VideoModal.svelte)**
\`\`\`typescript
let trackingInterval: number;

function startTracking() {
  trackingInterval = setInterval(() => {
    trackEngagement();
  }, 10000); // Every 10 seconds
}

async function trackEngagement() {
  const res = await fetch(\`/api/videos/\${videoId}/engagement\`, {
    method: 'POST',
    body: JSON.stringify({
      timestamp: video.currentTime,
      duration: video.duration,
      completed: video.currentTime >= video.duration * 0.95
    })
  });
}
\`\`\`

**2. API Endpoint (+server.ts)**
\`\`\`typescript
export const POST: RequestHandler = async ({ params, request, platform }) => {
  const { videoId } = params;
  const { timestamp, duration, completed } = await request.json();

  const kv = platform?.env.KV;
  const key = \`video:\${videoId}:engagement\`;

  // Get existing data
  const existing = await kv.get(key, 'json') || [];

  // Find or create segment
  const segmentIndex = Math.floor((timestamp / duration) * 100);
  const segment = existing[segmentIndex] || { timestamp, count: 0 };

  // Increment replay count
  segment.count++;
  segment.lastWatched = Date.now();

  existing[segmentIndex] = segment;

  // Store back to KV
  await kv.put(key, JSON.stringify(existing));

  return json({ success: true });
};
\`\`\`

**3. State Management (engagementStats.ts)**
\`\`\`typescript
import { writable } from 'svelte/store';

export const engagementStats = writable<Record<string, EngagementData[]>>({});

// Fetch and populate
export async function loadEngagement(videoId: string) {
  const res = await fetch(\`/api/videos/\${videoId}/engagement\`);
  const data = await res.json();

  engagementStats.update(stats => ({
    ...stats,
    [videoId]: data
  }));
}
\`\`\`

## Data Structure

**KV Storage**:
\`\`\`json
{
  "video:demo-video:engagement": [
    { "timestamp": 0, "count": 145, "lastWatched": 1704067200000 },
    { "timestamp": 5, "count": 132, "lastWatched": 1704067205000 },
    { "timestamp": 15, "count": 178, "lastWatched": 1704067215000 }
  ]
}
\`\`\`

## Best Practices
- Track in 10-second intervals (balance between granularity and API calls)
- Use 100 segments for heatmap (0-99% of video)
- Detect replays: \`count > 1\` indicates rewatch
- Completion threshold: 95% watched = completed`,

			'analytics-pipeline': `# Analytics Pipeline Pattern

## Overview
Real-time metrics collection, aggregation, and display using Svelte stores and reactive components.

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

## Implementation

**1. Central Store (engagementStats.ts)**
\`\`\`typescript
import { writable, derived } from 'svelte/store';

// Raw engagement data
export const engagementStats = writable<Record<string, EngagementData[]>>({});

// Derived metrics
export const totalViews = derived(
  engagementStats,
  $stats => Object.values($stats).reduce((sum, video) => sum + video.length, 0)
);

export const avgCompletion = derived(
  engagementStats,
  $stats => {
    const rates = Object.values($stats).map(video =>
      video.filter(e => e.completed).length / video.length
    );
    return rates.reduce((sum, r) => sum + r, 0) / rates.length;
  }
);
\`\`\`

**2. Component Subscription**
\`\`\`svelte
<script lang="ts">
  import { totalViews, avgCompletion } from '$lib/stores/engagementStats';

  // Auto-reactive
  $: views = $totalViews;
  $: completion = $avgCompletion;
</script>

<div class="metric">
  <span class="value">{views.toLocaleString()}</span>
  <span class="label">Total Views</span>
</div>
\`\`\`

**3. Real-time Updates**
\`\`\`typescript
// Load initial data
onMount(async () => {
  const videoIds = ['demo', 'tutorial', 'product'];

  await Promise.all(
    videoIds.map(id => loadEngagement(id))
  );
});

// Update on engagement tracking
async function trackEngagement() {
  await fetch('/api/videos/demo/engagement', { method: 'POST', ... });

  // Refresh store
  await loadEngagement('demo');
}
\`\`\`

## Metrics Calculated

**Total Views**: Sum of all engagement entries
**Avg Completion**: % of videos watched to 95%+
**Total Watch Time**: Sum of all timestamp durations
**Most Replayed Segment**: Max count across all videos

## Performance
- Stores cached in client
- API calls only on mount and after tracking
- Derived stores auto-update (no manual recalc)
- Reactive \`$\` syntax triggers re-renders`,

			'cloudflare-integration': `# Cloudflare Integration Pattern

## Overview
OUTERFIELDS PCN uses Cloudflare edge platform for zero-latency data access worldwide.

## Resources Used

**D1 (SQLite Database)**:
- User accounts
- Video metadata
- Analytics aggregations

**KV (Key-Value Store)**:
- Engagement tracking (high-write, low-latency)
- Session data
- Cache layer

**R2 (Object Storage)**:
- Video files
- Thumbnails
- Static assets

**Pages (Hosting)**:
- SvelteKit application
- Edge-rendered routes
- Automatic deployments

## Configuration

**wrangler.jsonc**:
\`\`\`json
{
  "name": "outerfields-pcn",
  "pages_build_output_dir": ".svelte-kit/cloudflare",
  "compatibility_date": "2024-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "outerfields_pcn",
      "database_id": "..."
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "..."
    }
  ],
  "r2_buckets": [
    {
      "binding": "VIDEOS",
      "bucket_name": "outerfields-videos"
    }
  ]
}
\`\`\`

## Access Pattern

**In SvelteKit Routes**:
\`\`\`typescript
// +page.server.ts or +server.ts
export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  const kv = platform?.env.KV;
  const r2 = platform?.env.VIDEOS;

  // D1 query
  const users = await db.prepare('SELECT * FROM users').all();

  // KV get
  const engagement = await kv.get('video:demo:engagement', 'json');

  // R2 get
  const video = await r2.get('demo.mp4');

  return { users, engagement };
};
\`\`\`

## Best Practices

**D1**: Use for relational data (users, relationships)
**KV**: Use for high-frequency reads/writes (engagement tracking)
**R2**: Use for large files (videos, media)

**Performance Tips**:
- KV has 1ms global read latency
- D1 has 10ms regional read latency
- R2 has ~50ms for large objects
- Cache KV reads in Svelte stores`,

			authentication: `# Authentication Pattern

## Overview
Magic link authentication with session management via Cloudflare KV.

## Flow

\`\`\`
User enters email
    ↓
Backend generates magic link
    ↓
Email sent (via Resend API)
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

**1. Login Endpoint (+server.ts)**
\`\`\`typescript
export const POST: RequestHandler = async ({ request, platform }) => {
  const { email } = await request.json();

  // Generate token
  const token = crypto.randomUUID();

  // Store in KV (expires in 15 minutes)
  await platform.env.KV.put(
    \`magic:\${token}\`,
    JSON.stringify({ email, created: Date.now() }),
    { expirationTtl: 900 }
  );

  // Send email with link
  const magicLink = \`https://outerfields.io/auth/verify?token=\${token}\`;
  await sendEmail(email, magicLink);

  return json({ success: true });
};
\`\`\`

**2. Verify Endpoint**
\`\`\`typescript
export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  const token = url.searchParams.get('token');

  // Verify token
  const data = await platform.env.KV.get(\`magic:\${token}\`, 'json');
  if (!data) {
    throw error(401, 'Invalid or expired link');
  }

  // Create session
  const sessionId = crypto.randomUUID();
  await platform.env.KV.put(
    \`session:\${sessionId}\`,
    JSON.stringify({ email: data.email }),
    { expirationTtl: 86400 * 30 } // 30 days
  );

  // Set cookie
  cookies.set('session', sessionId, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 86400 * 30
  });

  // Delete magic link token
  await platform.env.KV.delete(\`magic:\${token}\`);

  throw redirect(303, '/demo');
};
\`\`\`

**3. Protected Routes (+page.server.ts)**
\`\`\`typescript
export const load: PageServerLoad = async ({ cookies, platform }) => {
  const sessionId = cookies.get('session');

  if (!sessionId) {
    throw redirect(303, '/login');
  }

  const session = await platform.env.KV.get(\`session:\${sessionId}\`, 'json');

  if (!session) {
    throw redirect(303, '/login');
  }

  return { user: session };
};
\`\`\`

## Security
- Magic links expire in 15 minutes
- Sessions expire in 30 days
- HttpOnly cookies (XSS protection)
- Secure flag (HTTPS only)
- SameSite=lax (CSRF protection)`,

			deployment: `# Deployment Pattern

## Build Process

\`\`\`bash
# Install dependencies
pnpm install

# Build SvelteKit app
pnpm build

# Output: .svelte-kit/cloudflare/
\`\`\`

## Deploy to Cloudflare Pages

\`\`\`bash
# Deploy via Wrangler
wrangler pages deploy .svelte-kit/cloudflare --project-name=outerfields-pcn

# Or automatic via Git
git push origin main  # Auto-deploys on Cloudflare
\`\`\`

## Environment Variables

**Local Development (.dev.vars)**:
\`\`\`
DATABASE_URL=http://localhost:8787
KV_NAMESPACE_ID=local
R2_BUCKET=local
RESEND_API_KEY=re_...
\`\`\`

**Production (Cloudflare Dashboard)**:
- Set in Pages settings → Environment variables
- Or via: \`wrangler pages secret put KEY\`

## Database Migrations

\`\`\`bash
# Apply migration to D1
wrangler d1 migrations apply outerfields_pcn

# Local testing
wrangler d1 migrations apply outerfields_pcn --local
\`\`\`

## Rollback

\`\`\`bash
# List deployments
wrangler pages deployments list --project-name=outerfields-pcn

# Rollback to specific deployment
wrangler pages deployments rollback <DEPLOYMENT_ID> --project-name=outerfields-pcn
\`\`\`

## CI/CD with GitHub Actions

\`\`\`yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CF_API_TOKEN }}
          command: pages deploy .svelte-kit/cloudflare --project-name=outerfields-pcn
\`\`\`

## Monitoring

**View logs**:
\`\`\`bash
wrangler pages deployment tail --project-name=outerfields-pcn
\`\`\`

**Analytics**: Cloudflare Dashboard → Analytics → Web Analytics`
		};

		const output = patternDocs[pattern] || 'Pattern documentation not found.';

		return {
			content: [{ type: 'text' as const, text: output }]
		};
	}

	private async handleGuideExtension(args: Record<string, unknown> | undefined) {
		const extension = args?.extension as string;
		const details = (args?.details as string) || '';

		const extensionGuides: Record<string, string> = {
			'add-metric': `# Guide: Add a New Analytics Metric

## Overview
Add a custom metric to your MetricsDashboard by calculating from engagement data.

## Step-by-Step

### 1. Define Your Metric
Decide what you want to measure:
- Most popular video
- Peak viewing time
- Average session length
- Replay rate
${details ? `\n**Your Goal**: ${details}\n` : ''}

### 2. Add Calculation to Store

**File**: \`src/lib/stores/engagementStats.ts\`

\`\`\`typescript
import { derived } from 'svelte/store';
import { engagementStats } from './engagementStats';

// Example: Most replayed video
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

### 3. Add Metric Card to Dashboard

**File**: \`src/lib/components/MetricsDashboard.svelte\`

\`\`\`svelte
<script lang="ts">
  import { mostReplayedVideo } from '$lib/stores/engagementStats';

  $: topVideo = $mostReplayedVideo;
</script>

<div class="metrics-grid">
  <!-- Existing metrics... -->

  <!-- New metric -->
  <div class="metric-card">
    <div class="metric-icon">
      <Star size={24} color="#7c2bee" />
    </div>
    <div class="metric-content">
      <span class="metric-value">{topVideo.videoId}</span>
      <span class="metric-label">Most Replayed Video</span>
      <span class="metric-detail">{topVideo.replays} replays</span>
    </div>
  </div>
</div>
\`\`\`

### 4. Style the Card (Optional)

Existing \`.metric-card\` styles apply automatically. For custom styling:

\`\`\`css
.metric-card.highlight {
  border-color: var(--color-border-emphasis);
  background: linear-gradient(
    to bottom right,
    var(--color-bg-surface),
    rgba(124, 43, 238, 0.1)
  );
}
\`\`\`

### 5. Test

\`\`\`bash
pnpm dev
# Visit http://localhost:5173/admin-demo
# Verify new metric appears and calculates correctly
\`\`\`

## Best Practices
- Use derived stores for automatic reactivity
- Keep calculations efficient (they run on every update)
- Add error handling for edge cases (no data, division by zero)
- Use Canon tokens for consistent styling`,

			'new-video-feature': `# Guide: Add Video Player Feature

## Overview
Extend the VideoModal component with new functionality.

## Common Features to Add
- Playback speed controls
- Quality selection
- Picture-in-picture
- Keyboard shortcuts
- Chapters/markers
${details ? `\n**Your Goal**: ${details}\n` : ''}

## Example: Add Playback Speed Control

### 1. Add State

**File**: \`src/lib/components/VideoModal.svelte\`

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

### 2. Add UI Controls

\`\`\`svelte
<div class="video-controls">
  <!-- Existing controls... -->

  <div class="speed-control">
    <button class="speed-button" on:click={() => showSpeedMenu = !showSpeedMenu}>
      {playbackSpeed}x
    </button>

    {#if showSpeedMenu}
      <div class="speed-menu">
        {#each speeds as speed}
          <button
            class="speed-option"
            class:active={speed === playbackSpeed}
            on:click={() => changeSpeed(speed)}
          >
            {speed}x
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
\`\`\`

### 3. Style

\`\`\`css
.speed-control {
  position: relative;
}

.speed-button {
  padding: 0.5rem 1rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-fg-primary);
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-standard);
}

.speed-button:hover {
  border-color: var(--color-border-emphasis);
  background: var(--color-hover);
}

.speed-menu {
  position: absolute;
  bottom: 100%;
  right: 0;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.speed-option {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  color: var(--color-fg-secondary);
  cursor: pointer;
  text-align: left;
}

.speed-option:hover {
  background: var(--color-hover);
  color: var(--color-fg-primary);
}

.speed-option.active {
  color: #7c2bee;
  font-weight: 600;
}
\`\`\`

### 4. Test
- Verify speed changes apply immediately
- Test with keyboard (accessibility)
- Ensure menu closes on selection`,

			'custom-heatmap': `# Guide: Create Custom Heatmap Visualization

## Overview
Build a new visualization using engagement data.

## Example: Timeline Heatmap
${details ? `\n**Your Goal**: ${details}\n` : ''}

### 1. Create Component

**File**: \`src/lib/components/TimelineHeatmap.svelte\`

\`\`\`svelte
<script lang="ts">
  import { engagementStats } from '$lib/stores/engagementStats';

  interface Props {
    videoId: string;
  }

  let { videoId }: Props = $props();

  $: stats = $engagementStats[videoId] || [];
  $: maxCount = Math.max(...stats.map(s => s.count), 1);

  function getIntensity(count: number): number {
    return count / maxCount;
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
  }
</script>

<div class="timeline-heatmap">
  <div class="timeline-bar">
    {#each stats as segment, i}
      <div
        class="timeline-segment"
        style="--intensity: {getIntensity(segment.count)}"
        title="{formatTime(segment.timestamp)}: {segment.count} views"
      />
    {/each}
  </div>

  <div class="timeline-labels">
    <span>0:00</span>
    <span>Most Replayed</span>
    <span>End</span>
  </div>
</div>

<style>
  .timeline-heatmap {
    width: 100%;
    padding: 1rem;
  }

  .timeline-bar {
    display: flex;
    height: 60px;
    gap: 2px;
    margin-bottom: 0.5rem;
  }

  .timeline-segment {
    flex: 1;
    background: linear-gradient(
      to top,
      rgba(124, 43, 238, var(--intensity)),
      rgba(124, 43, 238, calc(var(--intensity) * 0.6))
    );
    border-radius: 2px;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .timeline-segment:hover {
    transform: scaleY(1.1);
    filter: brightness(1.2);
  }

  .timeline-labels {
    display: flex;
    justify-content: space-between;
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }
</style>
\`\`\`

### 2. Use in Page

\`\`\`svelte
<TimelineHeatmap videoId="demo-video" />
\`\`\`

### 3. Advanced: Add Interactions

\`\`\`typescript
function handleSegmentClick(timestamp: number) {
  // Seek video to this timestamp
  const modal = document.querySelector('video');
  if (modal) {
    modal.currentTime = timestamp;
    modal.play();
  }
}
\`\`\``,

			'api-endpoint': `# Guide: Create New API Endpoint

## Overview
Add a new API route to your PCN platform.

## Example: Get Video Statistics
${details ? `\n**Your Goal**: ${details}\n` : ''}

### 1. Create Endpoint File

**File**: \`src/routes/api/videos/[id]/stats/+server.ts\`

\`\`\`typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform }) => {
  const { id } = params;
  const kv = platform?.env.KV;

  if (!kv) {
    throw error(500, 'KV not available');
  }

  // Get engagement data
  const key = \`video:\${id}:engagement\`;
  const engagement = await kv.get(key, 'json') || [];

  // Calculate stats
  const totalViews = engagement.length;
  const totalReplays = engagement.reduce((sum, s) => sum + s.count, 0);
  const avgReplays = totalReplays / totalViews;
  const completionRate = engagement.filter(s => s.completed).length / totalViews;

  // Find most replayed moment
  const mostReplayed = engagement.reduce((max, s) =>
    s.count > max.count ? s : max,
    { timestamp: 0, count: 0 }
  );

  return json({
    videoId: id,
    totalViews,
    totalReplays,
    avgReplays: Math.round(avgReplays * 100) / 100,
    completionRate: Math.round(completionRate * 100),
    mostReplayedMoment: {
      timestamp: mostReplayed.timestamp,
      count: mostReplayed.count
    }
  });
};
\`\`\`

### 2. Test Endpoint

\`\`\`bash
# Start dev server
pnpm dev

# Test with curl
curl http://localhost:5173/api/videos/demo-video/stats
\`\`\`

### 3. Use in Frontend

\`\`\`svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let stats = $state(null);

  onMount(async () => {
    const res = await fetch('/api/videos/demo-video/stats');
    stats = await res.json();
  });
</script>

{#if stats}
  <div class="video-stats">
    <p>Total Views: {stats.totalViews}</p>
    <p>Completion Rate: {stats.completionRate}%</p>
    <p>Most Replayed: {stats.mostReplayedMoment.timestamp}s</p>
  </div>
{/if}
\`\`\`

### 4. Add POST Support

\`\`\`typescript
export const POST: RequestHandler = async ({ params, request, platform }) => {
  const { id } = params;
  const body = await request.json();

  // Validate input
  if (!body.metric) {
    throw error(400, 'Missing metric');
  }

  // Store custom metric
  const kv = platform?.env.KV;
  await kv.put(\`video:\${id}:custom:\${body.metric}\`, JSON.stringify(body.value));

  return json({ success: true });
};
\`\`\``,

			'admin-feature': `# Guide: Add Admin-Only Feature

## Overview
Create functionality restricted to admin users.

## Example: Video Management Panel
${details ? `\n**Your Goal**: ${details}\n` : ''}

### 1. Create Admin Guard

**File**: \`src/lib/server/auth.ts\`

\`\`\`typescript
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function requireAdmin(event: RequestEvent) {
  const sessionId = event.cookies.get('session');

  if (!sessionId) {
    throw error(401, 'Not authenticated');
  }

  const session = await event.platform?.env.KV.get(\`session:\${sessionId}\`, 'json');

  if (!session || session.role !== 'admin') {
    throw error(403, 'Admin access required');
  }

  return session;
}
\`\`\`

### 2. Create Admin Route

**File**: \`src/routes/admin/videos/+page.server.ts\`

\`\`\`typescript
import { requireAdmin } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const admin = await requireAdmin(event);

  // Fetch all videos
  const db = event.platform?.env.DB;
  const videos = await db.prepare('SELECT * FROM videos').all();

  return {
    admin,
    videos: videos.results
  };
};
\`\`\`

### 3. Create Admin UI

**File**: \`src/routes/admin/videos/+page.svelte\`

\`\`\`svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  interface Props {
    data: {
      admin: { email: string };
      videos: Video[];
    };
  }

  let { data }: Props = $props();
</script>

<div class="admin-panel">
  <h1>Video Management</h1>
  <p>Logged in as: {data.admin.email}</p>

  <div class="video-list">
    {#each data.videos as video}
      <div class="video-item">
        <h3>{video.title}</h3>
        <p>{video.views} views</p>

        <form method="POST" action="?/delete" use:enhance>
          <input type="hidden" name="id" value={video.id} />
          <button type="submit" class="danger">Delete</button>
        </form>
      </div>
    {/each}
  </div>
</div>

<style>
  .admin-panel {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .video-list {
    display: grid;
    gap: 1rem;
  }

  .video-item {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  button.danger {
    background: var(--color-error);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  button.danger:hover {
    filter: brightness(1.2);
  }
</style>
\`\`\`

### 4. Add Form Actions

\`\`\`typescript
import type { Actions } from './$types';

export const actions: Actions = {
  delete: async ({ request, platform }) => {
    const data = await request.formData();
    const id = data.get('id');

    const db = platform?.env.DB;
    await db.prepare('DELETE FROM videos WHERE id = ?').bind(id).run();

    return { success: true };
  }
};
\`\`\`

### 5. Add Navigation Link

Only show for admin users:

\`\`\`svelte
{#if user?.role === 'admin'}
  <a href="/admin/videos">Manage Videos</a>
{/if}
\`\`\``
		};

		const output = extensionGuides[extension] || 'Extension guide not found.';

		return {
			content: [{ type: 'text' as const, text: output }]
		};
	}

	private async handleDeployment(args: Record<string, unknown> | undefined) {
		const topic = args?.topic as string;

		const deploymentDocs: Record<string, string> = {
			'build-deploy': `# Build and Deploy

## Local Build

\`\`\`bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Preview build locally
pnpm preview
\`\`\`

## Deploy to Cloudflare Pages

### Via Wrangler CLI

\`\`\`bash
# Deploy current build
wrangler pages deploy .svelte-kit/cloudflare --project-name=outerfields-pcn

# Deploy specific branch
wrangler pages deploy .svelte-kit/cloudflare \\
  --project-name=outerfields-pcn \\
  --branch=main
\`\`\`

### Via Git (Automatic)

1. Connect repository in Cloudflare Dashboard:
   - Pages → Create project → Connect Git
   - Select repository
   - Build command: \`pnpm build\`
   - Output directory: \`.svelte-kit/cloudflare\`

2. Push to deploy:
\`\`\`bash
git push origin main  # Auto-deploys to production
git push origin dev   # Auto-deploys to preview
\`\`\`

## Deployment URL

- Production: \`https://outerfields-pcn.pages.dev\`
- Custom domain: \`https://outerfields.io\`
- Preview branches: \`https://[branch].outerfields-pcn.pages.dev\`

## Build Verification

Before deploying:
\`\`\`bash
# Type check
pnpm exec tsc --noEmit

# Lint
pnpm exec eslint .

# Test build
pnpm build && pnpm preview
\`\`\``,

			'environment-vars': `# Environment Variables

## Required Variables

### Development (.dev.vars)

Create \`.dev.vars\` in project root:

\`\`\`
# Cloudflare
DATABASE_URL=http://localhost:8787
KV_NAMESPACE_ID=local
R2_BUCKET_NAME=local

# Email (Resend)
RESEND_API_KEY=re_...

# Optional
ANALYTICS_ID=...
\`\`\`

### Production (Cloudflare Dashboard)

Set in: Pages → Settings → Environment variables

**Required**:
- \`RESEND_API_KEY\`: Email service API key

**Bindings** (configured in wrangler.jsonc):
- \`DB\`: D1 database binding
- \`KV\`: KV namespace binding
- \`VIDEOS\`: R2 bucket binding

## Set via Wrangler

\`\`\`bash
# Set secret (production)
wrangler pages secret put RESEND_API_KEY --project-name=outerfields-pcn

# Set variable (both environments)
wrangler pages variable put ANALYTICS_ID=xxx --project-name=outerfields-pcn

# Set for preview only
wrangler pages variable put DEBUG=true \\
  --project-name=outerfields-pcn \\
  --env=preview
\`\`\`

## Access in Code

\`\`\`typescript
// In SvelteKit routes
export const load: PageServerLoad = async ({ platform }) => {
  const resendKey = platform?.env.RESEND_API_KEY;
  const db = platform?.env.DB;
  const kv = platform?.env.KV;

  // ...
};
\`\`\`

## Security

**Never commit**:
- \`.dev.vars\`
- \`.env\` files
- API keys

**Add to .gitignore**:
\`\`\`
.dev.vars
.env
.env.*
\`\`\``,

			troubleshooting: `# Troubleshooting

## Common Issues

### Build Fails

**Error**: \`Module not found\`
\`\`\`bash
# Solution: Clear cache and reinstall
rm -rf node_modules .svelte-kit
pnpm install
pnpm build
\`\`\`

**Error**: \`Type errors\`
\`\`\`bash
# Solution: Generate types
pnpm exec wrangler types
pnpm exec svelte-kit sync
\`\`\`

### Deployment Fails

**Error**: \`Bindings not found\`

Check wrangler.jsonc has correct IDs:
\`\`\`json
{
  "d1_databases": [
    { "binding": "DB", "database_id": "..." }
  ],
  "kv_namespaces": [
    { "binding": "KV", "id": "..." }
  ]
}
\`\`\`

**Error**: \`403 Forbidden\`

Verify Wrangler authentication:
\`\`\`bash
wrangler logout
wrangler login
\`\`\`

### Runtime Errors

**Error**: \`platform.env is undefined\`

Add type definitions:
\`\`\`typescript
// src/app.d.ts
declare namespace App {
  interface Platform {
    env: {
      DB: D1Database;
      KV: KVNamespace;
      VIDEOS: R2Bucket;
      RESEND_API_KEY: string;
    };
  }
}
\`\`\`

**Error**: \`KV get returns null\`

Check key format:
\`\`\`typescript
// Correct
await kv.get('video:demo:engagement', 'json');

// Wrong
await kv.get('video-demo-engagement', 'json');
\`\`\`

### Database Issues

**Error**: \`D1 query fails\`

Test locally:
\`\`\`bash
# Run local D1
wrangler d1 execute outerfields_pcn --local --command "SELECT * FROM users"

# Apply migrations
wrangler d1 migrations apply outerfields_pcn --local
\`\`\`

## Debug Mode

Enable verbose logging:
\`\`\`bash
# Set in .dev.vars
DEBUG=true

# In code
if (platform?.env.DEBUG) {
  console.log('Engagement data:', engagement);
}
\`\`\`

## View Logs

\`\`\`bash
# Tail production logs
wrangler pages deployment tail --project-name=outerfields-pcn

# View specific deployment
wrangler pages deployment tail <DEPLOYMENT_ID>
\`\`\``,

			'database-migrations': `# Database Migrations

## Create Migration

\`\`\`bash
# Create new migration file
wrangler d1 migrations create outerfields_pcn add_video_tags
\`\`\`

This creates: \`migrations/0002_add_video_tags.sql\`

## Write Migration

\`\`\`sql
-- migrations/0002_add_video_tags.sql

CREATE TABLE IF NOT EXISTS video_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

CREATE INDEX idx_video_tags_video ON video_tags(video_id);
CREATE INDEX idx_video_tags_tag ON video_tags(tag);
\`\`\`

## Apply Migration

\`\`\`bash
# Local (test first)
wrangler d1 migrations apply outerfields_pcn --local

# Production
wrangler d1 migrations apply outerfields_pcn
\`\`\`

## Rollback

D1 doesn't support automatic rollback. Create a new migration:

\`\`\`sql
-- migrations/0003_rollback_video_tags.sql

DROP TABLE IF EXISTS video_tags;
\`\`\`

## Best Practices

### Always include:
- \`IF NOT EXISTS\` for CREATE
- \`IF EXISTS\` for DROP
- Indexes for foreign keys
- Default values for timestamps

### Test locally first:
\`\`\`bash
# 1. Apply migration locally
wrangler d1 migrations apply outerfields_pcn --local

# 2. Test queries
wrangler d1 execute outerfields_pcn --local \\
  --command "SELECT * FROM video_tags"

# 3. If good, apply to production
wrangler d1 migrations apply outerfields_pcn
\`\`\`

## Schema Updates

After migration, update TypeScript types:

\`\`\`typescript
// src/lib/types/database.ts
export interface VideoTag {
  id: number;
  video_id: string;
  tag: string;
  created_at: number;
}
\`\`\``,

			monitoring: `# Monitoring and Analytics

## Cloudflare Analytics

View in Dashboard:
- Pages → outerfields-pcn → Analytics
- Metrics: Requests, Bandwidth, Errors

## Custom Analytics

### Track Events

\`\`\`typescript
// Frontend
async function trackEvent(event: string, data: any) {
  await fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event,
      data,
      timestamp: Date.now()
    })
  });
}

// Usage
trackEvent('video_play', { videoId: 'demo', userId: 'user123' });
\`\`\`

### Store in KV

\`\`\`typescript
// API endpoint
export const POST: RequestHandler = async ({ request, platform }) => {
  const { event, data, timestamp } = await request.json();

  const kv = platform?.env.KV;
  const key = \`analytics:\${event}:\${Date.now()}\`;

  await kv.put(key, JSON.stringify({ data, timestamp }), {
    expirationTtl: 86400 * 30 // 30 days
  });

  return json({ success: true });
};
\`\`\`

## Error Tracking

### Sentry Integration

\`\`\`bash
pnpm add @sentry/sveltekit
\`\`\`

\`\`\`typescript
// src/hooks.server.ts
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://...',
  tracesSampleRate: 0.1
});

export const handleError = Sentry.handleErrorWithSentry();
\`\`\`

### Custom Error Logging

\`\`\`typescript
async function logError(error: Error, context: any) {
  await fetch('/api/errors', {
    method: 'POST',
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    })
  });
}
\`\`\`

## Health Checks

\`\`\`typescript
// src/routes/api/health/+server.ts
export const GET: RequestHandler = async ({ platform }) => {
  const checks = {
    db: false,
    kv: false,
    timestamp: Date.now()
  };

  try {
    await platform?.env.DB.prepare('SELECT 1').first();
    checks.db = true;
  } catch {}

  try {
    await platform?.env.KV.get('health-check');
    checks.kv = true;
  } catch {}

  const healthy = checks.db && checks.kv;

  return json(checks, {
    status: healthy ? 200 : 503
  });
};
\`\`\`

## View Logs

\`\`\`bash
# Real-time
wrangler pages deployment tail --project-name=outerfields-pcn

# Filter by status
wrangler pages deployment tail --status=error

# Format JSON
wrangler pages deployment tail --format=json | jq
\`\`\``
		};

		const output = deploymentDocs[topic] || 'Deployment topic not found.';

		return {
			content: [{ type: 'text' as const, text: output }]
		};
	}

	private async handleArchitecture() {
		const output = `# OUTERFIELDS PCN Architecture

## System Overview

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        OUTERFIELDS PCN                           │
│                 Premium Content Network Platform                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (SvelteKit)                        │
├─────────────────────────────────────────────────────────────────┤
│  • VideoModal: Cinematic player + engagement tracking           │
│  • Heatmap: Replay pattern visualization                        │
│  • MetricsDashboard: Real-time analytics                        │
│  • ComponentLab: Live component previews                        │
│  • Navigation: Fixed header with auth state                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Routes (SvelteKit)                         │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/videos/[id]/engagement  → Track watch events         │
│  GET  /api/videos/[id]/engagement  → Fetch engagement data      │
│  POST /api/auth/login              → Send magic link            │
│  GET  /api/auth/verify             → Verify token, create session│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Cloudflare Edge Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  D1 Database │  │  KV Storage  │  │  R2 Storage  │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ • users      │  │ • engagement │  │ • videos     │          │
│  │ • videos     │  │ • sessions   │  │ • thumbnails │          │
│  │ • analytics  │  │ • cache      │  │ • assets     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐        │
│  │             Cloudflare Pages                        │        │
│  │  • Global CDN                                       │        │
│  │  • Automatic SSL                                    │        │
│  │  • Edge rendering                                   │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

## Data Flow: Video Engagement Tracking

\`\`\`
1. User plays video in VideoModal
            ↓
2. trackEngagement() fires every 10 seconds
            ↓
3. POST /api/videos/[id]/engagement
            ↓
4. API stores in KV: video:{id}:engagement
            ↓
5. engagementStats store fetches data
            ↓
6. Heatmap + MetricsDashboard reactively update
\`\`\`

## Key Components

### Frontend Components

| Component | Purpose | Location |
|-----------|---------|----------|
| VideoModal | Full-screen player with tracking | \`src/lib/components/VideoModal.svelte\` |
| Heatmap | Replay visualization | \`src/lib/components/Heatmap.svelte\` |
| MetricsDashboard | Analytics display | \`src/lib/components/MetricsDashboard.svelte\` |
| ComponentLab | Component showcase | \`src/lib/components/ComponentLab.svelte\` |
| Navigation | Fixed header | \`src/lib/components/Navigation.svelte\` |

### Pages

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| \`/\` | Landing page | No |
| \`/design\` | Component Lab showcase | No |
| \`/docs\` | Detailed documentation | No |
| \`/demo\` | User portal demo | Yes |
| \`/admin-demo\` | Admin dashboard demo | Yes |
| \`/login\` | Authentication | No |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| \`/api/videos/[id]/engagement\` | GET | Fetch engagement data |
| \`/api/videos/[id]/engagement\` | POST | Track engagement event |
| \`/api/auth/login\` | POST | Send magic link |
| \`/api/auth/verify\` | GET | Verify token, create session |
| \`/api/auth/logout\` | POST | Destroy session |

## Technology Stack

**Frontend**:
- SvelteKit 2.0 (framework)
- TypeScript (type safety)
- Tailwind CSS (structure)
- Canon Design Tokens (aesthetics)

**Backend**:
- Cloudflare Workers (serverless compute)
- D1 (SQLite database)
- KV (key-value store)
- R2 (object storage)

**Deployment**:
- Cloudflare Pages (hosting)
- Wrangler CLI (deployment tool)
- Git-based CI/CD

## Design System

**OUTERFIELDS Brand**:
- Primary color: \`#7c2bee\` (purple)
- Background: Pure black (\`#000000\`)
- Typography: Manrope font family
- Style: Glassmorphism with purple accents

**Canon Integration**:
- Structure: Tailwind utilities
- Aesthetics: Canon design tokens
- Motion: Canon timing (\`--duration-micro\`, \`--ease-standard\`)

## Security

**Authentication**:
- Magic link (passwordless)
- Session tokens in KV
- HttpOnly cookies
- CSRF protection (SameSite)

**Data Protection**:
- All traffic over HTTPS
- Secrets in environment variables
- No client-side API keys

## Scalability

**Global Edge**:
- Pages deployed to 300+ Cloudflare edge locations
- KV: 1ms global read latency
- D1: Regional SQLite with global reads

**Performance**:
- Static pre-rendering
- Edge-side rendering
- Immutable asset caching
- Automatic code splitting`;

		return {
			content: [{ type: 'text' as const, text: output }]
		};
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error('OUTERFIELDS PCN MCP server running on stdio');
	}
}

const server = new OuterfieldsServer();
server.run().catch(console.error);
