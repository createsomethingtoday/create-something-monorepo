import { defineMDSveXConfig as defineConfig } from 'mdsvex';

const config = defineConfig({
	extensions: ['.md'],
	layout: {
		_: './src/lib/layouts/MarkdownLayout.svelte'
	}
});

export default config;
