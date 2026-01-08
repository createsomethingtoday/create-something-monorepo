---
slug: "arc-for-gmail"
category: "Work"
title: "Arc for Gmail"
description: "11 hours to production (vs 25-30 estimated). $6.30 in AI costs (vs $3,750 manual). Gmail to Notion sync that just works."
industry: "Email Automation"
subtitle: "11 hours to production. $6.30 in AI costs. Label an email, it appears in your CRM with an AI summary."
metrics:
  - "55-65% time savings"
  - "99.8% cost savings"
  - "5-minute sync cycles"
publishedAt: "2026-01-08"
published: true
---


<div class="max-w-3xl mx-auto">
<h2 class="mb-8">The Challenge</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p>
					Half Dozen needed a way to capture important email interactions in their Notion workspace
					without manual copying. The system had to support multiple team members, preserve email
					formatting, and automatically categorize internal vs. external participants.
				</p>
<p><strong>Technical constraints:</strong></p>
<ul class="space-y-3 body body-tertiary pl-6">
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Multi-user OAuth (multiple Gmail accounts)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>HTML email → Notion block conversion</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Character encoding issues (mojibake)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Notion API 2025-09-03 (new data_source_id architecture)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">—</span>
<span>Bespoke contact categorization (halfdozen.co domain handling)</span>
</li>
</ul>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">Applying the Arc Pattern</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p>
					This project validated the <strong>Arc pattern</strong>: efficient connection between points. Gmail → Notion as a one-way sync with minimal transformation.
				</p>
<div class="my-8 p-8 card-surface">
<p class="body-sm font-mono body-tertiary mb-4">The Arc Implementation:</p>
<pre class="body-sm body-tertiary font-mono leading-loose overflow-x-auto">
Gmail (OAuth)  ──────arc──────&gt;  Notion (OAuth)

1. User labels email "Log to Notion"
2. Worker syncs every 5 minutes (cron)
3. HTML → Notion blocks (minimal transformation)
4. AI summary generation (Workers AI)
5. Contact auto-creation + categorization
					</pre>
</div>
<p><strong>Arc principles applied:</strong></p>
<ul class="space-y-3 body body-tertiary pl-6">
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span><strong>Single direction:</strong> Gmail→Notion only, no bidirectional complexity</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span><strong>Minimal transformation:</strong> Preserve email structure, sanitize only when
							necessary</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span><strong>OAuth-based:</strong> Users authorize their own accounts, no API key management</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span><strong>Serverless:</strong> Cloudflare Workers at the edge, scales automatically</span>
</li>
</ul>
</div>
</div>



<div class="max-w-5xl mx-auto">
<h2 class="mb-12">Technical Implementation</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
<!-- Infrastructure -->
<div class="card-surface p-8">
<h3 class="heading-3 font-semibold mb-4">Infrastructure</h3>
<ul class="space-y-3 body-sm body-tertiary">
<li>• Cloudflare Workers (serverless)</li>
<li>• KV Storage (thread tracking, OAuth tokens)</li>
<li>• Cron Triggers (5-minute sync cycle)</li>
<li>• Workers AI (email summarization)</li>
</ul>
</div>
<!-- APIs -->
<div class="card-surface p-8">
<h3 class="heading-3 font-semibold mb-4">API Integration</h3>
<ul class="space-y-3 body-sm body-tertiary">
<li>• Gmail API (OAuth 2.0, thread fetching)</li>
<li>• Notion API 2025-09-03 (data_source_id)</li>
<li>• Workers AI (@cf/meta/llama-3.1-8b-instruct)</li>
<li>• node-html-parser (email conversion)</li>
</ul>
</div>
</div>
<!-- Key Challenges -->
<div class="mt-12 p-8 card-surface">
<h3 class="heading-3 font-semibold mb-6">Key Technical Challenges Solved</h3>
<div class="space-y-6 body-sm body-tertiary">
<div>
<p class="font-semibold mb-2 challenge-heading">1. Character Encoding (Mojibake)</p>
<p class="leading-relaxed">
							Email HTML contains broken UTF-8 sequences. Built comprehensive sanitization removing
							40+ mojibake patterns while preserving valid punctuation.
						</p>
</div>
<div>
<p class="font-semibold mb-2 challenge-heading">2. Rich Text Array Limits</p>
<p class="leading-relaxed">
							Notion enforces 100-item limit per rich_text array. Implemented automatic paragraph
							splitting for long emails with many inline formatting changes.
						</p>
</div>
<div>
<p class="font-semibold mb-2 challenge-heading">3. Contact Categorization</p>
<p class="leading-relaxed">
							Bespoke logic: halfdozen.co emails → Owner field (internal team), external emails →
							Contacts database with auto-creation and relation linking.
						</p>
</div>
<div>
<p class="font-semibold mb-2 challenge-heading">4. HTML → Notion Conversion</p>
<p class="leading-relaxed">
							Preserves bold, italic, links, headings, lists, quotes, code blocks. Skips tables and
							images. Maintains email thread structure with dividers.
						</p>
</div>
</div>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">Results</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p>
<strong>Deployed to production</strong> at Half Dozen with bespoke configuration for their
					team.
				</p>
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
<div class="text-center p-6 metric-card">
<p class="heading-2 font-bold mb-2">5 min</p>
<p class="body-sm metric-label">Sync cycle</p>
</div>
<div class="text-center p-6 metric-card">
<p class="heading-2 font-bold mb-2">Multi-user</p>
<p class="body-sm metric-label">OAuth support</p>
</div>
<div class="text-center p-6 metric-card">
<p class="heading-2 font-bold mb-2">100%</p>
<p class="body-sm metric-label">Automated</p>
</div>
</div>
<p><strong>Validated outcomes:</strong></p>
<ul class="space-y-3 body body-tertiary pl-6">
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Email formatting preserved (links, bold, italic, structure)</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Contacts auto-created and linked via relations</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>AI summaries generated for quick context</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Internal vs. external participant categorization working</span>
</li>
<li class="flex items-start gap-3">
<span class="body-subtle mt-1">✓</span>
<span>Production-stable on 5-minute cron (no failures)</span>
</li>
</ul>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">Development Approach</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p>
					Built using <strong>Claude Code</strong> (AI-native development) with comprehensive documentation
					and test scripts for debugging.
				</p>
<p><strong>Time to production:</strong> ~11 hours (vs. 25-30 hours traditional)</p>
<p><strong>Cost:</strong> ~$6.30 in AI costs (vs. $3,750 manual development)</p>
<p><strong>ROI:</strong> 99.8% cost savings, 55-65% time savings</p>
<p class="pt-6 body body-tertiary italic">
					Full experiment documentation and research paper available at <a class="underline link-hover-strong" href="https://createsomething.io">createsomething.io</a>.
				</p>
</div>
</div>



<div class="max-w-3xl mx-auto">
<h2 class="mb-8">Why This Validates Arc</h2>
<div class="space-y-6 body-lg leading-relaxed">
<p>
					Arc for Gmail was the first implementation of the Arc pattern. Its success in production
					validates that "efficient connection between points" is a canonical approach worth
					replicating.
				</p>
<p>
					The pattern proved <strong>reusable</strong>: Arc for Fireflies (transcripts → Notion) is
					next, following the exact same principles with different endpoints.
				</p>
</div>
</div>



<div class="max-w-3xl mx-auto text-center">
<h2 class="mb-6">Need a Custom Sync Integration?</h2>
<p class="body-lg body-tertiary mb-8 leading-relaxed">
				The Arc pattern can connect any systems: Slack→Notion, Fireflies→Notion, Discord→Notion,
				and beyond.
			</p>
<a class="inline-block px-8 py-4 btn-primary" href="/contact">
				Start a Conversation
			</a>
</div>

