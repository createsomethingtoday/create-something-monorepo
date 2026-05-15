import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from '../src/airtable.js';
import type { ReviewerProfile } from '../src/reviewer-directory.js';
import { METRICS_ASSET_FIELD_IDS, TABLE_IDS } from '../src/schema.js';
import { registerTools } from '../src/tools.js';

type ToolResult = { content: Array<{ text: string }>; isError?: boolean };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

function createServerHarness() {
  const names: string[] = [];
  const descriptions = new Map<string, string>();
  const handlers = new Map<string, ToolHandler>();

  const server = {
    tool(name: string, description: string, _schema: unknown, handler: ToolHandler) {
      names.push(name);
      descriptions.set(name, description);
      handlers.set(name, handler);
    }
  } as unknown as McpServer;

  return { server, names, descriptions, handlers };
}

function parsePayload(result: ToolResult) {
  return JSON.parse(result.content[0]?.text ?? '{}') as {
    ok: boolean;
    data?: Record<string, unknown>;
    error?: Record<string, unknown>;
  };
}

function mockFetchPages(pages: Record<string, { status: number; html: string }>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const page = pages[url.pathname] ?? {
      status: 404,
      html: '<html><head><title>Missing</title></head><body><h1>Missing</h1></body></html>'
    };
    return new Response(page.html, {
      status: page.status,
      headers: { 'Content-Type': 'text/html' }
    });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

const reviewer: ReviewerProfile = {
  accountId: 'acct_wf_eric',
  airtableCollaboratorId: 'usr_eric',
  email: 'eric.unger@webflow.com',
  name: 'Eric Unger',
  lane: 'wf-template-review-eric'
};

test('template_review_workflow does not mention removed analyzer or client-specific capture tools', async () => {
  const { server, descriptions, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  assert.doesNotMatch(
    descriptions.get('template_review_workflow') ?? '',
    /analyzer|webflow-site-analyzer|e2b/i
  );

  const result = await handlers.get('template_review_workflow')?.({});
  assert.ok(result);
  const text = result.content[0]?.text ?? '';
  assert.doesNotMatch(
    text,
    /webflow-site-analyzer-mcp|run_template_review|enqueue_template_review|template_review_enqueue_analyzer_review|e2b/i
  );
});

test('capture session tools start, continue, and draft from visible public evidence', async () => {
  const restoreFetch = mockFetchPages({
    '/': {
      status: 200,
      html: '<html><head><title>Omnera - Webflow HTML website template</title><meta property="og:image" content="https://cdn.example.com/thumb.jpg"><script src="/js/gsap.min.js"></script></head><body><h1>Omnera</h1><a href="#">Email</a><form><input name="Email"></form><img src="/hero.jpg"></body></html>'
    },
    '/style-guide': {
      status: 404,
      html: '<html><head><title>Missing</title></head><body>Missing</body></html>'
    },
    '/about': {
      status: 200,
      html: '<html><head><title>About - Omnera</title></head><body><h1>About</h1></body></html>'
    }
  });

  try {
    const { server, handlers } = createServerHarness();
    const client = {} as AirtableClient;

    registerTools(
      server,
      () => client,
      () => reviewer
    );

    const start = await handlers.get('template_review_start_capture_session')?.({
      published_url: 'https://omnera.example/',
      paths: ['/', '/style-guide']
    });
    assert.ok(start);
    const startPayload = parsePayload(start);
    assert.equal(startPayload.ok, true);
    assert.equal((startPayload.data?.summary as Record<string, unknown>).pages_checked_count, 2);
    assert.equal((startPayload.data?.summary as Record<string, unknown>).blocker_count, 1);
    assert.match(
      JSON.stringify(startPayload.data),
      /required_utility_page_unavailable_at_root_slug/
    );

    const captureState = startPayload.data?.capture_state;
    const continued = await handlers.get('template_review_continue_capture_session')?.({
      capture_state: captureState,
      paths: ['/about']
    });
    assert.ok(continued);
    const continuedPayload = parsePayload(continued);
    assert.equal(continuedPayload.ok, true);
    assert.equal(
      (continuedPayload.data?.summary as Record<string, unknown>).pages_checked_count,
      3
    );

    const draft = await handlers.get('template_review_draft_from_capture_session')?.({
      capture_state: continuedPayload.data?.capture_state
    });
    assert.ok(draft);
    const draftPayload = parsePayload(draft);
    assert.equal(draftPayload.ok, true);
    assert.match(
      String((draftPayload.data?.draft as Record<string, unknown>).draft_feedback_markdown),
      /Confirmed Summary/
    );
    assert.match(
      String((draftPayload.data?.draft as Record<string, unknown>).draft_feedback_markdown),
      /Designer-only checks/
    );
  } finally {
    restoreFetch();
  }
});

test('continue_capture_session rejects missing capture_state', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_continue_capture_session')?.({
    capture_state: { session_id: 'incomplete' }
  });
  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'INVALID_CAPTURE_STATE');
});

test('list_queue defaults to a compact paginated page', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<Record<string, unknown>> = [];
  const longFeedback = 'Long reviewer feedback. '.repeat(40);
  const client = {
    listAssetQueueDetailed: async (query: Record<string, unknown>) => {
      calls.push(query);
      return {
        sortApplied: 'submittedDate_desc',
        pagination: {
          limit: query.limit,
          returned: 1,
          hasMore: true,
          nextPageToken: 'next-token',
          source: 'asset_versions'
        },
        items: [
          {
            assetId: 'rec_asset_1',
            templateName: 'Finoraa',
            latestReviewFeedback: longFeedback,
            assignableVersionId: 'rec_version_1',
            normalizedStatus: 'ready_to_review',
            canAssign: true,
            canReview: false,
            canPublish: false
          }
        ]
      };
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_list_queue')?.({});
  assert.ok(result);

  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.equal(calls[0]?.limit, 10);
  assert.equal(calls[0]?.pageToken, undefined);
  assert.equal((payload.data?.pagination as Record<string, unknown>).nextPageToken, 'next-token');
  const item = (payload.data?.items as Array<Record<string, unknown>>)[0]!;
  assert.equal(item.templateName, 'Finoraa');
  assert.equal(item.latestReviewFeedback, undefined);
  assert.match(String(item.latestReviewFeedbackPreview), /^Long reviewer feedback/);
  assert.ok(String(item.latestReviewFeedbackPreview).length < longFeedback.length);
});

test('my_queue passes pagination token through to Airtable client', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<Record<string, unknown>> = [];
  const client = {
    listMyQueueDetailed: async (query: Record<string, unknown>) => {
      calls.push(query);
      return {
        sortApplied: 'submittedDate_desc',
        pagination: {
          limit: query.limit,
          returned: 0,
          hasMore: false,
          source: 'asset_versions'
        },
        items: []
      };
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_my_queue')?.({
    limit: 5,
    page_token: 'next-token'
  });

  assert.ok(result);
  assert.equal(parsePayload(result).ok, true);
  assert.equal(calls[0]?.limit, 5);
  assert.equal(calls[0]?.pageToken, 'next-token');
});

test('registerTools places reviewer-safe write tools before admin and broad mutation routes', () => {
  const { server, names } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  assert.notEqual(names.indexOf('template_review_assign_self'), -1);
  assert.notEqual(names.indexOf('template_review_request_changes'), -1);
  assert.notEqual(names.indexOf('template_review_set_review_status'), -1);
  assert.notEqual(names.indexOf('template_review_save_draft_feedback'), -1);
  assert.ok(
    names.indexOf('template_review_assign_self') < names.indexOf('template_review_assign_reviewer')
  );
  assert.ok(
    names.indexOf('template_review_request_changes') <
      names.indexOf('template_review_complete_publishing')
  );
  assert.ok(
    names.indexOf('template_review_set_review_status') <
      names.indexOf('template_review_update_version_review')
  );
  assert.ok(
    names.indexOf('template_review_save_draft_feedback') <
      names.indexOf('template_review_approve_version')
  );
});

test('assign_self routes through reviewer-safe self-assignment', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ versionId: string; reviewer: Record<string, unknown> | null }> = [];
  const client = {
    assignSelfToVersion: async (
      versionId: string,
      actingReviewer: Record<string, unknown> | null
    ) => {
      calls.push({ versionId, reviewer: actingReviewer });
      return { versionId, reviewOwner: actingReviewer };
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_assign_self')?.({
    version_id: 'rec_version_1'
  });

  assert.ok(result);
  assert.deepEqual(calls, [
    {
      versionId: 'rec_version_1',
      reviewer: {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger'
      }
    }
  ]);
  assert.equal(parsePayload(result).ok, true);
});

test('request_changes requires reviewer ownership before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewStatus: '📤Changes Requested' };
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_request_changes')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Please tighten the responsive layout.',
    improvement_areas: ['Template: Typography']
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger'
      }
    ]
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_status: '📤Changes Requested',
        review_feedback: 'Please tighten the responsive layout.',
        improvement_areas: ['Template: Typography']
      }
    ]
  });
  assert.equal(parsePayload(result).ok, true);
});

test('approve_version requires reviewer ownership before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewStatus: '✅Approved' };
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_approve_version')?.({
    version_id: 'rec_version_1',
    release_record_id: 'rec_release_1'
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger'
      }
    ]
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_status: '✅Approved',
        release_record_id: 'rec_release_1',
        publishing_checklist: undefined
      }
    ]
  });
  assert.equal(parsePayload(result).ok, true);
});

test('complete_publishing requires reviewer ownership before workflow mutation', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    completePublishing: async (...args: unknown[]) => {
      calls.push({ method: 'completePublishing', args });
      return {
        updatedVersion: { versionId: 'rec_version_1' },
        updatedAsset: { assetId: 'rec_asset_1' },
        resolvedRelease: { releaseId: 'rec_release_1' },
        resolvedLocalDate: '2026-03-18'
      };
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_complete_publishing')?.({
    version_id: 'rec_version_1',
    release_record_id: 'rec_release_1',
    approve_version: true
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger'
      }
    ]
  });
  assert.deepEqual(calls[1], {
    method: 'completePublishing',
    args: [
      'rec_version_1',
      {
        release_record_id: 'rec_release_1',
        release_date_local: undefined,
        time_zone: undefined,
        approve_version: true,
        mrp_id_overwrite: undefined
      }
    ]
  });
  assert.equal(parsePayload(result).ok, true);
});

test('update_version_review rejects reviewer-scoped owner changes before mutation', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    requireAssignedVersion: async () => {
      throw new Error('should not run');
    },
    updateVersionReview: async () => {
      throw new Error('should not run');
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_update_version_review')?.({
    version_id: 'rec_version_1',
    review_owner: { id: 'usr_other' },
    review_feedback: 'Draft feedback'
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'REVIEWER_WRITE_SCOPE_VIOLATION');
});

test('save_draft_feedback writes validated improvement areas through to the client', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewFeedback: 'Draft feedback' };
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Draft feedback',
    improvement_areas: ['Template: Accessibility']
  });

  assert.ok(result);
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_feedback: 'Draft feedback',
        improvement_areas: ['Template: Accessibility']
      }
    ]
  });
  assert.equal(parsePayload(result).ok, true);
});

test('save_draft_feedback rejects empty payloads before any mutation runs', async () => {
  const { server, handlers } = createServerHarness();
  const client = {
    requireAssignedVersion: async () => {
      throw new Error('should not run');
    },
    updateVersionReview: async () => {
      throw new Error('should not run');
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1'
  });

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, false);
  assert.equal(payload.error?.code, 'NO_MUTATION_FIELDS');
});

test('save_draft_feedback writes review feedback without mutating improvement areas', async () => {
  const { server, handlers } = createServerHarness();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    requireAssignedVersion: async (...args: unknown[]) => {
      calls.push({ method: 'requireAssignedVersion', args });
      return { versionId: 'rec_version_1' };
    },
    updateVersionReview: async (...args: unknown[]) => {
      calls.push({ method: 'updateVersionReview', args });
      return { versionId: 'rec_version_1', reviewFeedback: 'Draft feedback' };
    }
  } as unknown as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_save_draft_feedback')?.({
    version_id: 'rec_version_1',
    review_feedback: 'Draft feedback'
  });

  assert.ok(result);
  assert.deepEqual(calls[0], {
    method: 'requireAssignedVersion',
    args: [
      'rec_version_1',
      {
        id: 'usr_eric',
        email: 'eric.unger@webflow.com',
        name: 'Eric Unger'
      }
    ]
  });
  assert.deepEqual(calls[1], {
    method: 'updateVersionReview',
    args: [
      'rec_version_1',
      {
        review_owner: { id: 'usr_eric' },
        review_feedback: 'Draft feedback',
        improvement_areas: undefined
      }
    ]
  });
  assert.equal(parsePayload(result).ok, true);
});

test('get_field_map exposes stable table ids and metrics field ids', async () => {
  const { server, handlers } = createServerHarness();
  const client = {} as AirtableClient;

  registerTools(
    server,
    () => client,
    () => reviewer
  );

  const result = await handlers.get('template_review_get_field_map')?.({});

  assert.ok(result);
  const payload = parsePayload(result);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.data?.tables, TABLE_IDS);
  assert.deepEqual(payload.data?.metricsFieldIds, {
    assets: METRICS_ASSET_FIELD_IDS
  });
});
