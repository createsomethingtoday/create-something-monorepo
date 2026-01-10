import { resolve } from 'path';

export default {
	plugins: {
		'postcss-import': {
			resolve(id, basedir) {
				// Handle @create-something/components package CSS imports
				if (id.startsWith('@create-something/components/styles/')) {
					const file = id.replace('@create-something/components/styles/', '');
					return resolve(basedir, '../../../components/dist/styles/', file);
				}
				return id;
			}
		},
		tailwindcss: {},
		autoprefixer: {},
	},
};
