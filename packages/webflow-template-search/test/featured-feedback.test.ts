import { describe, expect, it } from 'vitest';

import {
  FEATURED_REVIEW_FIELD,
  assertFeaturedFeedbackWriteAllowed,
  buildAnthropicReviewRequest,
  buildOpenAiReviewRequest,
  buildFeaturedPublishedFormula,
  normalizeFeaturedRecord,
  parseReviewDraft,
  summarizePublishedSite,
} from '../src/featuredFeedback';

describe('Featured template feedback policy', () => {
  it('selects only published templates that are currently Featured', () => {
    expect(buildFeaturedPublishedFormula()).toBe(
      'AND({⚙️🆎Type (Text)}="Template🏗️",{🚀Marketplace Status}="3️⃣Published🚀",OR({🥞Is Currently Featured? (🏗️ only)}=1,{ℹ️Is Featured? (🖥️, 🏗️only)}=1))',
    );
  });

  it('keeps the reviewer-pick checkbox separate from the written rationale', () => {
    const item = normalizeFeaturedRecord({
      id: 'recFeatured',
      fields: {
        Name: 'Vaboulus',
        'Reviewer pick (featured templates)': true,
        [FEATURED_REVIEW_FIELD]: 'AI / space theme, unique animations',
        '🔗Website URL': 'https://vaboulus-saas.webflow.io/',
      },
    });

    expect(item.isReviewerPick).toBe(true);
    expect(item.originalRationale).toBe('AI / space theme, unique animations');
    expect(item.reviewUrl).toBe('https://vaboulus-saas.webflow.io/');
    expect(item.previewUrl).toBeNull();
  });

  it('grounds the public rationale in reviewer text, Marketplace metadata, and visual evidence', () => {
    const item = normalizeFeaturedRecord({
      id: 'recFeatured',
      fields: {
        Name: 'Vaboulus',
        [FEATURED_REVIEW_FIELD]: 'AI / space theme, unique animations',
        'ℹ️Description (Short)': 'A high-performance email experience.',
        'ℹ️🪣Categories (Text)': 'Software & SaaS, AI',
        'ℹ️👘Styles': ['recModern'],
        'ℹ️Notes': 'Uses CMS. Includes GSAP. Webflow Way Validator confirmed: 100% pass.',
        '🖼️Thumbnail Image': [{ url: 'https://images.example/primary.webp' }],
        '🖼️Thumbnail Image (Secondary)': [{ url: 'https://images.example/secondary.webp' }],
        '🔗Website URL': 'https://vaboulus-saas.webflow.io/',
      },
    });

    const request = buildOpenAiReviewRequest({
      item,
      model: 'gpt-4.1-mini',
      siteEvidence: {
        url: item.reviewUrl!,
        status: 200,
        title: 'Vaboulus — AI email assistant',
        headings: ['Reach Inbox Zero Faster'],
        textSnippet: 'A high-performance email experience built for people who rely on their inbox.',
        signals: ['GSAP', 'responsive navigation'],
      },
    });

    const serialized = JSON.stringify(request);
    expect(serialized).toContain('Preserve every supported idea in the existing human note');
    expect(serialized).toContain('AI / space theme, unique animations');
    expect(serialized).toContain('https://images.example/primary.webp');
    expect(serialized).toContain('https://images.example/secondary.webp');
    expect(serialized).toContain('buyer fit');
  });

  it('requires Anthropic to return the rationale through a structured review tool', () => {
    const item = normalizeFeaturedRecord({
      id: 'recFeatured',
      fields: { Name: 'Origin', '🔗Website URL': 'https://origin.webflow.io/' },
    });
    const request = buildAnthropicReviewRequest({
      item,
      model: 'claude-sonnet-5',
      siteEvidence: {
        url: item.reviewUrl!,
        status: 200,
        title: 'Origin',
        headings: ['Independent studio'],
        textSnippet: 'Selected projects from an independent creative studio.',
        signals: ['GSAP'],
      },
      imageContent: [{ type: 'image', source: { type: 'base64', media_type: 'image/webp', data: 'abc' } }],
    });

    expect(request).toMatchObject({
      tool_choice: { type: 'tool', name: 'submit_featured_review' },
      tools: [{ name: 'submit_featured_review', input_schema: { additionalProperties: false } }],
    });
  });

  it('accepts a grounded buyer-facing draft and rejects a generic replacement of human judgment', () => {
    const item = normalizeFeaturedRecord({
      id: 'recFeatured',
      fields: {
        Name: 'Vaboulus',
        [FEATURED_REVIEW_FIELD]: 'AI / space theme, unique animations',
        '🔗Website URL': 'https://vaboulus-saas.webflow.io/',
      },
    });
    const evidence = {
      url: item.reviewUrl!,
      status: 200,
      title: 'Vaboulus',
      headings: ['Reach Inbox Zero Faster'],
      textSnippet: 'AI email assistant.',
      signals: ['GSAP'],
    };

    expect(
      parseReviewDraft(
        JSON.stringify({
          rationale:
            'A distinctive space-inspired AI aesthetic and polished animations make this a memorable fit for software teams that want a more expressive product story.',
          evidence: ['space-inspired visual system', 'animation-led product storytelling'],
          confidence: 'high',
        }),
        item,
        evidence,
      ).rationale,
    ).toContain('space-inspired');

    expect(() =>
      parseReviewDraft(
        JSON.stringify({
          rationale:
            'A beautiful and exceptional template with a polished visual direction that makes it a great choice for many different kinds of businesses.',
          evidence: ['polished visual direction', 'broad business appeal'],
          confidence: 'high',
        }),
        item,
        evidence,
      ),
    ).toThrow(/human note/i);

    expect(() =>
      parseReviewDraft(
        JSON.stringify({
          rationale:
            'A distinctive space-inspired visual direction gives this product template a memorable identity for software teams that want a polished launch site.',
          evidence: ['space-inspired visual direction', 'software product positioning'],
          confidence: 'high',
        }),
        item,
        evidence,
      ),
    ).toThrow(/human note/i);
  });

  it('accepts valid review JSON wrapped in a brief model preface', () => {
    const item = normalizeFeaturedRecord({
      id: 'recFeatured',
      fields: { Name: 'Origin', '🔗Website URL': 'https://origin.webflow.io/' },
    });
    const evidence = {
      url: item.reviewUrl!,
      status: 200,
      title: 'Origin',
      headings: ['Independent studio'],
      textSnippet: 'Selected projects from an independent creative studio.',
      signals: ['GSAP'],
    };

    const draft = parseReviewDraft(
      `Here is the requested JSON:\n${JSON.stringify({
        rationale:
          'A cinematic monochrome portfolio and motion-led project presentation make this a strong fit for creative studios that want their work to command attention.',
        evidence: ['Monochrome portfolio composition', 'Motion-led project presentation'],
        confidence: 'high',
      })}\nEnd of response.`,
      item,
      evidence,
    );

    expect(draft.confidence).toBe('high');
  });

  it('requires an explicit write approval and a durable proposal artifact', () => {
    expect(() => assertFeaturedFeedbackWriteAllowed({}, '/tmp/proposals.jsonl')).toThrow(
      /AIRTABLE_FEATURED_FEEDBACK_WRITE_APPROVED=1/,
    );
    expect(() =>
      assertFeaturedFeedbackWriteAllowed({ AIRTABLE_FEATURED_FEEDBACK_WRITE_APPROVED: '1' }, ''),
    ).toThrow(/proposal artifact/i);
    expect(() =>
      assertFeaturedFeedbackWriteAllowed(
        { AIRTABLE_FEATURED_FEEDBACK_WRITE_APPROVED: '1' },
        '/tmp/proposals.jsonl',
      ),
    ).not.toThrow();
  });

  it('captures reviewable published-site evidence without treating scripts as visible copy', () => {
    const evidence = summarizePublishedSite(
      'https://example.webflow.io/',
      200,
      `<!doctype html><html><head><title>Origin Studio</title><meta name="description" content="Independent creative studio"></head>
      <body><nav>Work About</nav><h1>Ideas in motion</h1><h2>Selected work</h2><p>Brand systems and digital experiences.</p>
      <canvas></canvas><video></video><script src="/gsap.min.js">hidden words</script><script>window.lenis = {}</script></body></html>`,
    );

    expect(evidence.title).toBe('Origin Studio');
    expect(evidence.headings).toEqual(['Ideas in motion', 'Selected work']);
    expect(evidence.textSnippet).not.toContain('hidden words');
    expect(evidence.signals).toEqual(expect.arrayContaining(['GSAP', 'Lenis', 'canvas', 'video']));
  });
});
