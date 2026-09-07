import {
  appendBlockChildren,
  createPage,
  deleteBlock,
  findDataSourceIdByTitle,
  findUserIdByEmail,
  getFirstDataSourceIdForDatabase,
  listAllBlockChildren,
  queryAllPages,
  retrieveDataSourceSchema,
  retrievePage,
  updatePage,
  uploadFileToNotion,
} from './notion.js';
import {
  DEFAULT_HD_STATUS,
  FILE_UPLOAD_TARGET_WORKSPACE,
  TARGET_EXT_PAGE_ID_PROPERTIES,
} from './constants.js';
import { resolveRuntimeConfig, toolName } from './config.js';
import { effectiveSourceStatusMap, mapHdStatusToOsStatus } from './status-policy.js';
import type { AuditResult, DataSourceSchema, Env, NotionBlock, NotionPage, SyncConfig, SyncFile, SyncResult, Workspace } from './types.js';

type WritableValue = string | Array<Record<string, unknown>>;
type SourceToHdRepairField =
  | 'Ticket'
  | 'Source'
  | 'Owner'
  | 'Client'
  | 'External Page ID'
  | 'External URL'
  | 'External Files & Media'
  | 'page body';

type SourceToHdOptions = {
  sourcePageIds?: string[];
  repairFields?: SourceToHdRepairField[];
  createMissing?: boolean;
};

type AttachmentFallback = {
  name: string;
  reason: 'notion_file_size_limit';
  source_page_id: string;
};

const ATTACHMENT_FALLBACK_PREFIX = 'Attachment sync exception [source ';
const ATTACHMENT_FALLBACK_REASON = ' exceeds the Half Dozen Notion file-size limit and was not copied. ';

export async function preflight(env: Env): Promise<SyncResult> {
  const result = emptyResult('preflight');
  try {
    const config = await resolveSyncConfig(env);
    const sourceMissing = missingProperties(config.sourceSchema, [
      'Ticket',
      'Details',
      'Created By',
      'Page ID',
      'URL',
      'Files & Media',
      config.sourceStatusProperty,
    ]);
    const targetMissing = missingProperties(config.targetSchema, [
      'Ticket',
      'Status',
      'Source',
      'Owner',
      'External URL',
      'External Files & Media',
    ]);
    if (!targetExtPageIdProperty(config.targetSchema)) targetMissing.push('External Page ID or Ext Page ID');

    for (const field of sourceMissing) result.errors.push({ scope: 'source_schema', message: `Missing source property: ${field}` });
    for (const field of targetMissing) result.errors.push({ scope: 'target_schema', message: `Missing target property: ${field}` });
    const sourceStatusOptions = propertyOptionNames(config.sourceSchema[config.sourceStatusProperty]);
    if (sourceStatusOptions.length > 0) {
      for (const hdStatus of Object.keys(config.sourceStatusMap)) {
        const mappedStatus = mapHdStatusToOsStatus(hdStatus, config.sourceStatusMap);
        if (mappedStatus && !sourceStatusOptions.includes(mappedStatus)) {
          result.errors.push({
            scope: 'source_schema',
            message: `Mapped source status option does not exist: ${hdStatus} -> ${mappedStatus}`,
          });
        }
      }
    }

    result.ok = result.errors.length === 0;
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;
    result.details = {
      source_status_property: config.sourceStatusProperty,
      source_status_map: effectiveSourceStatusMap(config.sourceStatusMap),
      source_status_options: sourceStatusOptions,
      target_ext_page_id_property: config.targetExtPageIdProperty,
      target_client_property_present: Boolean(config.targetSchema.Client),
      source_properties: Object.keys(config.sourceSchema).sort(),
      target_properties: Object.keys(config.targetSchema).sort(),
    };
    return result;
  } catch (error) {
    result.errors.push({ scope: 'preflight', message: errorMessage(error) });
    return result;
  }
}

export async function auditSync(env: Env): Promise<AuditResult> {
  const result: AuditResult = {
    ...emptyResult('audit'),
    action: 'audit',
    details: {
      source_rows_checked: 0,
      target_rows_checked: 0,
      matched_rows: 0,
      missing_hd_rows: [],
      duplicate_hd_matches: [],
      contract_field_drifts: [],
      body_drifts: [],
      reverse_status_drifts: [],
    },
  };

  try {
    const config = await resolveSyncConfig(env);
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;
    const [sourcePages, targetPages] = await Promise.all([
      queryAllPages(env, 'client', config.sourceDataSourceId),
      queryAllPages(env, 'halfdozen', config.targetDataSourceId),
    ]);
    result.details.source_rows_checked = sourcePages.length;
    result.details.target_rows_checked = targetPages.length;

    const targetsByExtPageId = groupTargetsByExtPageId(targetPages, config.targetExtPageIdProperty);
    const sourceByExtPageId = new Map<string, NotionPage>();
    for (const sourcePage of sourcePages) {
      const extPageId = readText(sourcePage, 'Page ID');
      if (extPageId) sourceByExtPageId.set(extPageId, sourcePage);
    }

    for (const [extPageId, pages] of targetsByExtPageId) {
      if (pages.length > 1) {
        result.details.duplicate_hd_matches.push({ ext_page_id: extPageId, target_page_ids: pages.map((page) => page.id) });
      }
    }

    const ownerUserId = await findUserIdByEmail(env, 'halfdozen', config.ownerEmail);
    for (const sourcePage of sourcePages) {
      const extPageId = readText(sourcePage, 'Page ID');
      if (!extPageId) continue;
      const targetMatches = targetsByExtPageId.get(extPageId) ?? [];
      if (targetMatches.length === 0) {
        result.details.missing_hd_rows.push({
          source_page_id: sourcePage.id,
          ext_page_id: extPageId,
          ticket: readText(sourcePage, 'Ticket'),
        });
        continue;
      }
      result.details.matched_rows += 1;
      const targetPage = targetMatches[0];
      const targetBlocks = await listAllBlockChildren(env, 'halfdozen', targetPage.id);
      const attachmentFallbacks = attachmentFallbacksFromTargetBlocks(targetBlocks, sourcePage);
      const patch = await buildExistingTargetPatch(env, config, sourcePage, targetPage, ownerUserId, {
        materializeFileUploads: false,
        skipAttachmentNames: new Set(attachmentFallbacks.map((fallback) => fallback.name)),
      });
      if (Object.keys(patch).length > 0) {
        result.details.contract_field_drifts.push({
          target_page_id: targetPage.id,
          ext_page_id: extPageId,
          fields: Object.keys(patch),
        });
      }
      if (await targetPageBodyDiffers(env, sourcePage, targetPage.id, attachmentFallbacks, targetBlocks)) {
        result.details.body_drifts.push({ target_page_id: targetPage.id, ext_page_id: extPageId });
      }
    }

    for (const targetPage of targetPages) {
      const extPageId = readText(targetPage, config.targetExtPageIdProperty);
      if (!extPageId) continue;
      const mappedStatus = mapHdStatusToOsStatus(readText(targetPage, 'Status'), config.sourceStatusMap);
      if (!mappedStatus) continue;
      const sourcePage = sourceByExtPageId.get(extPageId);
      if (!sourcePage) continue;
      const sourceStatus = readText(sourcePage, config.sourceStatusProperty);
      if (sourceStatus !== mappedStatus) {
        result.details.reverse_status_drifts.push({
          target_page_id: targetPage.id,
          source_page_id: sourcePage.id,
          ext_page_id: extPageId,
          hd_status: readText(targetPage, 'Status'),
          source_status: sourceStatus,
          mapped_status: mappedStatus,
        });
      }
    }

    result.ok = true;
    result.skipped = result.details.missing_hd_rows.length
      + result.details.duplicate_hd_matches.length
      + result.details.contract_field_drifts.length
      + result.details.body_drifts.length
      + result.details.reverse_status_drifts.length;
    return result;
  } catch (error) {
    result.errors.push({ scope: 'audit', message: errorMessage(error) });
    return result;
  }
}

export async function planSourceToHalfDozenRepairs(env: Env): Promise<SyncResult> {
  const audit = await auditSync(env);
  const details = audit.details;
  const externalUrlDrifts = details.contract_field_drifts.filter((drift) => drift.fields.includes('External URL'));
  const externalFilesDrifts = details.contract_field_drifts.filter((drift) => drift.fields.includes('External Files & Media'));
  const otherContractDrifts = details.contract_field_drifts.filter((drift) => (
    drift.fields.some((field) => field !== 'External URL' && field !== 'External Files & Media')
  ));

  return {
    ok: audit.ok,
    action: 'source_to_hd_repair_plan',
    source_data_source_id: audit.source_data_source_id,
    target_data_source_id: audit.target_data_source_id,
    created: 0,
    updated: 0,
    skipped: audit.skipped,
    errors: audit.errors,
    details: {
      source_rows_checked: details.source_rows_checked,
      target_rows_checked: details.target_rows_checked,
      matched_rows: details.matched_rows,
      missing_hd_rows: details.missing_hd_rows,
      duplicate_hd_matches: details.duplicate_hd_matches,
      repairable_missing_hd_rows: details.missing_hd_rows.length,
      repairable_external_url_drifts: externalUrlDrifts.length,
      repairable_external_files_drifts: externalFilesDrifts.length,
      other_contract_drifts: otherContractDrifts,
      body_drifts: details.body_drifts,
      reverse_status_drifts: details.reverse_status_drifts,
      recommended_write_tools: [
        ...(details.missing_hd_rows.length > 0 ? [toolName(env, 'repair_missing_hd_rows')] : []),
        ...(externalUrlDrifts.length > 0 ? [toolName(env, 'repair_external_url_drift')] : []),
        ...(otherContractDrifts.length > 0 || details.body_drifts.length > 0 ? [toolName(env, 'source_to_hd')] : []),
        ...(details.reverse_status_drifts.length > 0 ? [toolName(env, 'hd_status_to_source')] : []),
      ],
      future_scale_note: 'Use Notion webhooks or a persisted sync index before this becomes a frequent full-scan workflow.',
    },
  };
}

export async function repairMissingHalfDozenRows(env: Env): Promise<SyncResult> {
  const audit = await auditSync(env);
  const sourcePageIds = audit.details.missing_hd_rows.map((row) => row.source_page_id);
  if (sourcePageIds.length === 0) {
    return {
      ok: audit.ok,
      action: 'repair_missing_hd_rows',
      source_data_source_id: audit.source_data_source_id,
      target_data_source_id: audit.target_data_source_id,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: audit.errors,
      details: {
        repair_scope: 'missing_hd_rows',
        source_rows_checked: audit.details.source_rows_checked,
        target_rows_checked: audit.details.target_rows_checked,
        selected_source_page_ids: [],
      },
    };
  }

  const repaired = await syncSourceTicketsToHalfDozen(env, { sourcePageIds, createMissing: true });
  return {
    ...repaired,
    action: 'repair_missing_hd_rows',
    details: {
      ...(repaired.details ?? {}),
      repair_scope: 'missing_hd_rows',
      selected_source_page_ids: sourcePageIds,
      audit_before_repair: {
        missing_hd_rows: audit.details.missing_hd_rows,
        duplicate_hd_matches: audit.details.duplicate_hd_matches,
      },
    },
  };
}

export async function repairExternalUrlDrift(env: Env): Promise<SyncResult> {
  const audit = await auditSync(env);
  const extPageIds = audit.details.contract_field_drifts
    .filter((drift) => drift.fields.includes('External URL'))
    .map((drift) => drift.ext_page_id);

  if (extPageIds.length === 0) {
    return {
      ok: audit.ok,
      action: 'repair_external_url_drift',
      source_data_source_id: audit.source_data_source_id,
      target_data_source_id: audit.target_data_source_id,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: audit.errors,
      details: {
        repair_scope: 'external_url_drift',
        source_rows_checked: audit.details.source_rows_checked,
        target_rows_checked: audit.details.target_rows_checked,
        selected_ext_page_ids: [],
      },
    };
  }

  const repaired = await syncSourceTicketsToHalfDozen(env, {
    sourcePageIds: extPageIds,
    repairFields: ['External URL'],
    createMissing: false,
  });
  return {
    ...repaired,
    action: 'repair_external_url_drift',
    details: {
      ...(repaired.details ?? {}),
      repair_scope: 'external_url_drift',
      selected_ext_page_ids: extPageIds,
      audit_before_repair: {
        contract_field_drifts: audit.details.contract_field_drifts.filter((drift) => drift.fields.includes('External URL')),
      },
    },
  };
}

export async function syncSourceTicketsToHalfDozen(
  env: Env,
  options: SourceToHdOptions = {},
): Promise<SyncResult> {
  const result = emptyResult('source_to_hd');
  let externalReferenceUpdates = 0;
  let titleRepairs = 0;
  let propertyRepairs = 0;
  let bodyRepairs = 0;
  const attachmentFallbacks: AttachmentFallback[] = [];
  try {
    const config = await resolveSyncConfig(env);
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;

    const [sourcePages, targetPages] = await Promise.all([
      resolveSourcePages(env, config.sourceDataSourceId, options.sourcePageIds),
      queryAllPages(env, 'halfdozen', config.targetDataSourceId),
    ]);
    const targetByExtPageId = new Map<string, NotionPage>();
    for (const page of targetPages) {
      const extPageId = readText(page, config.targetExtPageIdProperty);
      if (extPageId && !targetByExtPageId.has(extPageId)) targetByExtPageId.set(extPageId, page);
    }

    const ownerUserId = await findUserIdByEmail(env, 'halfdozen', config.ownerEmail);
    for (const sourcePage of sourcePages) {
      try {
        const sourceAttachmentFallbacks: AttachmentFallback[] = [];
        if (!isPageInDataSource(sourcePage, config.sourceDataSourceId)) {
          result.skipped += 1;
          continue;
        }

        const extPageId = readText(sourcePage, 'Page ID');
        if (!extPageId) {
          result.errors.push({ scope: 'source_page', message: 'Source ticket is missing Page ID.', page_id: sourcePage.id });
          continue;
        }

        const existingTargetPage = targetByExtPageId.get(extPageId);
        if (existingTargetPage) {
          const existingTargetBlocks = await listAllBlockChildren(env, 'halfdozen', existingTargetPage.id);
          const knownAttachmentFallbacks = attachmentFallbacksFromTargetBlocks(existingTargetBlocks, sourcePage);
          const externalPatch = filterTargetPatch(
            await buildExistingTargetPatch(env, config, sourcePage, existingTargetPage, ownerUserId, {
              attachmentFallbacks: sourceAttachmentFallbacks,
              skipAttachmentNames: new Set(knownAttachmentFallbacks.map((fallback) => fallback.name)),
            }),
            config,
            options.repairFields,
          );
          if (Object.keys(externalPatch).length > 0) {
            await updatePage(env, 'halfdozen', existingTargetPage.id, externalPatch);
            result.updated += 1;
            if (externalPatch.Ticket) titleRepairs += 1;
            propertyRepairs += Object.keys(externalPatch).filter((propertyName) => propertyName !== 'Ticket').length;
            if (externalPatch['External URL'] || externalPatch['External Files & Media']) externalReferenceUpdates += 1;
          }
          const bodyAttachmentFallbacks = uniqueAttachmentFallbacks([
            ...knownAttachmentFallbacks,
            ...sourceAttachmentFallbacks,
          ]);
          const bodyUpdated = shouldRepairField(options.repairFields, 'page body')
            ? await syncTargetPageBody(env, sourcePage, existingTargetPage.id, bodyAttachmentFallbacks, existingTargetBlocks)
            : false;
          if (bodyUpdated) bodyRepairs += 1;
          if (Object.keys(externalPatch).length > 0 || bodyUpdated) {
            result.updated += bodyUpdated && Object.keys(externalPatch).length === 0 ? 1 : 0;
          } else {
            result.skipped += 1;
          }
          attachmentFallbacks.push(...bodyAttachmentFallbacks);
          continue;
        }

        if (options.createMissing === false) {
          result.skipped += 1;
          continue;
        }

        const latestSourcePage = await retrievePage(env, 'client', sourcePage.id);
        const properties = await buildTargetCreateProperties(env, config, latestSourcePage, ownerUserId, sourceAttachmentFallbacks);
        const children = await buildTicketBody(env, latestSourcePage, sourceAttachmentFallbacks);
        const created = await createPage(env, config.targetDataSourceId, properties, children);

        const confirmationPatch = await buildExistingTargetPatch(env, config, latestSourcePage, created, ownerUserId, {
          attachmentFallbacks: sourceAttachmentFallbacks,
          skipAttachmentNames: new Set(sourceAttachmentFallbacks.map((fallback) => fallback.name)),
        });
        if (Object.keys(confirmationPatch).length > 0) {
          await updatePage(env, 'halfdozen', created.id, confirmationPatch);
          if (confirmationPatch.Ticket) titleRepairs += 1;
          propertyRepairs += Object.keys(confirmationPatch).filter((propertyName) => propertyName !== 'Ticket').length;
          if (confirmationPatch['External URL'] || confirmationPatch['External Files & Media']) externalReferenceUpdates += 1;
        }

        result.created += 1;
        targetByExtPageId.set(extPageId, created);
        attachmentFallbacks.push(...uniqueAttachmentFallbacks(sourceAttachmentFallbacks));
        continue;
      } catch (error) {
        result.errors.push({
          scope: 'source_to_hd_page',
          message: errorMessage(error),
          page_id: sourcePage.id,
          ext_page_id: readText(sourcePage, 'Page ID') || undefined,
        });
        continue;
      }
    }

    result.ok = result.errors.length === 0;
    result.details = {
      source_rows_checked: sourcePages.length,
      target_rows_checked: targetPages.length,
      external_reference_updates: externalReferenceUpdates,
      title_repairs: titleRepairs,
      property_repairs: propertyRepairs,
      body_repairs: bodyRepairs,
      attachment_fallbacks: uniqueAttachmentFallbacks(attachmentFallbacks),
    };
    return result;
  } catch (error) {
    result.errors.push({ scope: 'source_to_hd', message: errorMessage(error) });
    return result;
  }
}

export async function syncHalfDozenStatusToSource(
  env: Env,
  options: { targetPageIds?: string[] } = {},
): Promise<SyncResult> {
  const result = emptyResult('hd_status_to_source');
  try {
    const config = await resolveSyncConfig(env);
    result.source_data_source_id = config.sourceDataSourceId;
    result.target_data_source_id = config.targetDataSourceId;

    const sourcePages = await queryAllPages(env, 'client', config.sourceDataSourceId);
    const targetPages = await resolveTargetPages(
      env,
      config.targetDataSourceId,
      config.targetExtPageIdProperty,
      options.targetPageIds,
      sourcePages,
    );
    const sourceByExtPageId = new Map<string, NotionPage>();
    for (const page of sourcePages) {
      const pageId = readText(page, 'Page ID');
      if (pageId) sourceByExtPageId.set(pageId, page);
    }

    for (const targetPage of targetPages) {
      try {
        if (!isPageInDataSource(targetPage, config.targetDataSourceId)) {
          result.skipped += 1;
          continue;
        }

        const extPageId = readText(targetPage, config.targetExtPageIdProperty);
        if (!extPageId) {
          result.skipped += 1;
          continue;
        }
        const hdStatus = readText(targetPage, 'Status');
        const mappedStatus = mapHdStatusToOsStatus(hdStatus, config.sourceStatusMap);
        if (!mappedStatus) {
          result.skipped += 1;
          continue;
        }
        const sourcePage = sourceByExtPageId.get(extPageId);
        if (!sourcePage) {
          result.skipped += 1;
          continue;
        }
        const currentStatus = readText(sourcePage, config.sourceStatusProperty);
        if (currentStatus === mappedStatus) {
          result.skipped += 1;
          continue;
        }

        await updatePage(env, 'client', sourcePage.id, {
          [config.sourceStatusProperty]: writableValue(
            config.sourceSchema[config.sourceStatusProperty]?.type ?? 'status',
            mappedStatus,
          ),
        });
        result.updated += 1;
      } catch (error) {
        result.errors.push({
          scope: 'status_update',
          message: errorMessage(error),
          page_id: targetPage.id,
          ext_page_id: readText(targetPage, config.targetExtPageIdProperty) || undefined,
        });
      }
    }

    result.ok = result.errors.length === 0;
    result.details = {
      target_rows_checked: targetPages.length,
      source_rows_checked: sourcePages.length,
      source_status_property: config.sourceStatusProperty,
      source_status_map: effectiveSourceStatusMap(config.sourceStatusMap),
    };
    return result;
  } catch (error) {
    result.errors.push({ scope: 'hd_status_to_source', message: errorMessage(error) });
    return result;
  }
}

export async function fullReconcile(env: Env): Promise<SyncResult> {
  const forward = await syncSourceTicketsToHalfDozen(env);
  const reverse = await syncHalfDozenStatusToSource(env);

  return {
    ok: forward.ok && reverse.ok,
    action: 'full_reconcile',
    source_data_source_id: reverse.source_data_source_id ?? forward.source_data_source_id,
    target_data_source_id: reverse.target_data_source_id ?? forward.target_data_source_id,
    created: forward.created,
    updated: forward.updated + reverse.updated,
    skipped: forward.skipped + reverse.skipped,
    errors: [...forward.errors, ...reverse.errors],
    details: { forward, reverse },
  };
}

export { mapHdStatusToOsStatus } from './status-policy.js';

export function buildTicketTitle(ticket: string, clientDisplayName = 'BLONDISH'): string {
  return ticket.trim() || `${clientDisplayName} support ticket`;
}

export async function buildTicketDetailsText(env: Env, sourcePage: NotionPage): Promise<string> {
  const details = readText(sourcePage, 'Details');
  if (details) return details;
  const bodyText = await readSourcePageBodyText(env, sourcePage.id);
  return bodyText || 'No details provided.';
}

export function readText(page: NotionPage, propertyName: string): string {
  const property = page.properties?.[propertyName];
  if (!property) return '';
  switch (property.type) {
    case 'title':
      return richTextToPlain(property.title);
    case 'rich_text':
      return richTextToPlain(property.rich_text);
    case 'url':
      return typeof property.url === 'string' ? property.url : '';
    case 'status':
      return optionName(property.status);
    case 'select':
      return optionName(property.select);
    case 'multi_select':
      return Array.isArray(property.multi_select) ? property.multi_select.map(optionName).filter(Boolean).join(', ') : '';
    case 'unique_id': {
      const unique = isRecord(property.unique_id) ? property.unique_id : {};
      const number = typeof unique.number === 'number' ? String(unique.number) : '';
      const prefix = typeof unique.prefix === 'string' ? unique.prefix : '';
      if (!number) return '';
      return prefix ? `${prefix}-${number}` : number;
    }
    case 'created_by':
    case 'people': {
      const user = property.type === 'created_by' ? property.created_by : Array.isArray(property.people) ? property.people[0] : null;
      return userLabel(user);
    }
    case 'files':
      return Array.isArray(property.files) ? property.files.map((file) => readString(file, 'name')).filter(Boolean).join(', ') : '';
    default:
      return '';
  }
}

export function targetExtPageIdProperty(targetSchema: DataSourceSchema): string | null {
  return TARGET_EXT_PAGE_ID_PROPERTIES.find((propertyName) => Boolean(targetSchema[propertyName])) ?? null;
}

export function normalizeFileUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    const keysToDelete: string[] = [];
    url.searchParams.forEach((_paramValue, key) => {
      if (/^(x-amz-|x-id$|expires$|signature$|token$)/i.test(key)) keysToDelete.push(key);
    });
    for (const key of keysToDelete) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return value;
  }
}

async function resolveSyncConfig(env: Env): Promise<SyncConfig> {
  const runtime = resolveRuntimeConfig(env);
  const sourceDataSourceId =
    runtime.sourceDataSourceId ||
    await findDataSourceIdByTitle(env, 'client', runtime.sourceDataSourceTitle);

  if (!sourceDataSourceId) {
    throw new Error(`Could not find ${runtime.clientDisplayName} source data source "${runtime.sourceDataSourceTitle}". Set CLIENT_SUPPORT_TICKETS_DATA_SOURCE_ID or share the data source with the runtime token.`);
  }

  const targetDataSourceId =
    runtime.targetDataSourceId ||
    await getFirstDataSourceIdForDatabase(env, 'halfdozen', runtime.targetDatabaseId) ||
    await findDataSourceIdByTitle(env, 'halfdozen', runtime.targetDataSourceTitle);

  if (!targetDataSourceId) {
    throw new Error(`Could not find Half Dozen target data source "${runtime.targetDataSourceTitle}". Set HALFDOZEN_TICKETS_DATA_SOURCE_ID or share the database with the runtime token.`);
  }

  const [sourceSchema, targetSchema] = await Promise.all([
    retrieveDataSourceSchema(env, 'client', sourceDataSourceId),
    retrieveDataSourceSchema(env, 'halfdozen', targetDataSourceId),
  ]);
  const configuredStatus = runtime.sourceStatusProperty;
  const sourceStatusProperty = configuredStatus && sourceSchema[configuredStatus]
    ? configuredStatus
    : sourceSchema['OS Status']
      ? 'OS Status'
      : 'Status';
  const targetExtPageId = targetExtPageIdProperty(targetSchema);
  if (!targetExtPageId) {
    throw new Error('Target property "External Page ID" or "Ext Page ID" is missing.');
  }

  return {
    sourceDataSourceId,
    targetDataSourceId,
    sourceSchema,
    targetSchema,
    sourceStatusProperty,
    sourceStatusMap: runtime.sourceStatusMap,
    targetExtPageIdProperty: targetExtPageId,
    clientDisplayName: runtime.clientDisplayName,
    sourceDataSourceTitle: runtime.sourceDataSourceTitle,
    targetDataSourceTitle: runtime.targetDataSourceTitle,
    ownerEmail: runtime.ownerEmail,
    ownerLabel: runtime.ownerLabel,
    clientLabel: runtime.clientLabel,
    sourceLabel: runtime.sourceLabel,
  };
}

function propertyOptionNames(property: DataSourceSchema[string] | undefined): string[] {
  if (!property?.type) return [];
  const optionConfig = property[property.type];
  if (!isRecord(optionConfig) || !Array.isArray(optionConfig.options)) return [];
  return optionConfig.options
    .map((option: unknown) => isRecord(option) && typeof option.name === 'string' ? option.name : '')
    .filter(Boolean);
}

async function resolveSourcePages(env: Env, dataSourceId: string, sourcePageIds?: string[]): Promise<NotionPage[]> {
  const ids = sourcePageIds?.map((id) => id.trim()).filter(Boolean);
  if (!ids || ids.length === 0) return queryAllPages(env, 'client', dataSourceId);

  const allPagesByExtId = new Map<string, NotionPage>();
  const directPages: NotionPage[] = [];
  const extIds: string[] = [];
  for (const id of ids) {
    if (looksLikeNotionPageId(id)) {
      const page = await retrievePage(env, 'client', id);
      if (!isTrashed(page)) directPages.push(page);
    } else {
      extIds.push(id);
    }
  }
  if (extIds.length > 0) {
    for (const page of await queryAllPages(env, 'client', dataSourceId)) {
      const extPageId = readText(page, 'Page ID');
      if (extPageId) allPagesByExtId.set(extPageId, page);
    }
  }
  return [...directPages, ...extIds.flatMap((id) => allPagesByExtId.get(id) ?? [])];
}

export async function resolveTargetPages(
  env: Env,
  dataSourceId: string,
  targetExtPageIdProperty: string,
  targetPageIds?: string[],
  sourcePages: NotionPage[] = [],
): Promise<NotionPage[]> {
  const ids = targetPageIds?.map((id) => id.trim()).filter(Boolean);
  if (!ids || ids.length === 0) return queryAllPages(env, 'halfdozen', dataSourceId);

  const sourceExtIdByPageId = new Map(
    sourcePages.flatMap((page) => {
      const extPageId = readText(page, 'Page ID');
      return extPageId ? [[page.id, extPageId] as const] : [];
    }),
  );
  const directTargetIds: string[] = [];
  const extPageIds = new Set<string>();
  for (const id of ids) {
    const sourceExtPageId = sourceExtIdByPageId.get(id);
    if (sourceExtPageId) {
      extPageIds.add(sourceExtPageId);
    } else if (looksLikeNotionPageId(id)) {
      directTargetIds.push(id);
    } else {
      extPageIds.add(id);
    }
  }

  const directPages = await Promise.all(directTargetIds.map((id) => retrievePage(env, 'halfdozen', id)));
  const matchedPages = extPageIds.size > 0
    ? (await queryAllPages(env, 'halfdozen', dataSourceId)).filter((page) => extPageIds.has(readText(page, targetExtPageIdProperty)))
    : [];
  const pagesById = new Map<string, NotionPage>();
  for (const page of [...directPages, ...matchedPages]) {
    if (!isTrashed(page) && isPageInDataSource(page, dataSourceId)) pagesById.set(page.id, page);
  }
  return [...pagesById.values()];
}

async function buildTargetCreateProperties(
  env: Env,
  config: SyncConfig,
  sourcePage: NotionPage,
  ownerUserId: string | null,
  attachmentFallbacks: AttachmentFallback[] = [],
): Promise<Record<string, unknown>> {
  if (config.targetSchema.Owner?.type === 'people' && !ownerUserId) {
    throw new Error(`Could not find target Owner user ${config.ownerEmail}.`);
  }

  const properties: Record<string, unknown> = {};
  const sourceFiles = readFiles(sourcePage, 'Files & Media');
  const ticket = readText(sourcePage, 'Ticket');
  const externalUrl = readExternalUrl(sourcePage);

  writeRequired(properties, config.targetSchema, 'Ticket', buildTicketTitle(ticket, config.clientDisplayName));
  writeRequired(properties, config.targetSchema, 'Status', DEFAULT_HD_STATUS);
  writeRequired(properties, config.targetSchema, 'Source', config.sourceLabel);
  writeRequired(properties, config.targetSchema, 'Owner', config.ownerLabel, ownerUserId);
  if (config.targetSchema.Client) writeRequired(properties, config.targetSchema, 'Client', config.clientLabel);
  writeRequired(properties, config.targetSchema, config.targetExtPageIdProperty, readText(sourcePage, 'Page ID'));
  if (externalUrl) writeRequired(properties, config.targetSchema, 'External URL', externalUrl);
  if (sourceFiles.length > 0) {
    writeRequired(properties, config.targetSchema, 'External Files & Media', await buildWritableFiles(env, sourceFiles, sourcePage.id, attachmentFallbacks));
  }
  return properties;
}

async function buildExistingTargetPatch(
  env: Env,
  config: SyncConfig,
  sourcePage: NotionPage,
  targetPage: NotionPage,
  ownerUserId: string | null,
  options: { materializeFileUploads?: boolean; attachmentFallbacks?: AttachmentFallback[]; skipAttachmentNames?: Set<string> } = {},
): Promise<Record<string, unknown>> {
  if (config.targetSchema.Owner?.type === 'people' && !ownerUserId) {
    throw new Error(`Could not find target Owner user ${config.ownerEmail}.`);
  }

  const properties: Record<string, unknown> = {};
  const externalUrl = readExternalUrl(sourcePage);
  const sourceFiles = readFiles(sourcePage, 'Files & Media').filter((file) => !options.skipAttachmentNames?.has(file.name));
  const ticket = readText(sourcePage, 'Ticket');
  const desiredTitle = buildTicketTitle(ticket, config.clientDisplayName);
  const currentTitle = readText(targetPage, 'Ticket');
  const extPageId = readText(sourcePage, 'Page ID');

  if (currentTitle !== desiredTitle) writeRequired(properties, config.targetSchema, 'Ticket', desiredTitle);
  if (readText(targetPage, 'Source') !== config.sourceLabel) writeRequired(properties, config.targetSchema, 'Source', config.sourceLabel);
  if (config.targetSchema.Owner && readText(targetPage, 'Owner') !== config.ownerLabel) writeRequired(properties, config.targetSchema, 'Owner', config.ownerLabel, ownerUserId);
  if (config.targetSchema.Client && readText(targetPage, 'Client') !== config.clientLabel) writeRequired(properties, config.targetSchema, 'Client', config.clientLabel);
  if (extPageId && readText(targetPage, config.targetExtPageIdProperty) !== extPageId) writeRequired(properties, config.targetSchema, config.targetExtPageIdProperty, extPageId);
  if (externalUrl && readText(targetPage, 'External URL') !== externalUrl) writeRequired(properties, config.targetSchema, 'External URL', externalUrl);
  if (sourceFiles.length > 0 && !externalFilesMatch(targetPage, config.targetSchema['External Files & Media']?.type, sourceFiles)) {
    if (options.materializeFileUploads === false) {
      properties['External Files & Media'] = { drift: true };
    } else {
      writeRequired(properties, config.targetSchema, 'External Files & Media', await buildWritableFiles(
        env,
        sourceFiles,
        sourcePage.id,
        options.attachmentFallbacks,
      ));
    }
  }

  return properties;
}

function filterTargetPatch(
  patch: Record<string, unknown>,
  config: SyncConfig,
  repairFields?: SourceToHdRepairField[],
): Record<string, unknown> {
  if (!repairFields || repairFields.length === 0) return patch;
  const allowed = new Set(repairFields);
  return Object.fromEntries(Object.entries(patch).filter(([field]) => (
    allowed.has(field as SourceToHdRepairField) ||
    (field === config.targetExtPageIdProperty && allowed.has('External Page ID'))
  )));
}

function shouldRepairField(repairFields: SourceToHdRepairField[] | undefined, field: SourceToHdRepairField): boolean {
  return !repairFields || repairFields.length === 0 || repairFields.includes(field);
}

async function targetPageBodyDiffers(
  env: Env,
  sourcePage: NotionPage,
  targetPageId: string,
  attachmentFallbacks: AttachmentFallback[] = [],
  existingBlocks?: NotionBlock[],
): Promise<boolean> {
  const desiredChildren = await buildTicketBody(env, sourcePage, attachmentFallbacks);
  const desiredTexts = desiredChildren.map(blockPlainText).filter(Boolean);
  const targetBlocks = existingBlocks ?? await listAllBlockChildren(env, 'halfdozen', targetPageId);
  const existingTexts = targetBlocks.map(blockPlainText).filter(Boolean);
  return !stringArraysEqual(existingTexts, desiredTexts);
}

async function syncTargetPageBody(
  env: Env,
  sourcePage: NotionPage,
  targetPageId: string,
  attachmentFallbacks: AttachmentFallback[] = [],
  existingBlocks?: NotionBlock[],
): Promise<boolean> {
  const targetBlocks = existingBlocks ?? await listAllBlockChildren(env, 'halfdozen', targetPageId);
  if (!await targetPageBodyDiffers(env, sourcePage, targetPageId, attachmentFallbacks, targetBlocks)) return false;
  for (const block of targetBlocks) {
    await deleteBlock(env, 'halfdozen', block.id);
  }
  await appendBlockChildren(env, 'halfdozen', targetPageId, await buildTicketBody(env, sourcePage, attachmentFallbacks));
  return true;
}

async function buildTicketBody(
  env: Env,
  sourcePage: NotionPage,
  attachmentFallbacks: AttachmentFallback[] = [],
): Promise<Array<Record<string, unknown>>> {
  const createdBy = readText(sourcePage, 'Created By') || 'Unknown';
  const details = await buildTicketDetailsText(env, sourcePage);
  const children: Array<Record<string, unknown>> = [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'Created By:' }, annotations: { bold: true } },
          { type: 'text', text: { content: ` ${createdBy}` } },
        ],
      },
    },
  ];
  for (const chunk of chunks(details, 1900)) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] },
    });
  }
  for (const fallback of attachmentFallbacks) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `${ATTACHMENT_FALLBACK_PREFIX}${fallback.source_page_id}]: ${fallback.name}${ATTACHMENT_FALLBACK_REASON}`,
            },
          },
          ...(sourcePage.url ? [{
            type: 'text',
            text: { content: 'Open the source ticket.', link: { url: sourcePage.url } },
          }] : []),
        ],
      },
    });
  }
  return children;
}

function attachmentFallbacksFromTargetBlocks(blocks: NotionBlock[], sourcePage: NotionPage): AttachmentFallback[] {
  const fallbackPrefix = `${ATTACHMENT_FALLBACK_PREFIX}${sourcePage.id}]: `;
  const sourceAttachmentNames = new Set(readFiles(sourcePage, 'Files & Media').map((file) => file.name));
  const fallbacks: AttachmentFallback[] = [];
  for (const block of blocks) {
    const text = blockPlainText(block);
    if (!text.startsWith(fallbackPrefix)) continue;
    const reasonIndex = text.indexOf(ATTACHMENT_FALLBACK_REASON, fallbackPrefix.length);
    if (reasonIndex < 0) continue;
    const name = text.slice(fallbackPrefix.length, reasonIndex).trim();
    if (!name || !sourceAttachmentNames.has(name)) continue;
    fallbacks.push({ name, reason: 'notion_file_size_limit', source_page_id: sourcePage.id });
  }
  return uniqueAttachmentFallbacks(fallbacks);
}

function uniqueAttachmentFallbacks(fallbacks: AttachmentFallback[]): AttachmentFallback[] {
  const seen = new Set<string>();
  return fallbacks.filter((fallback) => {
    const key = `${fallback.source_page_id}\t${fallback.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readSourcePageBodyText(env: Env, sourcePageId: string): Promise<string> {
  const blocks = await listAllBlockChildren(env, 'client', sourcePageId);
  return blocks.map(blockPlainText).filter(Boolean).join('\n\n').trim();
}

async function buildWritableFiles(
  env: Env,
  sourceFiles: SyncFile[],
  sourcePageId: string,
  attachmentFallbacks: AttachmentFallback[] = [],
): Promise<Array<Record<string, unknown>>> {
  const files: Array<Record<string, unknown>> = [];
  for (const file of sourceFiles) {
    if (file.sourceType === 'external' && file.url) {
      files.push({ name: file.name, type: 'external', external: { url: file.url } });
      continue;
    }

    if (file.url) {
      try {
        const fileUploadId = await uploadFileToNotion(env, FILE_UPLOAD_TARGET_WORKSPACE as Workspace, {
          name: file.name,
          url: file.url,
        });
        files.push({ name: file.name, type: 'file_upload', file_upload: { id: fileUploadId } });
      } catch (error) {
        if (!isNotionFileSizeLimitError(error)) throw error;
        attachmentFallbacks.push({
          name: file.name,
          reason: 'notion_file_size_limit',
          source_page_id: sourcePageId,
        });
      }
      continue;
    }

    throw new Error(`Source attachment "${file.name}" does not have a retrievable URL.`);
  }
  return files;
}

function isNotionFileSizeLimitError(error: unknown): boolean {
  return /file(?:_upload)?(?:\s+is)?\s+too\s+large|file_upload_invalid_size|file-size\s+limit|file\s+size\s+(?:is\s+)?(?:not\s+within|exceeds|over)|per-file\s+size/i.test(errorMessage(error));
}

function writeRequired(
  properties: Record<string, unknown>,
  schema: DataSourceSchema,
  propertyName: string,
  value: WritableValue,
  userId?: string | null,
): void {
  const property = schema[propertyName];
  if (!property?.type) throw new Error(`Target property "${propertyName}" is missing.`);
  properties[propertyName] = writableValue(property.type, value, userId);
}

function writableValue(type: string, value: WritableValue, userId?: string | null): Record<string, unknown> {
  if (type === 'files') return { files: Array.isArray(value) ? value : [] };
  const text = Array.isArray(value) ? filesToText(value) : value;
  switch (type) {
    case 'title':
      return { title: richText(text) };
    case 'rich_text':
      return { rich_text: richText(text) };
    case 'url':
      return { url: text || null };
    case 'status':
      return { status: text ? { name: text } : null };
    case 'select':
      return { select: text ? { name: text } : null };
    case 'multi_select':
      return { multi_select: text ? [{ name: text }] : [] };
    case 'people':
      return userId ? { people: [{ id: userId }] } : { people: [] };
    default:
      throw new Error(`Unsupported writable property type "${type}".`);
  }
}

function readFiles(page: NotionPage, propertyName: string): SyncFile[] {
  const property = page.properties?.[propertyName];
  if (!property || property.type !== 'files' || !Array.isArray(property.files)) return [];
  const files: SyncFile[] = [];
  for (const file of property.files) {
    if (!isRecord(file)) continue;
    const name = readString(file, 'name') || 'attachment';
    if (isRecord(file.file) && typeof file.file.url === 'string') {
      files.push({ name, sourceType: 'file', url: file.file.url });
      continue;
    }
    if (isRecord(file.file_upload) && typeof file.file_upload.id === 'string') {
      files.push({ name, sourceType: 'file_upload', fileUploadId: file.file_upload.id });
      continue;
    }
    if (isRecord(file.external) && typeof file.external.url === 'string') {
      files.push({ name, sourceType: 'external', url: file.external.url });
    }
  }
  return files;
}

function readExternalUrl(sourcePage: NotionPage): string {
  return readText(sourcePage, 'URL') || sourcePage.url || '';
}

function externalFilesMatch(targetPage: NotionPage, targetPropertyType: string | undefined, sourceFiles: SyncFile[]): boolean {
  if (targetPropertyType === 'files') {
    return fileMatchFingerprints(readFiles(targetPage, 'External Files & Media')).join('\n') === fileMatchFingerprints(sourceFiles).join('\n');
  }
  return readText(targetPage, 'External Files & Media') === filesToText(sourceFiles);
}

function fileMatchFingerprints(files: SyncFile[]): string[] {
  return files.map((file) => {
    if (file.sourceType !== 'external') return `${file.name}\tnotion-file`;
    return `${file.name}\texternal\t${normalizeFileUrl(file.url ?? '')}`;
  }).sort();
}

function filesToText(files: SyncFile[] | Array<Record<string, unknown>>): string {
  return files.map((file) => {
    const name = readString(file, 'name') || 'attachment';
    const url = readExternalFileUrl(file);
    return url ? `${name}: ${url}` : name;
  }).join('\n');
}

function readExternalFileUrl(file: unknown): string {
  if (!isRecord(file)) return '';
  if (typeof file.url === 'string') return file.url;
  if (isRecord(file.external) && typeof file.external.url === 'string') return file.external.url;
  if (isRecord(file.file) && typeof file.file.url === 'string') return file.file.url;
  return '';
}

function groupTargetsByExtPageId(targetPages: NotionPage[], targetExtPageId: string): Map<string, NotionPage[]> {
  const grouped = new Map<string, NotionPage[]>();
  for (const page of targetPages) {
    const extPageId = readText(page, targetExtPageId);
    if (!extPageId) continue;
    const pages = grouped.get(extPageId) ?? [];
    pages.push(page);
    grouped.set(extPageId, pages);
  }
  return grouped;
}

function blockPlainText(block: NotionBlock | Record<string, unknown>): string {
  const type = typeof block.type === 'string' ? block.type : '';
  const payload = isRecord(block[type]) ? block[type] : {};
  const richText = Array.isArray(payload.rich_text) ? payload.rich_text : [];
  return richText.map((entry) => readString(entry, 'plain_text') || readString(isRecord(entry) ? entry.text : null, 'content')).join('').trim();
}

function isPageInDataSource(page: NotionPage, dataSourceId: string): boolean {
  const parentDataSourceId = page.parent?.data_source_id;
  return !parentDataSourceId || parentDataSourceId === dataSourceId;
}

function isTrashed(value: { archived?: boolean; in_trash?: boolean }): boolean {
  return value.archived === true || value.in_trash === true;
}

function missingProperties(schema: DataSourceSchema, names: string[]): string[] {
  return names.filter((name) => !schema[name]);
}

function emptyResult(action: SyncResult['action']): SyncResult {
  return { ok: false, action, created: 0, updated: 0, skipped: 0, errors: [] };
}

function richTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((entry) => readString(entry, 'plain_text')).join('').trim();
}

function richText(text: string): Array<Record<string, unknown>> {
  return chunks(text, 1900).map((content) => ({ type: 'text', text: { content } }));
}

function chunks(text: string, size: number): string[] {
  if (!text) return [];
  const output: string[] = [];
  for (let index = 0; index < text.length; index += size) output.push(text.slice(index, index + size));
  return output;
}

function stringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function optionName(value: unknown): string {
  return isRecord(value) && typeof value.name === 'string' ? value.name : '';
}

function userLabel(value: unknown): string {
  if (!isRecord(value)) return '';
  const name = readString(value, 'name');
  const person = isRecord(value.person) ? value.person : {};
  const email = readString(person, 'email');
  if (name && email) return `${name} (${email})`;
  return name || email;
}

function readString(record: unknown, key: string): string {
  return isRecord(record) && typeof record[key] === 'string' ? record[key] : '';
}

function looksLikeNotionPageId(value: string): boolean {
  return /^[0-9a-f]{32}$/i.test(value.replace(/-/g, ''));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
