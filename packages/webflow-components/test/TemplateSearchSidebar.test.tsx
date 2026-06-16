import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isTemplateSearchPath } from '../src/components/marketplace/TemplateSearchSidebar';

test('detects search routes where sidebar category links must navigate', () => {
  assert.equal(isTemplateSearchPath('/templates/search'), true);
  assert.equal(isTemplateSearchPath('/templates/search-v2'), true);
  assert.equal(isTemplateSearchPath('/templates/search-v2/'), true);
  assert.equal(isTemplateSearchPath('/templates/category/food-and-drink-websites'), false);
  assert.equal(isTemplateSearchPath('/templates/landing-page'), false);
});
