/**
 * LinkedIn Content Formats
 * 
 * Codified research from 2025-2026 LinkedIn performance data.
 * Use this to guide content creation decisions.
 * 
 * Sources:
 * - Socialinsider LinkedIn Benchmark Report (1M+ posts analyzed)
 * - LinkedIn's own engagement data
 * - B2B Growth Co research
 * - AuthoredUp content analysis
 */

// =============================================================================
// Format Definitions
// =============================================================================

export type FormatType = 
	| 'carousel'
	| 'video'
	| 'multi_image'
	| 'text_only'
	| 'poll'
	| 'link_post'
	| 'document';

export interface FormatSpec {
	type: FormatType;
	engagementRate: number;
	description: string;
	bestFor: string[];
	avoid: string[];
	specs: {
		dimensions?: string;
		duration?: string;
		length?: string;
		slides?: string;
	};
	tips: string[];
	structure: string;
	methodologyFit: string;
	algorithmNotes: string;
}

export const FORMATS: Record<FormatType, FormatSpec> = {
	carousel: {
		type: 'carousel',
		engagementRate: 6.6,
		description: 'PDF document uploaded as carousel slides. Highest engagement format.',
		bestFor: [
			'Frameworks and mental models',
			'Step-by-step tutorials',
			'Data visualizations',
			'Methodology breakdowns',
			'Comparison charts',
			'Case study summaries'
		],
		avoid: [
			'Text walls on slides',
			'More than 10 slides',
			'No clear takeaway',
			'Generic advice'
		],
		specs: {
			dimensions: '1080x1350px (portrait) or 1920x1080px (landscape)',
			slides: '7-9 slides optimal (highest completion rate)'
		},
		tips: [
			'Hook with question in first slide (+27% engagement)',
			'One clear idea per slide',
			'Consistent visual design across slides',
			'Upload as PDF for best formatting',
			'End with clear CTA (follow, save, comment)',
			'Use bold text for key points'
		],
		structure: `
Slide 1: Hook - Question or bold statement
Slide 2: The problem or context
Slide 3: Why it matters
Slides 4-7: The framework/steps/insights
Slide 8: Summary or key takeaway
Slide 9: CTA + author info
		`.trim(),
		methodologyFit: 'Canon principles, Subtractive Triad, design frameworks, "Less but better" breakdowns',
		algorithmNotes: 'Carousels keep users on platform longer. Completion rate signals quality to algorithm.'
	},

	video: {
		type: 'video',
		engagementRate: 5.6,
		description: 'Native video content. 1.4x engagement multiplier, most shared format.',
		bestFor: [
			'Thought leadership',
			'Behind-the-scenes',
			'Product demos',
			'Client testimonials',
			'Founder insights',
			'Quick tips'
		],
		avoid: [
			'Over 90 seconds for feed',
			'No subtitles',
			'Slow start',
			'Promotional tone'
		],
		specs: {
			dimensions: '1080x1920px (vertical) or 1920x1080px (horizontal)',
			duration: '60-90 seconds optimal for feed'
		},
		tips: [
			'Hook in first 3-4 seconds (attention spans are 3.7s average)',
			'Add subtitles - most watch muted',
			'Brand/logo in first 4 seconds = +69% performance',
			'Native upload only - no YouTube links',
			'Vertical video trending for 2026'
		],
		structure: `
0-4s: Hook - Surprising statement or question
4-15s: Context - Why this matters to viewer
15-60s: The insight/value/demonstration
60-90s: Takeaway + soft CTA
		`.trim(),
		methodologyFit: 'Philosophy explanations, project walkthroughs, "day in the life" of methodology-driven design',
		algorithmNotes: 'Video watch time is key metric. 36% increase in video consumption YoY. Shares declining but views up.'
	},

	multi_image: {
		type: 'multi_image',
		engagementRate: 5.5,
		description: 'Multiple images in single post. Generates most likes.',
		bestFor: [
			'Conference moments',
			'Team culture',
			'Before/after reveals',
			'Process documentation',
			'Event coverage',
			'Workspace/setup'
		],
		avoid: [
			'Random unrelated images',
			'Low quality photos',
			'Stock photos',
			'More than 4-5 images'
		],
		specs: {
			dimensions: '1200x1200px (square) or 1080x1350px (portrait)',
			slides: '2-4 images optimal'
		},
		tips: [
			'Tell a visual story across images',
			'First image is the hook',
			'Works great for personal brand building',
			'Authentic > polished',
			'Add context in caption'
		],
		structure: `
Image 1: The hook/headline moment
Image 2-3: The context/process
Image 4: The result/team/payoff
Caption: Story that ties it together
		`.trim(),
		methodologyFit: 'Project reveals, design process, team at work, client meetings, real work happening',
		algorithmNotes: 'Multi-image from conferences and business meetings perform exceptionally well.'
	},

	text_only: {
		type: 'text_only',
		engagementRate: 4.0,
		description: 'Pure text post. Works for personal stories and insights with strong hooks.',
		bestFor: [
			'Personal stories',
			'Quick insights',
			'Industry commentary',
			'Contrarian takes',
			'Lessons learned',
			'Observations'
		],
		avoid: [
			'Wall of text',
			'No hook',
			'Generic advice',
			'Corporate tone'
		],
		specs: {
			length: '1,200-1,400 characters optimal (just below "see more")'
		},
		tips: [
			'Strong hook in first line - curiosity or contrarian',
			'White space and line breaks every 2-3 lines',
			'Conversational tone (+56% engagement)',
			'End with question or prompt',
			'Bold/italics for emphasis'
		],
		structure: `
Line 1: Hook (curiosity, contrarian, or surprising)

Lines 2-4: Context or story setup

Lines 5-8: The insight or lesson

Line 9: Takeaway

Final line: Question or prompt for discussion
		`.trim(),
		methodologyFit: 'Philosophy insights, industry observations, lessons from client work, personal takes on design',
		algorithmNotes: 'Conversational, first-person tone averages 56% higher engagement than formal corporate content.'
	},

	poll: {
		type: 'poll',
		engagementRate: 3.5,
		description: 'Interactive poll. Highest impressions but lower engagement quality.',
		bestFor: [
			'Audience research',
			'Engagement sparks',
			'Visibility plays',
			'Starting conversations',
			'Gathering insights'
		],
		avoid: [
			'Pointless questions',
			'Too many options',
			'No follow-up plan',
			'Overuse'
		],
		specs: {
			length: '3-4 options optimal'
		},
		tips: [
			'Use for genuine research',
			'Share insights from results',
			'Sparks debate = higher engagement',
			'Follow up with content based on results',
			'Good for pages with 100k+ followers'
		],
		structure: `
Question: Genuine, debatable topic
Option A: Clear choice
Option B: Clear alternative
Option C: Third perspective
Option D: "Other - comment below"
Follow-up: Plan to share insights
		`.trim(),
		methodologyFit: 'Design preference questions, methodology debates, industry pulse checks',
		algorithmNotes: 'Highest impressions of any format. Use strategically for visibility, not as primary content.'
	},

	link_post: {
		type: 'link_post',
		engagementRate: 2.0,
		description: 'Post with external link. Algorithm penalizes - avoid when possible.',
		bestFor: [
			'Only when absolutely necessary',
			'Major announcements with landing page',
			'Job postings'
		],
		avoid: [
			'Regular content',
			'Blog promotion',
			'Driving traffic as primary goal'
		],
		specs: {
			dimensions: 'Organic posts get smaller preview image than promoted'
		},
		tips: [
			'Put link in first comment instead',
			'Or repurpose content natively',
			'If must use, add substantial native text',
			'Consider carousel with key points + link in comments'
		],
		structure: `
If you must use a link:
1. Native text with full value (don't tease)
2. Link at end or in first comment
3. Make post complete without clicking
		`.trim(),
		methodologyFit: 'Avoid - repurpose as native carousel or text instead',
		algorithmNotes: 'LinkedIn wants users to stay on platform. Link posts get 50-70% less reach than native content.'
	},

	document: {
		type: 'document',
		engagementRate: 5.85,
		description: 'Native document upload (PDF, PPT). Similar to carousel but more formal.',
		bestFor: [
			'Research reports',
			'Whitepapers',
			'Detailed guides',
			'Formal frameworks',
			'Reference materials'
		],
		avoid: [
			'Long unformatted documents',
			'Walls of text',
			'No visual hierarchy'
		],
		specs: {
			dimensions: 'Letter or A4 size',
			slides: 'Keep concise - key pages only'
		},
		tips: [
			'Use for more formal/detailed content than carousel',
			'Good for research and whitepapers',
			'Include summary/key findings upfront',
			'Visual design still matters'
		],
		structure: `
Page 1: Title + key finding hook
Page 2: Executive summary
Pages 3-8: Core content
Final page: CTA + contact
		`.trim(),
		methodologyFit: 'Research findings, detailed methodology documentation, formal case studies',
		algorithmNotes: 'Similar performance to carousels. Use when content is more formal or reference-oriented.'
	}
};

// =============================================================================
// Hook Templates
// =============================================================================

export interface HookTemplate {
	template: string;
	bestFor: FormatType[];
	example: string;
}

export const HOOK_TEMPLATES: HookTemplate[] = [
	{
		template: "I've spent [time] doing [thing]. Here's what most people get wrong:",
		bestFor: ['text_only', 'carousel'],
		example: "I've spent 10 years building design systems. Here's what most people get wrong:"
	},
	{
		template: "Stop [common practice]. Here's what to do instead:",
		bestFor: ['text_only', 'carousel', 'video'],
		example: "Stop starting with the homepage. Here's what to do instead:"
	},
	{
		template: "[Contrarian statement]. Let me explain.",
		bestFor: ['text_only', 'video'],
		example: "Your brand guidelines are probably hurting your brand. Let me explain."
	},
	{
		template: "The difference between [A] and [B]:",
		bestFor: ['carousel', 'text_only'],
		example: "The difference between a $5K website and a $50K website:"
	},
	{
		template: "[Number] lessons from [experience]:",
		bestFor: ['carousel', 'text_only'],
		example: "7 lessons from redesigning 50+ professional service websites:"
	},
	{
		template: "Most [role]s don't realize this about [topic]:",
		bestFor: ['text_only', 'video'],
		example: "Most founders don't realize this about their website:"
	},
	{
		template: "We helped [client type] achieve [result]. Here's how:",
		bestFor: ['carousel', 'multi_image', 'video'],
		example: "We helped a law firm 3x their inbound leads. Here's how:"
	},
	{
		template: "[Strong opinion]. (Here's why that matters)",
		bestFor: ['text_only'],
		example: "Templates are not the enemy. (Here's why that matters)"
	},
	{
		template: "The biggest mistake I see in [industry]:",
		bestFor: ['text_only', 'video'],
		example: "The biggest mistake I see in agency positioning:"
	},
	{
		template: "This [thing] changed how I think about [topic]:",
		bestFor: ['text_only', 'multi_image'],
		example: "This client conversation changed how I think about pricing:"
	},
	{
		template: "[Surprising statistic]. Here's what it means:",
		bestFor: ['carousel', 'text_only'],
		example: "73% of visitors leave a website in under 3 seconds. Here's what it means:"
	},
	{
		template: "I used to believe [old belief]. Then [experience happened].",
		bestFor: ['text_only', 'video'],
		example: "I used to believe more features = better product. Then I watched users struggle."
	},
	{
		template: "Unpopular opinion: [opinion]",
		bestFor: ['text_only', 'poll'],
		example: "Unpopular opinion: Most design trends make websites worse."
	},
	{
		template: "The [industry] playbook is broken. Here's what's replacing it:",
		bestFor: ['carousel', 'text_only'],
		example: "The agency growth playbook is broken. Here's what's replacing it:"
	},
	{
		template: "What [successful thing] taught me about [broader lesson]:",
		bestFor: ['text_only', 'carousel'],
		example: "What our best-performing project taught me about client relationships:"
	}
];

// =============================================================================
// Content Pillars (Weekly Rhythm)
// =============================================================================

export interface ContentPillar {
	day: string;
	theme: string;
	description: string;
	recommendedFormats: FormatType[];
	topicIdeas: string[];
	methodologyAngle: string;
}

export const WEEKLY_PILLARS: ContentPillar[] = [
	{
		day: 'monday',
		theme: 'Methodology',
		description: 'Canon principles, design philosophy, frameworks',
		recommendedFormats: ['carousel', 'text_only'],
		topicIdeas: [
			'Subtractive Triad in action',
			'Why understanding precedes creation',
			'The hermeneutic circle of design',
			'Less, but better - practical examples',
			'Zuhandenheit: tools that recede into use',
			'How we approach discovery',
			'The role of constraints in creativity'
		],
		methodologyAngle: 'Teach the philosophy. Position as thought leader in methodology-driven design.'
	},
	{
		day: 'tuesday',
		theme: 'Case Study',
		description: 'Client work, transformations, results',
		recommendedFormats: ['carousel', 'video', 'multi_image'],
		topicIdeas: [
			'Before/after project reveal',
			'Problem → Solution → Result',
			'Client testimonial',
			'Design decisions explained',
			'What we learned from this project',
			'The brief vs. the outcome',
			'Metrics and results'
		],
		methodologyAngle: 'Show methodology in action. Prove the approach works with real results.'
	},
	{
		day: 'wednesday',
		theme: 'Industry Insight',
		description: 'Trends, observations, commentary',
		recommendedFormats: ['text_only', 'poll', 'carousel'],
		topicIdeas: [
			'Contrarian take on industry trend',
			'What most agencies get wrong',
			'The future of [topic]',
			'Data or research breakdown',
			'Industry pattern observation',
			'Tool or platform commentary',
			'Market shift analysis'
		],
		methodologyAngle: 'Establish authority. Share perspective others aren\'t saying.'
	},
	{
		day: 'thursday',
		theme: 'Behind the Scenes',
		description: 'Process, team, culture',
		recommendedFormats: ['video', 'multi_image', 'text_only'],
		topicIdeas: [
			'How we work',
			'Tool or process we use',
			'Team moment',
			'Office/workspace',
			'Day in the life',
			'How we make decisions',
			'Culture and values in action'
		],
		methodologyAngle: 'Humanize the brand. Show the people behind the methodology.'
	},
	{
		day: 'friday',
		theme: 'Value Share',
		description: 'Tips, tutorials, frameworks to save',
		recommendedFormats: ['carousel', 'video'],
		topicIdeas: [
			'How to [practical skill]',
			'Framework or template share',
			'Quick tip or hack',
			'Resource recommendation',
			'Step-by-step guide',
			'Checklist for [task]',
			'Common mistakes to avoid'
		],
		methodologyAngle: 'Be generous. Give away valuable frameworks. Build trust through utility.'
	}
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the best format for a content goal
 */
export function getFormatForGoal(goal: 'engagement' | 'reach' | 'leads' | 'thought_leadership' | 'trust'): FormatType {
	switch (goal) {
		case 'engagement':
			return 'carousel';
		case 'reach':
			return 'poll';
		case 'leads':
			return 'carousel'; // Educational carousels drive 4x more leads
		case 'thought_leadership':
			return 'video';
		case 'trust':
			return 'multi_image'; // Authentic behind-scenes builds trust
		default:
			return 'carousel';
	}
}

/**
 * Get today's content pillar
 */
export function getTodaysPillar(): ContentPillar {
	const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	const today = days[new Date().getDay()];
	
	// Weekend defaults to Monday planning
	const targetDay = (today === 'saturday' || today === 'sunday') ? 'monday' : today;
	
	return WEEKLY_PILLARS.find(p => p.day === targetDay) || WEEKLY_PILLARS[0];
}

/**
 * Get format spec by type
 */
export function getFormat(type: FormatType): FormatSpec {
	return FORMATS[type];
}

/**
 * Get hooks suitable for a format
 */
export function getHooksForFormat(format: FormatType): HookTemplate[] {
	return HOOK_TEMPLATES.filter(h => h.bestFor.includes(format));
}

/**
 * Get all formats sorted by engagement rate
 */
export function getFormatsByEngagement(): FormatSpec[] {
	return Object.values(FORMATS).sort((a, b) => b.engagementRate - a.engagementRate);
}

/**
 * Check if a format is recommended for a use case
 */
export function isFormatSuitableFor(format: FormatType, useCase: string): boolean {
	const spec = FORMATS[format];
	return spec.bestFor.some(b => b.toLowerCase().includes(useCase.toLowerCase()));
}
