
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const NVM_INC: string;
	export const RUST_LOG: string;
	export const npm_package_devDependencies_postcss_import: string;
	export const npm_package_dependencies__create_something_mcp_authz: string;
	export const NODE: string;
	export const INIT_CWD: string;
	export const NVM_CD_FLAGS: string;
	export const npm_package_devDependencies_typescript: string;
	export const TERM: string;
	export const SHELL: string;
	export const npm_package_devDependencies_vite: string;
	export const TMPDIR: string;
	export const HOMEBREW_REPOSITORY: string;
	export const CONDA_SHLVL: string;
	export const CONDA_PROMPT_MODIFIER: string;
	export const npm_package_scripts_dev: string;
	export const MallocNanoZone: string;
	export const NO_COLOR: string;
	export const npm_package_dependencies_lucide_svelte: string;
	export const npm_package_private: string;
	export const npm_package_devDependencies__sveltejs_kit: string;
	export const npm_config_registry: string;
	export const LC_ALL: string;
	export const USER: string;
	export const NVM_DIR: string;
	export const npm_package_description: string;
	export const npm_config_recursive: string;
	export const npm_package_scripts_check_watch: string;
	export const OPENAI_API_KEY: string;
	export const COMMAND_MODE: string;
	export const npm_package_scripts_deploy: string;
	export const npm_package_devDependencies_mdsvex: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const CONDA_EXE: string;
	export const SSH_AUTH_SOCK: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_package_devDependencies_postcss: string;
	export const npm_execpath: string;
	export const PAGER: string;
	export const FZF_DEFAULT_OPTS: string;
	export const npm_package_devDependencies_svelte: string;
	export const npm_package_dependencies__create_something_canon: string;
	export const _CE_CONDA: string;
	export const npm_package_dependencies__composio_core: string;
	export const npm_config_frozen_lockfile: string;
	export const PATH: string;
	export const ZSH_TMUX_AUTOSTART: string;
	export const npm_package_scripts_cf_typegen: string;
	export const LaunchInstanceID: string;
	export const __CFBundleIdentifier: string;
	export const CONDA_PREFIX: string;
	export const CODEX_THREAD_ID: string;
	export const PWD: string;
	export const npm_package_devDependencies_tailwindcss: string;
	export const npm_command: string;
	export const DISABLE_AUTO_UPDATE: string;
	export const npm_package_scripts_preview: string;
	export const PERPLEXITY_API_KEY: string;
	export const npm_lifecycle_event: string;
	export const LANG: string;
	export const npm_package_name: string;
	export const npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
	export const npm_package_devDependencies_marked: string;
	export const NODE_PATH: string;
	export const npm_package_scripts_build: string;
	export const XPC_FLAGS: string;
	export const CODEX_CI: string;
	export const ZSH_TMUX_AUTOSTARTED: string;
	export const npm_package_scripts_deploy_preview: string;
	export const npm_config_node_gyp: string;
	export const _CE_M: string;
	export const XPC_SERVICE_NAME: string;
	export const npm_package_version: string;
	export const npm_package_devDependencies__sveltejs_adapter_auto: string;
	export const npm_package_devDependencies_autoprefixer: string;
	export const npm_package_devDependencies_svelte_check: string;
	export const npm_package_dependencies__create_something_tufte: string;
	export const SHLVL: string;
	export const RAGIE_API_KEY: string;
	export const HOME: string;
	export const npm_package_type: string;
	export const CODEX_SHELL: string;
	export const NOTION_SYNC_BEARER_TOKEN: string;
	export const N8N_OPENAI_API_KEY: string;
	export const HOMEBREW_PREFIX: string;
	export const AIRTABLE_BASE_ID: string;
	export const GH_PAGER: string;
	export const npm_package_devDependencies_highlight_js: string;
	export const npm_package_dependencies_stripe: string;
	export const LOGNAME: string;
	export const CONDA_PYTHON_EXE: string;
	export const npm_package_devDependencies__sveltejs_adapter_cloudflare: string;
	export const npm_package_devDependencies__cloudflare_workers_types: string;
	export const npm_lifecycle_script: string;
	export const SLACK_CREATE_SOMETHING_MCP_TOKEN: string;
	export const LC_CTYPE: string;
	export const FZF_CTRL_T_COMMAND: string;
	export const FZF_DEFAULT_COMMAND: string;
	export const npm_package_devDependencies_wrangler: string;
	export const NVM_BIN: string;
	export const CONDA_DEFAULT_ENV: string;
	export const BUN_INSTALL: string;
	export const npm_config_user_agent: string;
	export const INFOPATH: string;
	export const HOMEBREW_CELLAR: string;
	export const npm_package_devDependencies__playwright_test: string;
	export const npm_package_devDependencies__types_node: string;
	export const VULTR_API_KEY: string;
	export const npm_package_scripts_smoke_mobile: string;
	export const OSLogRateLimit: string;
	export const npm_package_scripts_prepare: string;
	export const GIT_PAGER: string;
	export const SECURITYSESSIONID: string;
	export const npm_package_scripts_check: string;
	export const COLORTERM: string;
	export const CODEX_INTERNAL_ORIGINATOR_OVERRIDE: string;
	export const AIRTABLE_TABLE_ID: string;
	export const AIRTABLE_API_TOKEN: string;
	export const npm_node_execpath: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		NVM_INC: string;
		RUST_LOG: string;
		npm_package_devDependencies_postcss_import: string;
		npm_package_dependencies__create_something_mcp_authz: string;
		NODE: string;
		INIT_CWD: string;
		NVM_CD_FLAGS: string;
		npm_package_devDependencies_typescript: string;
		TERM: string;
		SHELL: string;
		npm_package_devDependencies_vite: string;
		TMPDIR: string;
		HOMEBREW_REPOSITORY: string;
		CONDA_SHLVL: string;
		CONDA_PROMPT_MODIFIER: string;
		npm_package_scripts_dev: string;
		MallocNanoZone: string;
		NO_COLOR: string;
		npm_package_dependencies_lucide_svelte: string;
		npm_package_private: string;
		npm_package_devDependencies__sveltejs_kit: string;
		npm_config_registry: string;
		LC_ALL: string;
		USER: string;
		NVM_DIR: string;
		npm_package_description: string;
		npm_config_recursive: string;
		npm_package_scripts_check_watch: string;
		OPENAI_API_KEY: string;
		COMMAND_MODE: string;
		npm_package_scripts_deploy: string;
		npm_package_devDependencies_mdsvex: string;
		PNPM_SCRIPT_SRC_DIR: string;
		CONDA_EXE: string;
		SSH_AUTH_SOCK: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_package_devDependencies_postcss: string;
		npm_execpath: string;
		PAGER: string;
		FZF_DEFAULT_OPTS: string;
		npm_package_devDependencies_svelte: string;
		npm_package_dependencies__create_something_canon: string;
		_CE_CONDA: string;
		npm_package_dependencies__composio_core: string;
		npm_config_frozen_lockfile: string;
		PATH: string;
		ZSH_TMUX_AUTOSTART: string;
		npm_package_scripts_cf_typegen: string;
		LaunchInstanceID: string;
		__CFBundleIdentifier: string;
		CONDA_PREFIX: string;
		CODEX_THREAD_ID: string;
		PWD: string;
		npm_package_devDependencies_tailwindcss: string;
		npm_command: string;
		DISABLE_AUTO_UPDATE: string;
		npm_package_scripts_preview: string;
		PERPLEXITY_API_KEY: string;
		npm_lifecycle_event: string;
		LANG: string;
		npm_package_name: string;
		npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
		npm_package_devDependencies_marked: string;
		NODE_PATH: string;
		npm_package_scripts_build: string;
		XPC_FLAGS: string;
		CODEX_CI: string;
		ZSH_TMUX_AUTOSTARTED: string;
		npm_package_scripts_deploy_preview: string;
		npm_config_node_gyp: string;
		_CE_M: string;
		XPC_SERVICE_NAME: string;
		npm_package_version: string;
		npm_package_devDependencies__sveltejs_adapter_auto: string;
		npm_package_devDependencies_autoprefixer: string;
		npm_package_devDependencies_svelte_check: string;
		npm_package_dependencies__create_something_tufte: string;
		SHLVL: string;
		RAGIE_API_KEY: string;
		HOME: string;
		npm_package_type: string;
		CODEX_SHELL: string;
		NOTION_SYNC_BEARER_TOKEN: string;
		N8N_OPENAI_API_KEY: string;
		HOMEBREW_PREFIX: string;
		AIRTABLE_BASE_ID: string;
		GH_PAGER: string;
		npm_package_devDependencies_highlight_js: string;
		npm_package_dependencies_stripe: string;
		LOGNAME: string;
		CONDA_PYTHON_EXE: string;
		npm_package_devDependencies__sveltejs_adapter_cloudflare: string;
		npm_package_devDependencies__cloudflare_workers_types: string;
		npm_lifecycle_script: string;
		SLACK_CREATE_SOMETHING_MCP_TOKEN: string;
		LC_CTYPE: string;
		FZF_CTRL_T_COMMAND: string;
		FZF_DEFAULT_COMMAND: string;
		npm_package_devDependencies_wrangler: string;
		NVM_BIN: string;
		CONDA_DEFAULT_ENV: string;
		BUN_INSTALL: string;
		npm_config_user_agent: string;
		INFOPATH: string;
		HOMEBREW_CELLAR: string;
		npm_package_devDependencies__playwright_test: string;
		npm_package_devDependencies__types_node: string;
		VULTR_API_KEY: string;
		npm_package_scripts_smoke_mobile: string;
		OSLogRateLimit: string;
		npm_package_scripts_prepare: string;
		GIT_PAGER: string;
		SECURITYSESSIONID: string;
		npm_package_scripts_check: string;
		COLORTERM: string;
		CODEX_INTERNAL_ORIGINATOR_OVERRIDE: string;
		AIRTABLE_TABLE_ID: string;
		AIRTABLE_API_TOKEN: string;
		npm_node_execpath: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
