import type { ParseResult, ParsedOnboardingFields } from './types.js';

interface MutableParseContext {
  fields: ParsedOnboardingFields;
  keyValues: Record<string, string>;
  warnings: string[];
}

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseYesNo(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('yes')) return true;
  if (normalized.startsWith('no')) return false;
  return undefined;
}

function parsePoints(value: string): number | undefined {
  const match = value.replace(/,/g, '').match(/(\d{1,9})/);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseContactEmail(value: string, warnings: string[]): string | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    warnings.push(`Contact email appears invalid: "${value}"`);
  }
  return normalized;
}

function setMappedField(label: string, value: string, ctx: MutableParseContext): boolean {
  const normalizedLabel = normalizeLabel(label);
  const trimmedValue = value.trim();
  ctx.keyValues[normalizedLabel] = trimmedValue;

  switch (normalizedLabel) {
    case 'agency name':
      ctx.fields.agencyName = trimmedValue || undefined;
      return true;
    case 'contact person':
      ctx.fields.contactName = trimmedValue || undefined;
      return true;
    case 'contact email':
      ctx.fields.contactEmail = parseContactEmail(trimmedValue, ctx.warnings);
      return true;
    case 'partner type':
      ctx.fields.partnerType = trimmedValue || undefined;
      return true;
    case 'acceleration': {
      const parsed = parseYesNo(trimmedValue);
      if (parsed === undefined && trimmedValue) {
        ctx.warnings.push(`Acceleration field is not a Yes/No value: "${trimmedValue}"`);
      }
      ctx.fields.accelerationRequested = parsed;
      return true;
    }
    case 'partner points':
    case 'partner': {
      const points = parsePoints(trimmedValue);
      if (points !== undefined) {
        ctx.fields.partnerPoints = points;
      } else if (trimmedValue) {
        ctx.warnings.push(`Unable to parse partner points from "${trimmedValue}"`);
      }
      return true;
    }
    case 'enterprise distinction':
      ctx.fields.enterpriseDistinction = trimmedValue || undefined;
      return true;
    case 'connect with allish': {
      const parsed = parseYesNo(trimmedValue);
      if (parsed === undefined && trimmedValue) {
        ctx.warnings.push(`Connect with Allish field is not a Yes/No value: "${trimmedValue}"`);
      }
      ctx.fields.connectWithAllish = parsed;
      return true;
    }
    case 'workspace name':
      ctx.fields.workspaceName = trimmedValue || undefined;
      return true;
    case 'workspace id':
      ctx.fields.workspaceId = trimmedValue || undefined;
      return true;
    case 'submitter name':
      ctx.fields.submitterName = trimmedValue || undefined;
      return true;
    case 'additional info':
      ctx.fields.additionalInfo = trimmedValue || undefined;
      return true;
    default:
      return false;
  }
}

function maybeParsePartnerPointsLine(line: string): number | undefined {
  const normalized = line.trim().toLowerCase();
  if (!normalized.startsWith('partner')) {
    return undefined;
  }
  return parsePoints(normalized);
}

export function parseSlackOnboardingMessage(rawText: string): ParseResult {
  const ctx: MutableParseContext = {
    fields: {},
    keyValues: {},
    warnings: []
  };

  const lines = rawText
    .split(/\r?\n/g)
    .map((line) => line.trimEnd());

  let additionalInfoOpen = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (additionalInfoOpen && ctx.fields.additionalInfo) {
        ctx.fields.additionalInfo = `${ctx.fields.additionalInfo}\n`;
      }
      continue;
    }

    const pointsOnlyLine = maybeParsePartnerPointsLine(line);
    if (pointsOnlyLine !== undefined) {
      ctx.fields.partnerPoints = pointsOnlyLine;
      ctx.keyValues.partner = line;
      additionalInfoOpen = false;
      continue;
    }

    const separatorIndex = line.indexOf(':');
    const hasSeparator = separatorIndex > 0;

    if (hasSeparator) {
      const label = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1);
      const didMap = setMappedField(label, value, ctx);

      additionalInfoOpen = didMap && normalizeLabel(label) === 'additional info';
      continue;
    }

    if (additionalInfoOpen) {
      ctx.fields.additionalInfo = ctx.fields.additionalInfo
        ? `${ctx.fields.additionalInfo}\n${line}`
        : line;
      continue;
    }
  }

  const extractedFieldCount = Object.values(ctx.fields).filter((value) => {
    if (typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    return Boolean(value);
  }).length;

  const hasRequired = Boolean(ctx.fields.agencyName && ctx.fields.workspaceId && ctx.fields.contactEmail);

  let parseStatus: ParseResult['parseStatus'];
  if (extractedFieldCount === 0) {
    parseStatus = 'failed';
  } else if (hasRequired) {
    parseStatus = 'parsed';
  } else {
    parseStatus = 'partial';
    if (!ctx.fields.agencyName) ctx.warnings.push('Agency name was not found.');
    if (!ctx.fields.workspaceId) ctx.warnings.push('Workspace ID was not found.');
    if (!ctx.fields.contactEmail) ctx.warnings.push('Contact email was not found.');
  }

  return {
    parseStatus,
    warnings: ctx.warnings,
    fields: ctx.fields,
    parsedKeyValues: ctx.keyValues
  };
}
