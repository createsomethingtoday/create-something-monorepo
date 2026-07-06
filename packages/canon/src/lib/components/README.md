# Canon Root Components

Root components are shared CREATE SOMETHING surfaces that sit above the smaller form,
feedback, navigation, and Clear primitives. Use them when a property needs content cards,
page chrome, sharing, metadata, or framework-specific proof surfaces.

## Examples

```svelte
<script lang="ts">
	import {
		CatalogCard,
		CategorySection,
		CrossPropertyLink,
		Footer,
		Heading,
		HermeneuticCircle,
		MarkdownPreviewModal,
		ModeIndicator,
		PageActions,
		PaperCard,
		PapersGrid,
		PropertyFunnel,
		QuoteBlock,
		RelatedArticles,
		ShareButtons,
		SkipToContent,
		TriadHealth
	} from '@create-something/canon/components';
</script>

<SkipToContent targetId="main-content" />
<Heading level={1}>Canonical property surface</Heading>
<ModeIndicator mode="judgment" label="Review required" />
<CatalogCard title="Canon Registry" href="/canon/resources/registry" description="Agent-readable source of truth." />
<CategorySection title="Evidence" items={[]} />
<PaperCard title="MCP-first systems" href="/papers/mcp-first" description="Research note." />
<PapersGrid papers={[]} />
<QuoteBlock quote="Policy is an artifact." attribution="CREATE SOMETHING" />
<RelatedArticles articles={[]} />
<ShareButtons title="Canon" url="https://createsomething.ltd/canon" />
<CrossPropertyLink property="agency" href="https://createsomething.agency" label="Open Agency" />
<PropertyFunnel property="ltd" />
<TriadHealth database="ready" automation="review" judgment="blocked" />
<HermeneuticCircle />
<PageActions actions={[]} />
<MarkdownPreviewModal open={false} markdown="# Preview" />
<Footer mode="ltd" />
```

## Accessibility Evidence

- Root components should preserve semantic headings, link text, and explicit action labels.
- Cards and article surfaces need titles that remain meaningful outside their visual context.
- Sharing, funnel, and cross-property controls must expose the destination and action in text.
