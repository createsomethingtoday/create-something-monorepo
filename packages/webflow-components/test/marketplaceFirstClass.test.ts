import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPageActionUrl } from '../src/components/chat/templateChatPageAction';
import { createMarketplaceAgentTools } from '../src/components/marketplace/agentTools';

test('an agent can show the same subcategory and page it searched', () => {
  const url = new URL(buildPageActionUrl('https://webflow.com/templates/all', {
    child_category_slug: 'photography-and-video-portfolio', page: 2,
  }));
  assert.equal(url.searchParams.get('subcategory'), 'photography-and-video-portfolio');
  assert.equal(url.searchParams.get('page'), '2');
});

test('detail lookup uses exact identity rather than a ranked name query', async () => {
  const calls: URL[] = [];
  const tools = createMarketplaceAgentTools({ fetchImpl: (async (url: string) => {
    const request = new URL(url); calls.push(request);
    return { ok: true, json: async () => ({items: request.searchParams.get('template_slug') === 'common-name-37' ? [{template_slug:'common-name-37',name:'Common Name'}] : []}) };
  }) as typeof fetch });
  const result = await tools.find(t => t.name === 'get_template')!.execute({template_slug:'common-name-37'}) as {ok:boolean};
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].searchParams.get('template_slug'), 'common-name-37');
  assert.equal(calls[0].searchParams.has('q'), false);
});

test('globally valid styles allow zero-result category combinations', async () => {
  const tools = createMarketplaceAgentTools({ fetchImpl: (async (url: string) => {
    const request = new URL(url);
    return { ok: true, json: async () => ({
      category_pills: [{slug:'portfolio-and-agency-websites'}],
      available_facets: {styles: request.searchParams.has('category_group_slug') ? [] : [{slug:'minimal'}]},
      items: [], pagination: {total_items:0},
    }) };
  }) as typeof fetch });
  const result = await tools.find(t => t.name === 'search_templates')!.execute({category_group_slug:'portfolio-and-agency-websites',styles:['minimal']}) as {total_items:number};
  assert.equal(result.total_items, 0);
});
