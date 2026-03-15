/**
 * OUTERFIELDS Demo Video Generation - Veo 3.1 Prompts
 *
 * These prompts are designed for Google's Veo 3.1 video generation model
 * to create realistic "behind-the-scenes" content of the OUTERFIELDS team
 * building the Premium Content Network platform.
 *
 * Usage with Vertex AI:
 * 1. Set up Google Cloud project with Vertex AI
 * 2. Enable the Veo API (currently in preview)
 * 3. Run: npx ts-node scripts/generate-veo-videos.ts
 *
 * Video specs for Veo 3.1:
 * - Resolution: 1080p (1920x1080)
 * - Duration: 8-16 seconds per clip
 * - Aspect ratio: 16:9
 * - Frame rate: 24fps
 */

export interface VeoPrompt {
	id: string;
	title: string;
	category: string;
	prompt: string;
	negativePrompt?: string;
	duration: number; // seconds
	style: 'cinematic' | 'documentary' | 'tech' | 'corporate';
	thumbnail?: string;
}

export const OUTERFIELDS_VIDEO_PROMPTS: VeoPrompt[] = [
	// ============================================
	// FEATURED HERO VIDEO
	// ============================================
	{
		id: 'featured-hero',
		title: 'Building OUTERFIELDS: The Journey',
		category: 'featured',
		duration: 16,
		style: 'cinematic',
		prompt: `Cinematic documentary-style video of a modern tech startup office at golden hour.

Opening shot: Slow dolly into a minimalist office space with large windows, exposed brick, and multiple large monitors displaying code and design mockups. Natural light streaming in.

Middle: Close-up shots of hands typing on mechanical keyboards, mouse interactions with a sleek dark-themed UI dashboard, coffee cups on desks. Team members (diverse, professional, casual dress) collaborating around a whiteboard covered in system architecture diagrams.

Closing: Wide shot pulling back to reveal the full office, monitors glowing with the OUTERFIELDS logo (infinity symbol), team celebrating a successful deployment.

Visual style: Warm color grading, shallow depth of field, cinematic 2.35:1 aspect ratio feel, soft bokeh on background lights. Documentary authenticity with commercial polish.`,
		negativePrompt:
			'cartoonish, animated, stock footage watermarks, low quality, blurry, overexposed, generic corporate, fake smiles'
	},

	// ============================================
	// CONTINUE WATCHING - Development Progress
	// ============================================
	{
		id: 'dev-log-14-video-player',
		title: 'Building the Video Player',
		category: 'continue-watching',
		duration: 12,
		style: 'tech',
		prompt: `Screen recording style video of a developer building a custom video player component.

Shot 1: Over-the-shoulder view of developer at ultrawide monitor. VS Code open with Svelte/TypeScript code. Dark theme IDE. The code shows a VideoPlayer component with play/pause controls.

Shot 2: Close-up of the screen as the developer types, syntax highlighting visible. Console logs appearing. Browser dev tools open showing network requests.

Shot 3: Split screen - code on left, browser preview on right showing a sleek dark video player with custom controls, progress bar, and quality settings dropdown.

Shot 4: Developer leans back satisfied as the video player successfully plays a sample video with smooth scrubbing.

Visual style: Tech tutorial aesthetic, clean and focused, slight blue tint in highlights, sharp focus on screens.`,
		negativePrompt: 'blurry screens, unreadable text, cluttered desk, poor lighting'
	},
	{
		id: 'design-8-admin-dashboard',
		title: 'Designing the Admin Dashboard',
		category: 'continue-watching',
		duration: 12,
		style: 'documentary',
		prompt: `Design process video showing the creation of an admin analytics dashboard.

Shot 1: Designer's workspace - large iMac display showing Figma with a dark-themed dashboard design. Minimal desk setup with drawing tablet.

Shot 2: Close-up of Figma canvas as designer drags components, creates auto-layouts, adjusts spacing. Charts and graphs being positioned. Color picker selecting from a purple (#7c2bee) accent color palette.

Shot 3: Designer comparing the Figma mockup side-by-side with the live implementation in browser. Making small adjustments to match pixel-perfect.

Shot 4: Final reveal - polished admin dashboard with analytics cards, engagement heatmap, subscriber charts. Mouse hovers over interactive elements showing hover states.

Visual style: Clean, professional, creative agency aesthetic. Soft natural lighting. Focus on the design craft.`,
		negativePrompt: 'messy workspace, multiple browser tabs, notifications, distractions'
	},

	// ============================================
	// PLATFORM DEVELOPMENT - Technical Deep Dives
	// ============================================
	{
		id: 'architecture-edge-first',
		title: 'Architecture Deep Dive: Edge-First Design',
		category: 'platform-development',
		duration: 14,
		style: 'tech',
		prompt: `Technical explanation video about edge computing architecture.

Shot 1: Animated diagram appearing on screen - world map with glowing nodes at Cloudflare edge locations. Data packets visualized flowing from users to nearest edge nodes.

Shot 2: Developer at whiteboard drawing system architecture - boxes labeled "Edge Worker", "D1 Database", "KV Cache", "R2 Storage" with arrows showing data flow.

Shot 3: Terminal window showing Wrangler deployment commands executing. "Deployed to 200+ locations worldwide" success message.

Shot 4: Performance metrics dashboard showing response times: "Average latency: 12ms". Globe visualization with green checkmarks appearing at different continents.

Visual style: Technical but accessible, clean infographics, Cloudflare orange accents, professional presentation quality.`,
		negativePrompt: 'confusing diagrams, too much text, boring static slides'
	},
	{
		id: 'realtime-analytics',
		title: 'Building Real-Time Analytics',
		category: 'platform-development',
		duration: 12,
		style: 'tech',
		prompt: `Video showing the development of real-time analytics features.

Shot 1: Dashboard screen with live-updating charts. Numbers incrementing in real-time. Engagement heatmap pulsing with activity.

Shot 2: Code editor showing WebSocket connection code, event handlers for analytics events. Terminal showing incoming data stream.

Shot 3: Split view - left side shows a video playing, right side shows analytics updating live: view count increasing, engagement timeline building, watch duration extending.

Shot 4: Developer clicks "Export" and a beautiful PDF report generates instantly. Satisfied nod.

Visual style: Data visualization focused, smooth animations, dark theme with bright accent colors for data points.`,
		negativePrompt: 'static charts, laggy updates, cluttered interface'
	},
	{
		id: 'multi-tenant-routing',
		title: 'Multi-Tenant Routing with Cloudflare',
		category: 'platform-development',
		duration: 12,
		style: 'tech',
		prompt: `Technical video explaining multi-tenant architecture.

Shot 1: Browser address bar showing different subdomains: "creator1.outerfields.com", "creator2.outerfields.com", "creator3.outerfields.com" - each loading a uniquely branded site.

Shot 2: Code editor showing Cloudflare Worker routing logic. Syntax highlighting on subdomain extraction, tenant lookup, config injection.

Shot 3: Diagram animation: Single request comes in → Router Worker intercepts → Tenant lookup (D1 → KV cache) → Config injection → Branded response returns.

Shot 4: Side-by-side comparison of three different creator portals, each with unique branding but same underlying platform.

Visual style: Clean technical documentation style, clear diagrams, professional.`,
		negativePrompt: 'confusing flow, too many arrows, illegible code'
	},
	{
		id: 'stripe-integration',
		title: 'Stripe Integration: Subscriptions & Webhooks',
		category: 'platform-development',
		duration: 14,
		style: 'tech',
		prompt: `Video demonstrating Stripe payment integration.

Shot 1: Stripe dashboard showing subscription products being created. Plan tiers: Starter $49, Pro $149, Enterprise $399.

Shot 2: Code editor with webhook handler code. Events: checkout.session.completed, customer.subscription.updated. Type-safe handlers.

Shot 3: Test checkout flow - sleek payment form, card input (using test card 4242...), successful payment animation with confetti.

Shot 4: Admin dashboard updating in real-time - new subscriber appears, MRR chart ticks up, notification bell shows "New Pro subscription".

Visual style: Professional fintech aesthetic, Stripe's clean design language, trust-building.`,
		negativePrompt: 'fake payment info visible, security concerns, error states'
	},

	// ============================================
	// DESIGN SYSTEM - Visual Language
	// ============================================
	{
		id: 'canon-tokens',
		title: 'Canon Tokens: Building a Design Language',
		category: 'design-system',
		duration: 12,
		style: 'documentary',
		prompt: `Design system documentation video.

Shot 1: Figma file showing a comprehensive design token library. Color swatches (pure black, whites at various opacities), spacing scale (golden ratio), typography scale.

Shot 2: Close-up of CSS file with custom properties: --color-bg-pure, --color-fg-primary, --space-md, --radius-lg. Clean, organized code.

Shot 3: Component library showcase - buttons, cards, inputs all using consistent tokens. Hover over component to see it highlight which tokens it uses.

Shot 4: Before/after comparison - scattered inconsistent designs vs unified cohesive design system. "Less, but better" appears on screen.

Visual style: Minimalist, Dieter Rams inspired, educational.`,
		negativePrompt: 'cluttered, colorful chaos, inconsistent'
	},
	{
		id: 'motion-design',
		title: 'Motion Design: Purposeful Animation',
		category: 'design-system',
		duration: 10,
		style: 'documentary',
		prompt: `Video showcasing intentional motion design principles.

Shot 1: UI element at rest. Click triggers smooth 200ms transition (--duration-micro). Easing curve visualization appears beside it.

Shot 2: Page transition demonstration - content fades out, new content slides in with staggered timing. Smooth, purposeful.

Shot 3: Hover states showcase - button lifts with subtle shadow, card scales slightly, link underline animates in from left.

Shot 4: Comparison: "Decorative animation" (bouncing, pulsing, distracting) vs "Purposeful animation" (state changes, user feedback, guidance). Check mark on purposeful.

Visual style: Clean white/dark backgrounds to highlight motion, slow-motion replays of key animations.`,
		negativePrompt: 'jarring transitions, too fast, too slow, bouncy playful animations'
	},
	{
		id: 'svelte-components',
		title: 'Component Architecture in Svelte 5',
		category: 'design-system',
		duration: 12,
		style: 'tech',
		prompt: `Technical video about Svelte 5 component patterns.

Shot 1: VS Code with Svelte file open. Syntax highlighting showing $state(), $derived(), $effect() runes. Clean component structure.

Shot 2: Component composition diagram - smaller components combining into larger ones. Props flowing down, events bubbling up.

Shot 3: Live demo - change a prop value in dev tools, watch component reactively update. No virtual DOM, direct updates.

Shot 4: Performance metrics comparison - Svelte bundle size vs React vs Vue. Svelte significantly smaller. Build output showing optimized JavaScript.

Visual style: Technical education, clean code examples, performance focused.`,
		negativePrompt: 'confusing code, syntax errors, cluttered IDE'
	},

	// ============================================
	// TEAM INSIGHTS - Behind the Scenes
	// ============================================
	{
		id: 'why-we-built',
		title: 'Why We Built OUTERFIELDS',
		category: 'team-insights',
		duration: 16,
		style: 'documentary',
		prompt: `Documentary-style founder story video.

Shot 1: Founder sitting in modern office, speaking directly to camera. Natural lighting from large window. Casual but professional attire. Bookshelf with tech books in background.

Shot 2: B-roll of early sketches and wireframes on paper. Hands flipping through a notebook with platform concepts.

Shot 3: Team collaboration moment - three people around a table with laptops, engaged discussion, pointing at screen, genuine reactions.

Shot 4: Return to founder, more animated now, gesturing while explaining the vision. Passion visible. Ends with confident smile.

Visual style: Authentic documentary, not overly produced. Real moments, natural reactions. Warm color grading.`,
		negativePrompt: 'scripted feeling, teleprompter reading, fake enthusiasm, corporate sterile'
	},
	{
		id: 'problem-with-uscreen',
		title: 'The Problem with Uscreen',
		category: 'team-insights',
		duration: 14,
		style: 'documentary',
		prompt: `Problem-solution narrative video.

Shot 1: Frustrated creator at computer, clicking through a clunky admin interface. Slow loading, confusing navigation. Visible frustration.

Shot 2: Comparison table appearing: "Generic branding", "Limited analytics", "High fees", "Poor performance" - each with red X marks.

Shot 3: Transition - same creator now using OUTERFIELDS dashboard. Smooth, fast, intuitive. Relief and satisfaction visible.

Shot 4: Side-by-side before/after - cluttered vs clean, slow vs fast, generic vs branded. OUTERFIELDS logo appears with tagline "Built for creators."

Visual style: Problem/solution narrative arc, relatable frustration turning to satisfaction.`,
		negativePrompt: 'competitor bashing, negative tone, unprofessional criticism'
	},
	{
		id: 'creator-first',
		title: 'Creator-First Philosophy',
		category: 'team-insights',
		duration: 12,
		style: 'documentary',
		prompt: `Philosophy and values video.

Shot 1: Diverse group of content creators - photographer, educator, fitness instructor - each in their element, passionate about their craft.

Shot 2: Quote appearing on screen: "Your platform should amplify your voice, not overshadow it." Elegant typography.

Shot 3: Customization showcase - same platform, wildly different brands. Each creator's personality shining through.

Shot 4: Community moment - creators supporting each other, comments of encouragement, collaborative spirit. Ends on connected community visualization.

Visual style: Inspirational, warm, human-centered. Celebrate creativity and individuality.`,
		negativePrompt: 'generic stock footage, impersonal, corporate speak'
	}
];

/**
 * Veo 3.1 API configuration
 */
export const VEO_CONFIG = {
	model: 'veo-3.1',
	resolution: '1080p',
	aspectRatio: '16:9',
	frameRate: 24,
	outputFormat: 'mp4'
};

/**
 * Generate a Veo API request payload
 */
export function createVeoRequest(prompt: VeoPrompt) {
	return {
		model: VEO_CONFIG.model,
		prompt: prompt.prompt,
		negative_prompt: prompt.negativePrompt,
		duration_seconds: prompt.duration,
		aspect_ratio: VEO_CONFIG.aspectRatio,
		resolution: VEO_CONFIG.resolution,
		style_preset: prompt.style,
		output_format: VEO_CONFIG.outputFormat,
		seed: undefined // Random for variety
	};
}

/**
 * Estimated costs for Veo 3.1 generation
 * Note: Pricing may vary, check current Vertex AI pricing
 */
export function estimateCost(prompts: VeoPrompt[]): {
	totalSeconds: number;
	estimatedCost: string;
} {
	const totalSeconds = prompts.reduce((sum, p) => sum + p.duration, 0);
	// Rough estimate: ~$0.05 per second of video generation
	const cost = totalSeconds * 0.05;

	return {
		totalSeconds,
		estimatedCost: `$${cost.toFixed(2)} - $${(cost * 1.5).toFixed(2)}`
	};
}

// Quick cost estimate
if (import.meta.url === `file://${process.argv[1]}`) {
	const estimate = estimateCost(OUTERFIELDS_VIDEO_PROMPTS);
	console.log('\n📹 OUTERFIELDS Veo 3.1 Video Generation');
	console.log('=====================================');
	console.log(`Total videos: ${OUTERFIELDS_VIDEO_PROMPTS.length}`);
	console.log(`Total duration: ${estimate.totalSeconds} seconds`);
	console.log(`Estimated cost: ${estimate.estimatedCost}`);
	console.log('\nVideos to generate:');
	OUTERFIELDS_VIDEO_PROMPTS.forEach((p) => {
		console.log(`  - ${p.title} (${p.duration}s) [${p.category}]`);
	});
}
