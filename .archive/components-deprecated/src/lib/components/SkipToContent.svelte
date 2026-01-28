<script lang="ts">
	/**
	 * SkipToContent - WCAG 2.1 AA compliant skip link.
	 * Place at the very beginning of your layout, before navigation.
	 * Requires a <main id="main-content"> element as the target.
	 *
	 * Styles from canon.css handle visibility (hidden until focused).
	 */
	interface Props {
		/** Target element ID (default: "main-content") */
		target?: string;
		/** Link text (default: "Skip to main content") */
		text?: string;
	}

	let { target = 'main-content', text = 'Skip to main content' }: Props = $props();
</script>

<a href="#{target}" class="skip-to-content">{text}</a>
