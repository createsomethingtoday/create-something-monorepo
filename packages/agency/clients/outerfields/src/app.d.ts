// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				name: string;
				membership: boolean;
				createdAt: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB?: D1Database;
				SESSIONS?: KVNamespace;
				VIDEO_STATS?: KVNamespace;
				AI?: Ai;
				ANTHROPIC_API_KEY?: string;
			};
		}
	}
}

export {};
