import { ComposioClient, type ComposioToolDef } from '@create-something/composio-bridge';

export type PinnedNotionAction =
  | 'search'
  | 'list_databases'
  | 'get_database'
  | 'query_database'
  | 'get_page'
  | 'list_block_children'
  | 'create_page'
  | 'update_page'
  | 'append_blocks'
  | 'archive_page'
  | 'bulk_update'
  | 'bulk_archive';

const ACTION_MATCHERS: Record<PinnedNotionAction, string[][]> = {
  search: [['search']],
  list_databases: [['list', 'database'], ['list', 'data', 'source']],
  get_database: [['retrieve', 'database'], ['get', 'database'], ['retrieve', 'data', 'source']],
  query_database: [['query', 'database'], ['query', 'data', 'source']],
  get_page: [['retrieve', 'page'], ['get', 'page']],
  list_block_children: [['block', 'children'], ['list', 'block']],
  create_page: [['create', 'page']],
  update_page: [['update', 'page']],
  append_blocks: [['append', 'block'], ['append', 'children']],
  archive_page: [['archive', 'page']],
  bulk_update: [['update', 'page']],
  bulk_archive: [['archive', 'page']],
};

const ACTION_SLUG_PREFERENCES: Record<PinnedNotionAction, string[]> = {
  search: ['NOTION_SEARCH_NOTION_PAGE', 'NOTION_SEARCH'],
  list_databases: ['NOTION_SEARCH_NOTION_PAGE', 'NOTION_LIST_DATABASES', 'NOTION_FETCH_DATA'],
  get_database: ['NOTION_FETCH_DATABASE', 'NOTION_GET_DATABASE', 'NOTION_RETRIEVE_DATABASE'],
  query_database: ['NOTION_QUERY_DATABASE', 'NOTION_QUERY_DATABASE_WITH_FILTER', 'NOTION_QUERY_DATA_SOURCE'],
  get_page: ['NOTION_RETRIEVE_PAGE', 'NOTION_GET_PAGE'],
  list_block_children: ['NOTION_FETCH_BLOCK_CONTENTS', 'NOTION_LIST_BLOCK_CHILDREN'],
  create_page: ['NOTION_CREATE_NOTION_PAGE', 'NOTION_CREATE_PAGE'],
  update_page: ['NOTION_UPDATE_PAGE'],
  append_blocks: ['NOTION_APPEND_BLOCK_CHILDREN', 'NOTION_APPEND_BLOCKS'],
  archive_page: ['NOTION_ARCHIVE_NOTION_PAGE', 'NOTION_ARCHIVE_PAGE'],
  bulk_update: ['NOTION_UPDATE_PAGE'],
  bulk_archive: ['NOTION_ARCHIVE_NOTION_PAGE', 'NOTION_ARCHIVE_PAGE'],
};

export interface ResolvedNotionRoute {
  action: PinnedNotionAction;
  slug: string;
  name: string;
  parameters: ComposioToolDef['parameters'];
}

export interface ComposioNotionClientLike {
  getTools(
    toolkits: string[],
    options?: { important?: boolean; limit?: number },
  ): Promise<ComposioToolDef[]>;
  executeTool(
    toolSlug: string,
    params: Record<string, unknown>,
    userId?: string,
  ): Promise<Record<string, unknown>>;
}

export class ComposioNotionDispatcher {
  private readonly client: ComposioNotionClientLike;
  private routesPromise: Promise<Map<PinnedNotionAction, ResolvedNotionRoute>> | null = null;

  constructor(apiKey: string, client?: ComposioNotionClientLike) {
    this.client = client ?? new ComposioClient({ apiKey });
  }

  async execute(action: PinnedNotionAction, args: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const routes = await this.getRoutes();
    const route = routes.get(action);
    if (!route) {
      throw new Error(`No Composio Notion route found for action "${action}".`);
    }

    if (action === 'bulk_update') {
      return this.executeBulkUpdate(args, userId, route);
    }
    if (action === 'bulk_archive') {
      return this.executeBulkArchive(args, userId, route);
    }

    const forwardedArgs = adaptArgsForRoute(action, route, args);
    return this.client.executeTool(route.slug, forwardedArgs, userId);
  }

  async getRoutes(): Promise<Map<PinnedNotionAction, ResolvedNotionRoute>> {
    if (!this.routesPromise) {
      this.routesPromise = this.buildRoutes();
    }
    return this.routesPromise;
  }

  private async buildRoutes(): Promise<Map<PinnedNotionAction, ResolvedNotionRoute>> {
    const tools = await this.client.getTools(['notion'], { important: false, limit: 200 });
    const routes = new Map<PinnedNotionAction, ResolvedNotionRoute>();

    for (const action of Object.keys(ACTION_MATCHERS) as PinnedNotionAction[]) {
      const route = resolveRouteForAction(action, tools);
      if (route) {
        routes.set(action, route);
      }
    }

    return routes;
  }

  private async executeBulkUpdate(
    args: Record<string, unknown>,
    userId: string,
    route: ResolvedNotionRoute,
  ): Promise<Record<string, unknown>> {
    const pageIds = Array.isArray(args.page_ids) ? args.page_ids.filter((value): value is string => typeof value === 'string') : [];
    const properties = isPlainObject(args.properties) ? args.properties : {};
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    for (const pageId of pageIds) {
      try {
        await this.client.executeTool(route.slug, adaptArgsForRoute('update_page', route, { page_id: pageId, properties }), userId);
        results.push({ id: pageId, success: true });
      } catch (error) {
        results.push({ id: pageId, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { results };
  }

  private async executeBulkArchive(
    args: Record<string, unknown>,
    userId: string,
    route: ResolvedNotionRoute,
  ): Promise<Record<string, unknown>> {
    const pageIds = Array.isArray(args.page_ids) ? args.page_ids.filter((value): value is string => typeof value === 'string') : [];
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    for (const pageId of pageIds) {
      try {
        await this.client.executeTool(route.slug, adaptArgsForRoute('archive_page', route, { page_id: pageId }), userId);
        results.push({ id: pageId, success: true });
      } catch (error) {
        results.push({ id: pageId, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { results };
  }
}

export function resolveRouteForAction(action: PinnedNotionAction, tools: ComposioToolDef[]): ResolvedNotionRoute | null {
  const phrases = ACTION_MATCHERS[action];
  const preferredSlugs = ACTION_SLUG_PREFERENCES[action];
  let best: { tool: ComposioToolDef; score: number } | null = null;

  for (const tool of tools) {
    const haystack = `${tool.slug} ${tool.name} ${tool.description}`.toLowerCase();
    let score = 0;
    for (const phrase of phrases) {
      if (phrase.every((term) => haystack.includes(term))) {
        score = Math.max(score, phrase.length);
      }
    }

    if (action === 'append_blocks' && !hasParameter(tool.parameters, 'children')) continue;
    if ((action === 'update_page' || action === 'bulk_update') && !hasAnyParameter(tool.parameters, ['page_id', 'id'])) continue;
    if ((action === 'create_page') && !hasAnyParameter(tool.parameters, ['data_source_id', 'database_id', 'parent'])) continue;
    if (
      action === 'list_databases' &&
      hasAnyRequiredParameter(tool.parameters, ['parent_id', 'title', 'database_id', 'data_source_id'])
    ) {
      continue;
    }

    if (preferredSlugs.includes(tool.slug)) {
      score += 100;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { tool, score };
    }
  }

  if (!best) return null;
  return {
    action,
    slug: best.tool.slug,
    name: best.tool.name,
    parameters: best.tool.parameters,
  };
}

function hasParameter(parameters: ComposioToolDef['parameters'], key: string): boolean {
  return Object.prototype.hasOwnProperty.call(parameters.properties ?? {}, key);
}

function hasAnyParameter(parameters: ComposioToolDef['parameters'], keys: string[]): boolean {
  return keys.some((key) => hasParameter(parameters, key));
}

function hasAnyRequiredParameter(parameters: ComposioToolDef['parameters'], keys: string[]): boolean {
  if (!Array.isArray(parameters.required)) return false;
  return parameters.required.some((key) => keys.includes(key));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function adaptArgsForRoute(
  action: PinnedNotionAction,
  route: ResolvedNotionRoute,
  rawArgs: Record<string, unknown>,
): Record<string, unknown> {
  const args = { ...rawArgs };
  delete args.workspace;
  delete args.entity_id;
  delete args.account_id;
  delete args.__dm_entity_id;

  const properties = route.parameters.properties ?? {};

  if ('database_id' in properties && 'data_source_id' in args && !('database_id' in args)) {
    args.database_id = args.data_source_id;
  }
  if ('data_source_id' in properties && 'database_id' in args && !('data_source_id' in args)) {
    args.data_source_id = args.database_id;
  }
  if ('block_id' in properties && 'page_id' in args && !('block_id' in args)) {
    args.block_id = args.page_id;
  }
  if ('page_id' in properties && 'block_id' in args && !('page_id' in args) && action === 'list_block_children') {
    args.page_id = args.block_id;
  }
  if ('query' in properties && typeof args.query !== 'string' && typeof args.search === 'string') {
    args.query = args.search;
  }
  if (action === 'list_databases') {
    if ('filter_property' in properties && typeof args.filter_property !== 'string') {
      args.filter_property = 'object';
    }
    if ('filter_value' in properties && typeof args.filter_value !== 'string') {
      args.filter_value = 'database';
    }
  }
  if ('properties' in properties && isPlainObject(args.properties)) {
    args.properties = args.properties;
  }

  return args;
}
