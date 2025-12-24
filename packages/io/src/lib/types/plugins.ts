export interface UserPlugin {
	id: string;
	userId: string;
	pluginSlug: string;
	enabled: boolean;
	enabledAt: string | null;
	disabledAt: string | null;
	settingsJson: string | null;
}

export interface UserPluginResponse {
	slug: string;
	enabled: boolean;
	enabledAt?: string;
	disabledAt?: string;
	settings?: Record<string, unknown>;
}

export interface PluginsListResponse {
	plugins: Plugin[];
}

export interface UserPluginsResponse {
	plugins: UserPluginResponse[];
}

export interface PluginExportResponse {
	skills?: Record<string, unknown>;
}

export interface Plugin {
	slug: string;
	name: string;
	description: string;
	category: string;
	tags: string[];
	features: string[];
}
