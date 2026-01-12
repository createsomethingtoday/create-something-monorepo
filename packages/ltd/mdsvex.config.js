import { defineMDSveXConfig as defineConfig } from 'mdsvex';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = defineConfig({
	extensions: ['.md'],
	layout: {
		_: join(__dirname, 'src/lib/layouts/MarkdownLayout.svelte')
	}
});

export default config;
