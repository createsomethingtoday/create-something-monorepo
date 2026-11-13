/**
 * In-memory stand-in for the `airtable` package.
 *
 * It keeps tables as arrays and answers the query shapes the API key and
 * Creator API code sends. A formula it does not recognise throws, so a new
 * query cannot pass a test by accident.
 */
export interface FakeRecord {
	id: string;
	fields: Record<string, unknown>;
}

interface SelectOptions {
	filterByFormula?: string;
	maxRecords?: number;
	view?: string;
}

/** Mirrors an Airtable two-way link: creating a row adds it to the other side. */
export interface FakeBackLink {
	table: string;
	field: string;
	inverseTable: string;
	inverseField: string;
}

export interface FakeAirtableCall {
	method: 'select' | 'find' | 'create' | 'update';
	table: string;
	detail: unknown;
}

const HASH_FIELD = 'API Key Hash';
const CREATOR_RECORD_ID_LOOKUP = '⚙️🎨Creator Record ID';
const CREATOR_EMAIL_FIELD = '📧WF Account Email';

function matchesFormula(record: FakeRecord, formula: string | undefined): boolean {
	if (!formula) return true;
	if (formula === 'FALSE()') return false;

	if (formula.includes('RECORD_ID() =')) {
		const ids = [...formula.matchAll(/RECORD_ID\(\) = '(rec[A-Za-z0-9]{14})'/g)].map((m) => m[1]);
		return ids.includes(record.id);
	}

	const hash = /^\{API Key Hash\} = '([0-9a-f]{64})'$/.exec(formula)?.[1];
	if (hash) return record.fields[HASH_FIELD] === hash;

	if (formula.includes(`ARRAYJOIN({${CREATOR_RECORD_ID_LOOKUP}}`)) {
		const creatorIds = [...formula.matchAll(/FIND\(',(rec[A-Za-z0-9]{14}),'/g)].map((m) => m[1]);
		const linked = record.fields[CREATOR_RECORD_ID_LOOKUP];
		return Array.isArray(linked) && creatorIds.some((id) => linked.includes(id));
	}

	if (formula.includes(`{${CREATOR_EMAIL_FIELD}}`)) {
		const email = /FIND\(',' & '([^']+)' & ','/.exec(formula)?.[1];
		return String(record.fields[CREATOR_EMAIL_FIELD] ?? '').toLowerCase() === email;
	}

	throw new Error(`Fake Airtable cannot evaluate this formula: ${formula}`);
}

export function createFakeAirtable(
	tables: Record<string, FakeRecord[]>,
	options: { backLinks?: FakeBackLink[]; createdTimeField?: Record<string, string> } = {}
) {
	const calls: FakeAirtableCall[] = [];
	let created = 0;
	/** Lets a test act between a read and whatever the caller does with it. */
	const hooks: { afterSelect?: (table: string) => Promise<void> } = {};

	const rows = (table: string) => (tables[table] ??= []);

	const table = (name: string) => ({
		select(selectOptions: SelectOptions = {}) {
			calls.push({ method: 'select', table: name, detail: selectOptions });
			// Reads return copies, as API responses do: a caller holding a record
			// does not see a later write.
			const run = async () => {
				const found = rows(name)
					.filter((record) => matchesFormula(record, selectOptions.filterByFormula))
					.slice(0, selectOptions.maxRecords ?? Number.POSITIVE_INFINITY)
					.map((record) => structuredClone(record));
				await hooks.afterSelect?.(name);
				return found;
			};
			return { firstPage: run, all: run };
		},

		async find(id: string) {
			calls.push({ method: 'find', table: name, detail: id });
			const record = rows(name).find((candidate) => candidate.id === id);
			// Live Airtable answers 403 NOT_AUTHORIZED for a record ID it never issued.
			if (!record) throw Object.assign(new Error('NOT_AUTHORIZED'), { statusCode: 403 });
			return structuredClone(record);
		},

		async create(newRows: { fields: Record<string, unknown> }[]) {
			return newRows.map(({ fields }) => {
				calls.push({ method: 'create', table: name, detail: fields });
				created += 1;
				const record: FakeRecord = {
					id: `recFake${String(created).padStart(10, '0')}`,
					fields: { ...fields }
				};

				const createdTimeField = options.createdTimeField?.[name];
				if (createdTimeField) {
					record.fields[createdTimeField] = new Date(Date.now() + created).toISOString();
				}

				for (const link of options.backLinks ?? []) {
					if (link.table !== name) continue;
					for (const targetId of (fields[link.field] as string[] | undefined) ?? []) {
						const target = rows(link.inverseTable).find((candidate) => candidate.id === targetId);
						if (!target) continue;
						target.fields[link.inverseField] = [
							...((target.fields[link.inverseField] as string[] | undefined) ?? []),
							record.id
						];
					}
				}

				rows(name).push(record);
				return record;
			});
		},

		async update(updates: { id: string; fields: Record<string, unknown> }[]) {
			return updates.map(({ id, fields }) => {
				calls.push({ method: 'update', table: name, detail: { id, fields } });
				const record = rows(name).find((candidate) => candidate.id === id);
				if (!record) throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });
				Object.assign(record.fields, fields);
				return record;
			});
		}
	});

	return {
		table,
		tables,
		hooks,
		calls,
		callsTo: (method: FakeAirtableCall['method'], tableName: string) =>
			calls.filter((call) => call.method === method && call.table === tableName)
	};
}

export type FakeAirtable = ReturnType<typeof createFakeAirtable>;
