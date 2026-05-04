#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const args = process.argv.slice(2);

function usage() {
  console.error(`
Usage:
  pnpm run import:paylocity -- <csv-path> --out <sql-path> [--imported-by <name>] [--notes <text>]

Example:
  pnpm run import:paylocity -- "/Users/micahjohnson/Downloads/Active Headcount-3.csv" --out /tmp/abundance-paylocity-import.sql --imported-by codex
`);
}

function readArg(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

const csvPath = args.find((arg) => !arg.startsWith('--'));
const outPath = readArg('--out');
const importedBy = readArg('--imported-by') || 'codex';
const notes = readArg('--notes') || null;

if (!csvPath || !outPath || args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(csvPath && outPath ? 0 : 1);
}

const REQUIRED_COLUMNS = [
  'Company Code',
  'Employee Id',
  'Last Name',
  'Preferred/First Name',
  'Location Description',
  'Programs Description',
  'Department Description',
  'Employee Status Code',
  'Hire Date',
  'Rehire Date',
  'Termination Date',
  'Supervisor',
  'Position Code',
  'Position Description',
  'Employment Type',
  'Employment Type Description',
  'Job Title (PIT)',
  'Override Job Title (PIT)',
  'EEO Class',
  'EEO Class Description',
  'First Name'
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableId(prefix, value, length = 24) {
  return `${prefix}_${sha256(value).slice(0, length)}`;
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((value) => value.trim() !== ''));
}

function clean(value) {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return sql(JSON.stringify(value));
}

function normalizeDate(value) {
  const text = clean(value);
  if (!text) return null;

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const month = slash[1].padStart(2, '0');
    const day = slash[2].padStart(2, '0');
    const rawYear = slash[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
}

function normalizeActiveStatus(code) {
  const normalized = (code || '').trim().toLowerCase();
  if (['a', 'active'].includes(normalized)) return 'active';
  if (['i', 'inactive', 't', 'terminated'].includes(normalized)) return 'inactive';
  return 'unknown';
}

function classifyRole(positionDescription, jobTitle, departmentDescription) {
  const text = [positionDescription, jobTitle, departmentDescription]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!text.trim()) return { roleBucket: 'Unclassified', confidence: 0.25 };
  if (text.includes('nurse practitioner') && text.includes('physician assistant')) {
    return { roleBucket: 'Nurse Practitioner / Physician Assistant', confidence: 0.9 };
  }
  if (text.includes('nurse practitioner') || /\bnp\b/.test(text)) {
    return { roleBucket: 'Nurse Practitioner', confidence: 0.92 };
  }
  if (text.includes('physician assistant') || /\bpa\b/.test(text)) {
    return { roleBucket: 'Physician Assistant', confidence: 0.88 };
  }
  if (text.includes('registered nurse'))
    return { roleBucket: 'Registered Nurse', confidence: 0.92 };
  if (text.includes('medical assistant'))
    return { roleBucket: 'Medical Assistant', confidence: 0.92 };
  if (text.includes('audiologist')) return { roleBucket: 'Audiologist', confidence: 0.92 };
  if (text.includes('psychologist'))
    return { roleBucket: 'Clinical Psychologist', confidence: 0.9 };
  if (text.includes('supervising physician') || text.includes('physician')) {
    return { roleBucket: 'Physician', confidence: 0.86 };
  }
  if (text.includes('clinical manager'))
    return { roleBucket: 'Clinical Manager', confidence: 0.88 };
  if (text.includes('credential')) return { roleBucket: 'Credentialing', confidence: 0.84 };
  if (
    text.includes('human resources') ||
    text.includes('accounting') ||
    text.includes('executive')
  ) {
    return { roleBucket: 'Operations / Administration', confidence: 0.75 };
  }

  return { roleBucket: 'Other', confidence: 0.5 };
}

function displayName(record) {
  const firstName = clean(record['Preferred/First Name']) || clean(record['First Name']);
  const lastName = clean(record['Last Name']);
  if (firstName && lastName) return `${firstName} ${lastName}`;
  return firstName || lastName || `Employee ${record['Employee Id']}`;
}

function normalizedContactHash(type, value) {
  return sha256(
    `${type}:${String(value).trim().toLowerCase().replace(/\D/g, '') || String(value).trim().toLowerCase()}`
  );
}

function redactEmail(value) {
  const [local, domain] = value.split('@');
  if (!local || !domain) return '[redacted email]';
  return `${local.slice(0, 1)}***@${domain}`;
}

function redactPhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '[redacted phone]';
  return `***-***-${digits.slice(-4)}`;
}

function redactedValue(type, value) {
  if (type.includes('email')) return redactEmail(value);
  if (type.includes('phone') || type.includes('mobile')) return redactPhone(value);
  return '[redacted]';
}

function pushContact(statements, input) {
  const value = clean(input.value);
  if (!value) return;

  statements.push(`INSERT OR IGNORE INTO staff_contact_points (
  id,
  staff_profile_id,
  type,
  label,
  value,
  redacted_value,
  normalized_value_hash,
  is_primary,
  source_import_batch_id
) VALUES (
  ${sql(stableId('contact', `${input.staffProfileId}:${input.type}:${input.label ?? ''}:${value}`, 28))},
  ${sql(input.staffProfileId)},
  ${sql(input.type)},
  ${sql(input.label ?? null)},
  ${sql(value)},
  ${sql(redactedValue(input.type, value))},
  ${sql(normalizedContactHash(input.type, value))},
  ${input.isPrimary ? 1 : 0},
  ${sql(input.batchId)}
);`);
}

function pushAddress(statements, input) {
  const hasAddress = [input.line1, input.line2, input.city, input.state, input.postalCode].some(
    (value) => Boolean(clean(value))
  );
  if (!hasAddress) return;

  const labelParts = [input.city, input.state, input.postalCode].map(clean).filter(Boolean);

  statements.push(`INSERT OR IGNORE INTO staff_addresses (
  id,
  staff_profile_id,
  type,
  line1,
  line2,
  city,
  state,
  postal_code,
  country,
  redacted_label,
  source_import_batch_id
) VALUES (
  ${sql(stableId('addr', `${input.staffProfileId}:${input.type}:${input.line1 ?? ''}:${input.city ?? ''}:${input.state ?? ''}:${input.postalCode ?? ''}`, 28))},
  ${sql(input.staffProfileId)},
  ${sql(input.type)},
  ${sql(clean(input.line1))},
  ${sql(clean(input.line2))},
  ${sql(clean(input.city))},
  ${sql(clean(input.state))},
  ${sql(clean(input.postalCode))},
  ${sql(clean(input.country) || 'US')},
  ${sql(labelParts.length > 0 ? labelParts.join(', ') : '[redacted address]')},
  ${sql(input.batchId)}
);`);
}

function recordFromRow(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, clean(row[index]) || '']));
}

const absoluteCsvPath = resolve(csvPath);
const absoluteOutPath = resolve(outPath);
const csvText = await readFile(absoluteCsvPath, 'utf8');
const sourceHash = sha256(csvText);
const rows = parseCsv(csvText);
const headers = rows[0] ?? [];
const records = rows.slice(1).map((row) => recordFromRow(headers, row));
const batchId = stableId('paylocity_batch', sourceHash, 20);

const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
if (missingColumns.length > 0) {
  throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
}

const employeeIds = new Set();
for (const record of records) {
  const employeeId = clean(record['Employee Id']);
  if (!employeeId) throw new Error('CSV contains a row without Employee Id.');
  if (employeeIds.has(employeeId))
    throw new Error(`CSV contains duplicate Employee Id: ${employeeId}`);
  employeeIds.add(employeeId);
}

const statements = [
  'PRAGMA foreign_keys = ON;',
  `DELETE FROM staff_contact_points WHERE source_import_batch_id = ${sql(batchId)};`,
  `DELETE FROM staff_addresses WHERE source_import_batch_id = ${sql(batchId)};`,
  `DELETE FROM staff_supervisor_relationships WHERE source_import_batch_id = ${sql(batchId)};`,
  `DELETE FROM staff_employment_records WHERE source_import_batch_id = ${sql(batchId)};`,
  `DELETE FROM paylocity_headcount_rows WHERE import_batch_id = ${sql(batchId)};`,
  `DELETE FROM paylocity_import_batches WHERE id = ${sql(batchId)} OR source_file_sha256 = ${sql(sourceHash)};`,
  'UPDATE staff_employment_records SET is_current = 0;',
  'UPDATE staff_supervisor_relationships SET is_current = 0;'
];

statements.push(`INSERT INTO paylocity_import_batches (
  id,
  source_file_name,
  source_file_sha256,
  source_exported_at,
  imported_by,
  row_count,
  column_count,
  notes
) VALUES (
  ${sql(batchId)},
  ${sql(basename(absoluteCsvPath))},
  ${sql(sourceHash)},
  NULL,
  ${sql(importedBy)},
  ${records.length},
  ${headers.length},
  ${sql(notes)}
);`);

records.forEach((record, index) => {
  const employeeId = clean(record['Employee Id']);
  const rowJson = JSON.stringify(record);
  const rowHash = sha256(rowJson);
  const rowId = stableId('paylocity_row', `${batchId}:${employeeId}:${rowHash}`, 28);
  const staffProfileId = stableId('staff', employeeId, 20);
  const jobTitle = clean(record['Override Job Title (PIT)']) || clean(record['Job Title (PIT)']);
  const positionDescription = clean(record['Position Description']);
  const departmentDescription = clean(record['Department Description']);
  const role = classifyRole(positionDescription, jobTitle, departmentDescription);

  statements.push(`INSERT INTO paylocity_headcount_rows (
  id,
  import_batch_id,
  source_row_number,
  employee_id,
  employee_status_code,
  position_code,
  position_description,
  department_description,
  raw_json,
  source_row_hash
) VALUES (
  ${sql(rowId)},
  ${sql(batchId)},
  ${index + 2},
  ${sql(employeeId)},
  ${sql(clean(record['Employee Status Code']))},
  ${sql(clean(record['Position Code']))},
  ${sql(positionDescription)},
  ${sql(departmentDescription)},
  ${sqlJson(record)},
  ${sql(rowHash)}
);`);

  statements.push(`INSERT INTO staff_profiles (
  id,
  paylocity_employee_id,
  display_name,
  legal_first_name,
  legal_last_name,
  role_bucket,
  role_confidence,
  active_status,
  source_import_batch_id,
  updated_at
) VALUES (
  ${sql(staffProfileId)},
  ${sql(employeeId)},
  ${sql(displayName(record))},
  ${sql(clean(record['First Name']))},
  ${sql(clean(record['Last Name']))},
  ${sql(role.roleBucket)},
  ${role.confidence},
  ${sql(normalizeActiveStatus(record['Employee Status Code']))},
  ${sql(batchId)},
  ${sql(new Date().toISOString())}
)
ON CONFLICT(paylocity_employee_id) DO UPDATE SET
  display_name = excluded.display_name,
  legal_first_name = excluded.legal_first_name,
  legal_last_name = excluded.legal_last_name,
  role_bucket = excluded.role_bucket,
  role_confidence = excluded.role_confidence,
  active_status = excluded.active_status,
  source_import_batch_id = excluded.source_import_batch_id,
  updated_at = excluded.updated_at;`);

  statements.push(`INSERT INTO staff_employment_records (
  id,
  staff_profile_id,
  paylocity_headcount_row_id,
  source_import_batch_id,
  is_current,
  company_code,
  employee_status_code,
  employment_type,
  position_code,
  position_description,
  department_description,
  program,
  job_title,
  eeo_class,
  hire_date,
  rehire_date,
  termination_date,
  location_description,
  work_state,
  supervisor_name
) VALUES (
  ${sql(stableId('employment', `${batchId}:${employeeId}`, 28))},
  ${sql(staffProfileId)},
  ${sql(rowId)},
  ${sql(batchId)},
  1,
  ${sql(clean(record['Company Code']))},
  ${sql(clean(record['Employee Status Code']))},
  ${sql(clean(record['Employment Type Description']) || clean(record['Employment Type']))},
  ${sql(clean(record['Position Code']))},
  ${sql(positionDescription)},
  ${sql(departmentDescription)},
  ${sql(clean(record['Programs Description']))},
  ${sql(jobTitle)},
  ${sql(clean(record['EEO Class Description']) || clean(record['EEO Class']))},
  ${sql(normalizeDate(record['Hire Date']))},
  ${sql(normalizeDate(record['Rehire Date']))},
  ${sql(normalizeDate(record['Termination Date']))},
  ${sql(clean(record['Location Description']))},
  ${sql(clean(record['Current Work State']))},
  ${sql(clean(record['Supervisor']))}
);`);

  statements.push(`INSERT INTO staff_supervisor_relationships (
  id,
  staff_profile_id,
  supervisor_name,
  source_import_batch_id,
  is_current
) VALUES (
  ${sql(stableId('supervisor', `${batchId}:${employeeId}:${record['Supervisor'] ?? ''}`, 28))},
  ${sql(staffProfileId)},
  ${sql(clean(record['Supervisor']))},
  ${sql(batchId)},
  1
);`);

  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'home_email',
    label: 'Home email',
    value: record['Current Home Email'],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'work_email',
    label: 'Work email',
    value: record['Current Work Email'],
    isPrimary: true
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'home_mobile',
    label: 'Home mobile phone',
    value: record['Current Home Mobile Phone'],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'home_phone',
    label: 'Home phone',
    value: record['Current Home Phone'],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'work_phone',
    label: 'Work phone',
    value: record['Current Work Phone'],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'work_phone',
    label: 'Work mobile phone',
    value: record['Current Work Mobile Phone'],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'supervisor_email',
    label: 'Supervisor personal email',
    value: record["Supervisor's Personal Email"],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'supervisor_email',
    label: 'Supervisor work email',
    value: record["Supervisor's Work Email"],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'supervisor_email',
    label: 'Indirect supervisor personal email',
    value: record['Indirect Supervisor Personal Email'],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'supervisor_email',
    label: 'Indirect supervisor work email',
    value: record['Indirect Supervisor Work Email'],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'reviewer_email',
    label: 'Reviewer personal email',
    value: record["Reviewer's Personal Email"],
    isPrimary: false
  });
  pushContact(statements, {
    batchId,
    staffProfileId,
    type: 'reviewer_email',
    label: 'Reviewer work email',
    value: record["Reviewer's Work Email"],
    isPrimary: false
  });

  pushAddress(statements, {
    batchId,
    staffProfileId,
    type: 'home',
    line1: record['Current Home Address 1'],
    line2: record['Current Home Address 2'],
    city: record['Current Home City'],
    state: record['Current Home State'],
    postalCode: record['Current Home Zip'],
    country: record['Current Home Country']
  });
  pushAddress(statements, {
    batchId,
    staffProfileId,
    type: 'work',
    line1: record['Current Work Address 1'],
    line2: record['Current Work Address 2'],
    city: record['Current Work City'],
    state: record['Current Work State'],
    postalCode: record['Current Work Zip'],
    country: record['Current Work Country']
  });
  pushAddress(statements, {
    batchId,
    staffProfileId,
    type: 'other',
    line1: record['Current Additional Address'],
    line2: null,
    city: null,
    state: null,
    postalCode: null,
    country: record['Current Additional Address Country']
  });
});

await mkdir(dirname(absoluteOutPath), { recursive: true });
await writeFile(absoluteOutPath, `${statements.join('\n\n')}\n`, 'utf8');

const summary = {
  csv_path: absoluteCsvPath,
  sql_path: absoluteOutPath,
  batch_id: batchId,
  source_file_sha256: sourceHash,
  row_count: records.length,
  column_count: headers.length,
  unique_employee_ids: employeeIds.size,
  statement_count: statements.length,
  import_run_id: randomUUID()
};

console.log(JSON.stringify(summary, null, 2));
