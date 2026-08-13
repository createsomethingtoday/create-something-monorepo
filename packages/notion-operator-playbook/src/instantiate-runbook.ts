import type {
  InstantiateRunbookInput,
  InstantiateRunbookResult,
  NotionRunbookClient
} from './contracts.js';
import { stableId } from './ids.js';

export async function instantiateRunbook(
  input: InstantiateRunbookInput,
  options: {
    notion?: NotionRunbookClient;
    writeEnabled?: boolean;
  } = {}
): Promise<InstantiateRunbookResult> {
  const receiptId = stableId('runbook', [
    input.playbookId,
    input.playbookVersion,
    input.runbookTitle,
    input.owner,
    ...input.steps
  ]);
  const base = {
    receiptId,
    pageId: null,
    runbookTitle: input.runbookTitle,
    stepCount: input.steps.length,
    dryRun: input.dryRun
  };

  if (!input.approved) {
    return {
      ...base,
      status: 'blocked',
      created: false,
      reason: 'Operator approval is required before instantiation.'
    };
  }
  if (!input.runbookTitle.trim() || !input.owner.trim() || input.steps.length === 0) {
    return {
      ...base,
      status: 'blocked',
      created: false,
      reason: 'Title, owner, and at least one step are required.'
    };
  }
  if (input.dryRun) {
    return {
      ...base,
      status: 'preview',
      created: false,
      reason: 'Dry run only; no Notion page was created.'
    };
  }
  if (!options.writeEnabled) {
    return {
      ...base,
      status: 'blocked',
      created: false,
      reason: 'NOTION_RUNBOOK_WRITE_ENABLED is not true.'
    };
  }
  if (!input.targetDataSourceId?.trim()) {
    return {
      ...base,
      status: 'blocked',
      created: false,
      reason: 'A disposable target data source ID is required for a live write.'
    };
  }
  if (!options.notion) {
    return {
      ...base,
      status: 'blocked',
      created: false,
      reason: 'An authenticated Notion client is required for a live write.'
    };
  }

  const existing = await options.notion.dataSources.query({
    data_source_id: input.targetDataSourceId,
    filter: { property: 'Receipt ID', rich_text: { equals: receiptId } },
    page_size: 1
  });
  const existingPage = existing.results[0];
  if (existingPage) {
    return {
      ...base,
      status: 'existing',
      created: false,
      reason: 'A runbook with this deterministic receipt already exists.',
      pageId: existingPage.id
    };
  }

  const page = await options.notion.pages.create({
    parent: {
      type: 'data_source_id',
      data_source_id: input.targetDataSourceId
    },
    properties: {
      Name: titleProperty(input.runbookTitle),
      'Playbook ID': richTextProperty(input.playbookId),
      Owner: richTextProperty(input.owner),
      Status: { status: { name: 'Ready' } },
      'Receipt ID': richTextProperty(receiptId)
    },
    children: input.steps.map((step, index) => ({
      object: 'block',
      type: 'to_do',
      to_do: {
        checked: false,
        rich_text: [
          {
            type: 'text',
            text: { content: `${index + 1}. ${step}` }
          }
        ]
      }
    }))
  });

  return {
    ...base,
    status: 'created',
    created: true,
    reason: null,
    pageId: page.id
  };
}

function titleProperty(value: string) {
  return {
    title: [{ type: 'text', text: { content: value } }]
  };
}

function richTextProperty(value: string) {
  return {
    rich_text: [{ type: 'text', text: { content: value } }]
  };
}
