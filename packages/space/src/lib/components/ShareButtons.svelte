<script lang="ts">
	interface Props {
		title: string;
		url: string;
		isCompleted?: boolean;
	}

	let { title, url, isCompleted = false }: Props = $props();

	let shareText = $derived(
		isCompleted ? `I just completed ${title} on Create Something!` : title
	);

	const shareLinks = $derived({
		twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
		facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`,
		linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
		reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareText)}`,
	});

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(url);
			console.log('Link copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};
</script>

<div class="share-buttons sticky top-24 space-y-4 animate-slide-in">
	<h3 class="share-title mb-4">Share:</h3>

	<div class="flex flex-col gap-3">
		<!-- X (formerly Twitter) -->
		<a
			href={shareLinks.twitter}
			target="_blank"
			rel="noopener noreferrer"
			class="share-button flex items-center justify-center group"
			aria-label="Share on X"
		>
			<svg
				class="share-icon w-5 h-5"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
			</svg>
		</a>

		<!-- Facebook -->
		<a
			href={shareLinks.facebook}
			target="_blank"
			rel="noopener noreferrer"
			class="share-button flex items-center justify-center group"
			aria-label="Share on Facebook"
		>
			<svg
				class="share-icon w-5 h-5"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M10 0C4.477 0 0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.879V12.89H5.898V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.989C16.343 19.129 20 14.99 20 10c0-5.523-4.477-10-10-10z" />
			</svg>
		</a>

		<!-- LinkedIn -->
		<a
			href={shareLinks.linkedin}
			target="_blank"
			rel="noopener noreferrer"
			class="share-button flex items-center justify-center group"
			aria-label="Share on LinkedIn"
		>
			<svg
				class="share-icon w-5 h-5"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M6.94 5a2 2 0 11-4-.002 2 2 0 014 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" />
			</svg>
		</a>

		<!-- Reddit -->
		<a
			href={shareLinks.reddit}
			target="_blank"
			rel="noopener noreferrer"
			class="share-button flex items-center justify-center group"
			aria-label="Share on Reddit"
		>
			<svg
				class="share-icon w-5 h-5"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
			</svg>
		</a>

		<!-- Copy Link -->
		<button
			onclick={copyToClipboard}
			class="share-button flex items-center justify-center group"
			aria-label="Copy link"
		>
			<svg
				class="share-icon w-5 h-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
				/>
			</svg>
		</button>
	</div>
</div>

<style>
	.share-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.share-button {
		width: 3rem;
		height: 3rem;
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.share-button:hover {
		background: var(--color-active);
		border-color: var(--color-border-emphasis);
	}

	.share-icon {
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.share-button:hover .share-icon {
		color: var(--color-fg-primary);
	}

	.animate-slide-in {
		opacity: 0;
		transform: translateX(-12px);
		animation: slide-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
	}

	@keyframes slide-in {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-slide-in {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
