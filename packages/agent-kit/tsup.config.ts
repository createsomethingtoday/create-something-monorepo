import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		'bin/cli': 'bin/cli.ts',
		'src/index': 'src/index.ts',
		'src/validate': 'src/validate.ts',
		'src/install': 'src/install.ts',
		'src/machine': 'src/machine.ts'
	},
	format: ['esm'],
	dts: true,
	clean: true,
	splitting: false,
	shims: true,
	banner: {
		js: '#!/usr/bin/env node'
	}
});
