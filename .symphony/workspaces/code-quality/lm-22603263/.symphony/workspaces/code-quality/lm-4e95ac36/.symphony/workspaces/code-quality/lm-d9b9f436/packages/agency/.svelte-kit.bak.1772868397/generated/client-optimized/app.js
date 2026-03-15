export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27'),
	() => import('./nodes/28'),
	() => import('./nodes/29'),
	() => import('./nodes/30'),
	() => import('./nodes/31'),
	() => import('./nodes/32'),
	() => import('./nodes/33'),
	() => import('./nodes/34'),
	() => import('./nodes/35'),
	() => import('./nodes/36')
];

export const server_loads = [0];

export const dictionary = {
		"/": [~3],
		"/about": [4],
		"/account": [~5],
		"/admin/community": [~6],
		"/admin/funnel": [~7],
		"/admin/funnel/leads/new": [8],
		"/admin/funnel/record": [9],
		"/admin/security": [~10],
		"/admin/security/audit": [~11],
		"/admin/security/bearer-tokens": [~12],
		"/admin/security/commercial": [~13],
		"/admin/security/contracts": [~14],
		"/admin/security/partners": [~15],
		"/admin/social": [~16],
		"/auth/callback": [~17],
		"/auth/cross-domain": [~18],
		"/bearer-token-policy": [19],
		"/book": [20],
		"/contact": [21],
		"/dashboard": [~22],
		"/experiments": [~23,[2]],
		"/experiments/[slug]": [~24,[2]],
		"/login": [~25],
		"/mcp-access": [~26],
		"/methodology": [27],
		"/privacy": [28],
		"/products": [29],
		"/products/ground": [~30],
		"/products/loom": [~31],
		"/security": [32],
		"/services": [33],
		"/terms": [34],
		"/use-cases/business": [35],
		"/use-cases/enterprise": [36]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';