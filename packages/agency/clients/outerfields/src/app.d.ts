// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				name?: string;
				role: 'user' | 'admin';
			};
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB?: D1Database;
				KV?: KVNamespace;
				VIDEO_STATS?: KVNamespace;
			};
		}
	}
}

export {};
