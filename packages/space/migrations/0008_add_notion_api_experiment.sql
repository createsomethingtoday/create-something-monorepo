-- ============================================================================
-- ADD NOTION API 2025-09-03 MIGRATION EXPERIMENT
-- ============================================================================
-- Migration: 0008_add_notion_api_experiment
-- Created: 2025-11-18
-- Purpose: Deploy interactive code experiment teaching Notion API migration

INSERT OR IGNORE INTO papers (
  id,
  title,
  slug,
  category,
  description,
  content,
  html_content,
  is_executable,
  code_lessons,
  featured,
  published,
  is_hidden,
  archived,
  difficulty_level,
  technical_focus,
  reading_time,
  excerpt,
  excerpt_short,
  excerpt_long,
  prerequisites,
  meta_title,
  meta_description,
  focus_keywords,
  ascii_art,
  created_at,
  updated_at,
  published_at
) VALUES (
  'notion-api-migration-experiment-2025',
  'Notion API 2025-09-03 Migration: database_id → data_source_id',
  'notion-api-migration-2025',
  'api-migration',
  'Interactive hands-on guide to migrating your Notion API integrations from database_id to data_source_id for the 2025-09-03 version. Learn through 3 progressive lessons covering basic migrations, batch updates, and the new unified data source architecture.',
  '# Notion API 2025-09-03 Migration: database_id → data_source_id

The Notion API is evolving. Starting September 3, 2025, the way you reference databases in API calls is changing from `database_id` to `data_source_id`.

## What''s Changing

- **Parameter Name**: `database_id` → `data_source_id`
- **ID Values**: Remain exactly the same
- **Breaking Change**: Yes - old code will fail after Sept 3, 2025
- **Deadline**: September 3, 2025

## Why This Matters

The new unified `data_source_id` parameter supports:
- Traditional databases
- Saved views
- Filtered queries
- Future data source types

This allows the Notion API to evolve without requiring code changes for every new source type.

## Timeline

- **Now - Sept 2**: Both parameters accepted (backwards compatible)
- **Sept 3+**: `database_id` parameter no longer works
- **Dec 3**: Complete removal of legacy `database_id` support

## In This Experiment

You''ll learn to:
1. Understand the parameter change and migrate a single query
2. Update multiple database queries across your codebase
3. Work with the new unified data source API approach

## Prerequisites

- Basic JavaScript knowledge
- Familiarity with async/await
- Understanding of Notion API basics
- Node.js environment

## Resources

- [Notion API Changelog](https://developers.notion.com/changelog)
- [Official Migration Guide](https://developers.notion.com/docs/guides/v1-migration)
- [Updated API Reference](https://developers.notion.com/reference)',
  '<h1>Notion API 2025-09-03 Migration: database_id → data_source_id</h1><p>The Notion API is evolving. Starting September 3, 2025, the way you reference databases in API calls is changing from <code>database_id</code> to <code>data_source_id</code>.</p><h2>What''s Changing</h2><ul><li><strong>Parameter Name</strong>: <code>database_id</code> → <code>data_source_id</code></li><li><strong>ID Values</strong>: Remain exactly the same</li><li><strong>Breaking Change</strong>: Yes - old code will fail after Sept 3, 2025</li><li><strong>Deadline</strong>: September 3, 2025</li></ul><h2>Why This Matters</h2><p>The new unified <code>data_source_id</code> parameter supports:</p><ul><li>Traditional databases</li><li>Saved views</li><li>Filtered queries</li><li>Future data source types</li></ul><p>This allows the Notion API to evolve without requiring code changes for every new source type.</p>',
  1,
  '[{"id":1,"title":"Lesson 1/3: Basic Parameter Migration","description":"Understand the breaking change and update a single query. The parameter name changes from database_id to data_source_id, but the ID value remains the same.","starterCode":"const { Client } = require(''@notionhq/client'')\n\nconst notion = new Client({\n  auth: process.env.NOTION_API_KEY,\n  notionVersion: ''2025-09-03''\n})\n\nasync function queryDatabase() {\n  // TODO: Change ''database_id'' to ''data_source_id''\n  // The ID value stays the same\n  const response = await notion.databases.query({\n    database_id: ''a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'',\n    filter: {\n      property: ''Status'',\n      select: { equals: ''In Progress'' }\n    }\n  })\n\n  return response.results.length\n}\n\nqueryDatabase().then(count => {\n  console.log(`Found ${count} pages`)\n})","solution":"const { Client } = require(''@notionhq/client'')\n\nconst notion = new Client({\n  auth: process.env.NOTION_API_KEY,\n  notionVersion: ''2025-09-03''\n})\n\nasync function queryDatabase() {\n  const response = await notion.databases.query({\n    data_source_id: ''a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'',\n    filter: {\n      property: ''Status'',\n      select: { equals: ''In Progress'' }\n    }\n  })\n\n  return response.results.length\n}\n\nqueryDatabase().then(count => {\n  console.log(`Found ${count} pages`)\n})","hints":["Only the parameter name changes, not the ID itself","Replace ''database_id'' with ''data_source_id''","The rest of the query structure (filter, sorts, etc.) remains identical"],"expectedOutput":"Found 12 pages","order":1},{"id":2,"title":"Lesson 2/3: Updating Multiple Queries","description":"Real-world scenario: Update multiple database queries in a single file. This shows how to systematically migrate your entire codebase.","starterCode":"const { Client } = require(''@notionhq/client'')\nconst notion = new Client({ \n  auth: process.env.NOTION_API_KEY,\n  notionVersion: ''2025-09-03''\n})\n\nasync function fetchAllData() {\n  // TODO: Update all three queries below\n  // Change ''database_id'' to ''data_source_id'' in each\n  \n  const users = await notion.databases.query({\n    database_id: ''users-db-abc123''\n  })\n  \n  const projects = await notion.databases.query({\n    database_id: ''projects-db-def456''\n  })\n  \n  const tasks = await notion.databases.query({\n    database_id: ''tasks-db-ghi789''\n  })\n  \n  const total = users.results.length + \n                projects.results.length + \n                tasks.results.length\n  \n  console.log(`Fetched ${total} total items`)\n  return { users, projects, tasks }\n}\n\nfetchAllData()","solution":"const { Client } = require(''@notionhq/client'')\nconst notion = new Client({ \n  auth: process.env.NOTION_API_KEY,\n  notionVersion: ''2025-09-03''\n})\n\nasync function fetchAllData() {\n  const users = await notion.databases.query({\n    data_source_id: ''users-db-abc123''\n  })\n  \n  const projects = await notion.databases.query({\n    data_source_id: ''projects-db-def456''\n  })\n  \n  const tasks = await notion.databases.query({\n    data_source_id: ''tasks-db-ghi789''\n  })\n  \n  const total = users.results.length + \n                projects.results.length + \n                tasks.results.length\n  \n  console.log(`Fetched ${total} total items`)\n  return { users, projects, tasks }\n}\n\nfetchAllData()","hints":["Find all instances of ''database_id'' in the code","Use find-and-replace: search for ''database_id:'' and replace with ''data_source_id:''","Make sure all three database queries are updated consistently"],"expectedOutput":"Fetched 47 total items","order":2},{"id":3,"title":"Lesson 3/3: Create Page with Data Source","description":"Learn to create pages using the new data_source_id in the parent object. This is the other key change in the 2025-09-03 API version.","starterCode":"const { Client } = require(''@notionhq/client'')\nconst notion = new Client({ \n  auth: process.env.NOTION_API_KEY,\n  notionVersion: ''2025-09-03''\n})\n\nasync function createTask(title, status) {\n  // TODO: Update the parent object\n  // Change from: parent: { database_id: ''...'' }\n  // To: parent: { type: ''data_source_id'', data_source_id: ''...'' }\n  \n  const response = await notion.pages.create({\n    parent: {\n      database_id: ''tasks-db-xyz789''\n    },\n    properties: {\n      Title: {\n        title: [{ text: { content: title } }]\n      },\n      Status: {\n        select: { name: status }\n      }\n    }\n  })\n  \n  console.log(`Created task: ${title}`)\n  return response.id\n}\n\ncreateTask(''Migrate Notion API'', ''In Progress'')","solution":"const { Client } = require(''@notionhq/client'')\nconst notion = new Client({ \n  auth: process.env.NOTION_API_KEY,\n  notionVersion: ''2025-09-03''\n})\n\nasync function createTask(title, status) {\n  const response = await notion.pages.create({\n    parent: {\n      type: ''data_source_id'',\n      data_source_id: ''tasks-db-xyz789''\n    },\n    properties: {\n      Title: {\n        title: [{ text: { content: title } }]\n      },\n      Status: {\n        select: { name: status }\n      }\n    }\n  })\n  \n  console.log(`Created task: ${title}`)\n  return response.id\n}\n\ncreateTask(''Migrate Notion API'', ''In Progress'')","hints":["The parent object needs TWO changes: add ''type'' field and rename the ID field","New format: parent: { type: ''data_source_id'', data_source_id: ''...'' }","This unified parent format works for databases, pages, and blocks"],"expectedOutput":"Created task: Migrate Notion API","order":3}]',
  1,
  1,
  0,
  0,
  'intermediate',
  'notion-api, javascript, api-migration, data-sources',
  20,
  'Interactive guide to migrating your Notion API code for the breaking 2025-09-03 change. Learn to update from database_id to data_source_id through hands-on coding exercises.',
  'Master the Notion API 2025-09-03 migration from database_id to data_source_id',
  'The Notion API is changing on September 3, 2025. Learn how to migrate your existing code from database_id to data_source_id through 3 progressive hands-on lessons covering basic parameter changes, batch codebase updates, and the new unified data source architecture.',
  'Basic JavaScript, async/await, Notion API fundamentals',
  'Notion API 2025 Migration Guide: database_id to data_source_id',
  'Interactive coding tutorial for migrating Notion API integrations to version 2025-09-03. Learn the database_id to data_source_id migration through hands-on exercises.',
  'notion api, api migration, database_id, data_source_id, notion 2025, api versioning',
  '╔════════════════════════════════════════╗
║  NOTION API 2025-09-03 MIGRATION      ║
║  ────────────────────────────────────  ║
║  database_id → data_source_id          ║
║                                        ║
║  DIFFICULTY: Intermediate              ║
║  LESSONS: 3 | TIME: ~20 minutes        ║
║  DEADLINE: September 3, 2025           ║
╚════════════════════════════════════════╝',
  '2025-11-18T00:00:00.000Z',
  '2025-11-18T00:00:00.000Z',
  '2025-11-18T00:00:00.000Z'
);
