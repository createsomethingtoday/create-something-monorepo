import { writable } from 'svelte/store';

export interface User {
	id: string;
	email: string;
	name: string;
	membership: boolean;
	createdAt: string;
}

export interface AuthState {
	authenticated: boolean;
	user: User | null;
	loading: boolean;
}

const initialState: AuthState = {
	authenticated: false,
	user: null,
	loading: true
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		setUser: (user: User) => {
			update(state => ({
				...state,
				authenticated: true,
				user,
				loading: false
			}));
		},

		setUnauthenticated: () => {
			set({
				authenticated: false,
				user: null,
				loading: false
			});
		},

		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},

		logout: () => {
			set({
				authenticated: false,
				user: null,
				loading: false
			});
		}
	};
}

export const authStore = createAuthStore();
