import type { AdminTemplateFillFormData } from './admin-template-fill.js';

/**
 * Execute-mode console scripts for https://webflow.com/admin/templates.
 *
 * Unlike the fill-only helpers in admin-template-fill.ts, these scripts DO
 * submit to the Webflow Admin API — but only when the reviewer pastes them
 * into the DevTools console of an authenticated Admin session and accepts the
 * confirm() dialog. The MCP server itself never calls the Admin API: it has no
 * Okta session, no CSRF token, and its egress IPs are not on the Admin
 * allowlist. Auth, IP, and the final click all stay with the human.
 *
 * Admin API contract notes (entrypoints/server, webflow/webflow):
 * - PUT /admin/api/templates/:templateid uses checkbox-form semantics: the
 *   booleans starter/archived/tutorial/standard are true only when the body
 *   contains the literal string 'on'. Omitting one silently flips it to false,
 *   so the update script fetches current state first and preserves untouched
 *   booleans.
 * - POST /admin/api/templates reuses an existing Template record for the same
 *   site when one exists, ignoring ext* fields in that path. The create script
 *   therefore chains a PUT after the POST so listed fields stick in both paths.
 * - Thumbnail upload is POST /admin/api/templates/:templateid/tall-thumbnail
 *   with multipart field name 'tallThumbnail' (7 MB limit).
 * - Mutations require the X-XSRF-Token header, read from <meta name="_csrf">.
 */

export const ADMIN_TEMPLATES_URL = 'https://webflow.com/admin/templates';

/** Fields PUT /admin/api/templates/:templateid treats as checkbox strings. */
export const ADMIN_CHECKBOX_FIELDS = ['starter', 'archived', 'tutorial', 'standard'] as const;
export type AdminCheckboxField = (typeof ADMIN_CHECKBOX_FIELDS)[number];

/** Non-checkbox fields the update script will read from and write back to Admin. */
export const ADMIN_PASSTHROUGH_FIELDS = [
  'name',
  'description',
  'extDetailPageUrl',
  'extCategory',
  'extMainTag',
  'type',
  'usedCount',
  'cost',
  'featured',
  'category',
  'features',
] as const;

export interface AdminTemplateUpdateChanges {
  name?: string;
  description?: string;
  extDetailPageUrl?: string;
  extCategory?: string;
  extMainTag?: string;
  type?: string;
  /** Price in cents (Admin stores cost in cents). */
  cost?: number;
  featured?: number;
  usedCount?: number;
  category?: string;
  features?: string[];
  starter?: boolean;
  archived?: boolean;
  tutorial?: boolean;
  standard?: boolean;
}

export interface AdminThumbnailSource {
  label: string;
  filename: string;
  /** Time-limited Airtable attachment URL (may be CORS-blocked from webflow.com). */
  direct_url?: string;
  /** Signed worker proxy URL; re-resolves the attachment fresh at fetch time. */
  proxy_url?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
}

export interface AdminExecuteBundle {
  schema_version: 'webflow_admin_template_execute.v0.1';
  action: 'create' | 'update' | 'upload_thumbnail';
  admin_url: string;
  execute_boundary: string[];
  warnings?: string[];
  console_script: string;
  bookmarklet?: string;
}

const SHARED_EXECUTE_BOUNDARY = [
  'This MCP tool performs no Webflow or Airtable writes; it only generates a script.',
  'The generated script DOES submit to the Webflow Admin API when the reviewer runs it and accepts the confirm() dialog.',
  `Run it only in the DevTools console on ${ADMIN_TEMPLATES_URL} while signed in to Webflow Admin.`,
  'The script aborts without writing when the CSRF token is missing or the confirmation is cancelled.',
];

function bookmarkletFromScript(script: string): string {
  return `javascript:${encodeURIComponent(script.replace(/\s+/g, ' ').trim())}`;
}

/**
 * Shared in-script helpers, embedded verbatim. Kept dependency-free and ES2017
 * so they run in any modern browser console.
 */
const SCRIPT_PRELUDE = `
  const csrf = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
  if (!csrf) {
    console.error('Template Review Admin execute helper: no CSRF token found. Run this in the DevTools console on ${ADMIN_TEMPLATES_URL} while signed in.');
    return;
  }
  const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-Token': csrf };
  const fetchImageBlob = async (sources) => {
    for (const source of sources) {
      if (!source) continue;
      try {
        const response = await fetch(source);
        if (response.ok) return await response.blob();
        console.warn('Image source responded ' + response.status + ':', source);
      } catch (error) {
        console.warn('Image source unreachable (possibly CORS):', source);
      }
    }
    return null;
  };
  const uploadTallThumbnail = async (templateId, image) => {
    const blob = await fetchImageBlob([image.direct_url, image.proxy_url]);
    if (!blob) {
      console.error('Could not fetch image bytes for ' + image.label + '. Re-run the prepare tool for fresh links.');
      return false;
    }
    if (blob.type && !blob.type.startsWith('image/')) {
      console.warn('Fetched bytes are ' + blob.type + ', expected an image. Continuing, but verify the result.');
    }
    const sizeKb = Math.round(blob.size / 1024);
    if (blob.size > 7 * 1024 * 1024) {
      console.error('Image is ' + sizeKb + ' KB, above the 7 MB Admin upload limit. Aborting the upload.');
      return false;
    }
    if (!confirm('Upload "' + image.filename + '" (' + sizeKb + ' KB) as the tall thumbnail for template ' + templateId + '?')) {
      console.warn('Thumbnail upload cancelled - nothing sent.');
      return false;
    }
    const formData = new FormData();
    formData.append('tallThumbnail', new File([blob], image.filename, { type: blob.type || 'image/png' }));
    const response = await fetch('/admin/api/templates/' + templateId + '/tall-thumbnail', {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-XSRF-Token': csrf },
      body: formData,
    });
    if (!response.ok) {
      console.error('Thumbnail upload failed with status ' + response.status, await response.text().catch(() => ''));
      return false;
    }
    console.log('Tall thumbnail uploaded for template ' + templateId + '.');
    return true;
  };
`;

export function buildAdminTemplateUpdateExecuteScript(
  templateId: string,
  changes: AdminTemplateUpdateChanges,
): string {
  const data = JSON.stringify({ templateId, changes }, null, 2);
  return `(async () => {
  const { templateId, changes } = ${data};
  const checkboxFields = ${JSON.stringify([...ADMIN_CHECKBOX_FIELDS])};
  const passthroughFields = ${JSON.stringify([...ADMIN_PASSTHROUGH_FIELDS])};
${SCRIPT_PRELUDE}
  const currentResponse = await fetch('/admin/api/templates/' + templateId, { headers: { Accept: 'application/json' } });
  if (!currentResponse.ok) {
    console.error('Failed to load template ' + templateId + ' (status ' + currentResponse.status + '). No changes sent.');
    return;
  }
  const current = (await currentResponse.json()).template;
  if (!current) {
    console.error('Template payload missing in Admin response. No changes sent.');
    return;
  }
  const payload = {};
  for (const field of passthroughFields) {
    if (current[field] !== undefined && current[field] !== null) payload[field] = current[field];
  }
  for (const field of checkboxFields) {
    if (current[field]) payload[field] = 'on';
  }
  const diff = [];
  for (const [field, nextValue] of Object.entries(changes)) {
    if (checkboxFields.includes(field)) {
      const before = payload[field] === 'on';
      if (before !== Boolean(nextValue)) diff.push({ field, before, after: Boolean(nextValue) });
      if (nextValue) payload[field] = 'on';
      else delete payload[field];
    } else {
      const before = payload[field];
      if (JSON.stringify(before) !== JSON.stringify(nextValue)) diff.push({ field, before, after: nextValue });
      payload[field] = nextValue;
    }
  }
  if (!diff.length) {
    console.warn('No effective changes for "' + current.name + '" (' + templateId + '). Nothing sent.');
    return;
  }
  console.table(diff);
  if (!confirm('Apply ' + diff.length + ' change(s) to "' + current.name + '" (' + templateId + ')? Booleans not listed above are preserved as-is.')) {
    console.warn('Update cancelled - no changes sent.');
    return;
  }
  const updateResponse = await fetch('/admin/api/templates/' + templateId, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  if (!updateResponse.ok) {
    console.error('Update failed with status ' + updateResponse.status, await updateResponse.text().catch(() => ''));
    return;
  }
  const updated = await updateResponse.json().catch(() => null);
  console.log('Template updated: ' + templateId, updated ? { name: updated.name } : '');
})();`;
}

export function buildAdminThumbnailUploadExecuteScript(
  templateId: string,
  image: AdminThumbnailSource,
): string {
  const data = JSON.stringify({ templateId, image }, null, 2);
  return `(async () => {
  const { templateId, image } = ${data};
${SCRIPT_PRELUDE}
  await uploadTallThumbnail(templateId, image);
})();`;
}

/** Expected Admin field values derived from Airtable, for the verify script. */
export interface AdminTemplateExpectedFields {
  name?: string;
  shortName?: string;
  description?: string;
  extDetailPageUrl?: string;
  extCategory?: string;
  extMainTag?: string;
  type?: string;
  /** Price in cents. */
  cost?: number;
}

/**
 * Read-only console script: GET the Admin template record and compare it
 * field-by-field against the Airtable-derived expected values. Prints a
 * match table and a verdict. Performs no writes and shows no confirm dialog.
 */
export function buildAdminTemplateVerifyScript(templateId: string, expected: AdminTemplateExpectedFields): string {
  const data = JSON.stringify({ templateId, expected }, null, 2);
  return `(async () => {
  const { templateId, expected } = ${data};
  const response = await fetch('/admin/api/templates/' + templateId, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    console.error('Failed to load template ' + templateId + ' (status ' + response.status + '). Are you signed in to Admin, and is the ID correct?');
    return;
  }
  const payload = await response.json();
  const current = payload.template || payload;
  if (!current || typeof current !== 'object') {
    console.error('Template payload missing in Admin response.', payload);
    return;
  }
  const normalize = (value) => (value === undefined || value === null ? '' : String(value).trim());
  const rows = Object.entries(expected).map(([field, expectedValue]) => {
    const actualValue = current[field];
    const match = normalize(actualValue) === normalize(expectedValue);
    return { field, expected: expectedValue, actual: actualValue, match: match ? 'OK' : 'MISMATCH' };
  });
  console.table(rows);
  const mismatches = rows.filter((row) => row.match !== 'OK');
  if (mismatches.length) {
    console.warn('Template Review Admin verify: ' + mismatches.length + ' of ' + rows.length + ' fields differ from Airtable. Use template_review_prepare_admin_template_update_execute to fix them.');
  } else {
    console.log('Template Review Admin verify: all ' + rows.length + ' checked fields match Airtable for "' + (current.name || templateId) + '".');
  }
  console.log('Reference state:', { _id: current._id, archived: current.archived, standard: current.standard, starter: current.starter, tutorial: current.tutorial, featured: current.featured, usedCount: current.usedCount });
  console.warn('Read-only script: it fetched Admin state and compared it. Nothing was written.');
})();`;
}

export interface AdminTemplateCreateExecuteInput {
  formData: AdminTemplateFillFormData;
  thumbnail?: AdminThumbnailSource;
}

export function buildAdminTemplateCreateExecuteScript(input: AdminTemplateCreateExecuteInput): string {
  const adminForm = input.formData.admin_form;
  const costCents = adminForm.cost === undefined ? undefined : Number(adminForm.cost);
  const createBody = {
    name: adminForm.name,
    shortName: adminForm.shortName,
    description: adminForm.description,
    extDetailPageUrl: adminForm.extDetailPageUrl,
    extCategory: adminForm.extCategory,
    extMainTag: adminForm.extMainTag,
    type: adminForm.type,
    cost: Number.isFinite(costCents) ? costCents : undefined,
  };
  const data = JSON.stringify({ createBody, thumbnail: input.thumbnail ?? null }, null, 2);
  return `(async () => {
  const { createBody, thumbnail } = ${data};
  const requiredFields = ['name', 'shortName', 'description', 'extDetailPageUrl', 'extCategory', 'extMainTag', 'type', 'cost'];
  const missing = requiredFields.filter((field) => createBody[field] === undefined || createBody[field] === null || createBody[field] === '');
  if (missing.length) {
    console.error('Create aborted - missing required fields:', missing);
    return;
  }
${SCRIPT_PRELUDE}
  console.table([createBody]);
  if (!confirm('Create marketplace template "' + createBody.name + '" for site "' + createBody.shortName + '" (cost ' + createBody.cost + ' cents)?')) {
    console.warn('Create cancelled - nothing sent.');
    return;
  }
  const createResponse = await fetch('/admin/api/templates', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(createBody),
  });
  if (!createResponse.ok) {
    console.error('Create failed with status ' + createResponse.status, await createResponse.text().catch(() => ''));
    return;
  }
  const created = await createResponse.json().catch(() => null);
  const templateId = created && created._id;
  if (!templateId) {
    console.error('Create response did not include a template _id. Check /admin/templates manually before retrying.', created);
    return;
  }
  console.log('Template created: ' + templateId + ' -> https://webflow.com/admin/templates/' + templateId);
  const followUp = {
    name: createBody.name,
    description: createBody.description,
    extDetailPageUrl: createBody.extDetailPageUrl,
    extCategory: createBody.extCategory,
    extMainTag: createBody.extMainTag,
    type: createBody.type,
    cost: createBody.cost,
  };
  if (created.usedCount !== undefined) followUp.usedCount = created.usedCount;
  if (created.featured !== undefined) followUp.featured = created.featured;
  for (const field of ${JSON.stringify([...ADMIN_CHECKBOX_FIELDS])}) {
    if (created[field]) followUp[field] = 'on';
  }
  const followUpResponse = await fetch('/admin/api/templates/' + templateId, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(followUp),
  });
  if (!followUpResponse.ok) {
    console.error('Follow-up field sync failed with status ' + followUpResponse.status + '. Verify ext fields on the Admin edit page.', await followUpResponse.text().catch(() => ''));
  } else {
    console.log('Template fields synced (create reuses existing records for a site, so this PUT makes ext fields deterministic).');
  }
  if (thumbnail) {
    await uploadTallThumbnail(templateId, thumbnail);
  } else {
    console.warn('No thumbnail source was bundled. Use template_review_prepare_admin_template_thumbnail_execute or upload manually.');
  }
  console.log('Next step: record Template ID ' + templateId + ' in the MRP ID override (template_review_update_asset_publishing) before approving the version.');
})();`;
}

export interface AdminExecuteBundleInput {
  action: AdminExecuteBundle['action'];
  consoleScript: string;
  extraBoundary?: string[];
  warnings?: string[];
  includeBookmarklet?: boolean;
}

export function buildAdminExecuteBundle(input: AdminExecuteBundleInput): AdminExecuteBundle {
  return {
    schema_version: 'webflow_admin_template_execute.v0.1',
    action: input.action,
    admin_url: ADMIN_TEMPLATES_URL,
    execute_boundary: [...SHARED_EXECUTE_BOUNDARY, ...(input.extraBoundary ?? [])],
    ...(input.warnings?.length ? { warnings: input.warnings } : {}),
    console_script: input.consoleScript,
    ...(input.includeBookmarklet ? { bookmarklet: bookmarkletFromScript(input.consoleScript) } : {}),
  };
}
