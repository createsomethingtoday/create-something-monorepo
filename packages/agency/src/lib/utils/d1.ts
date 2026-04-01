export function hasMissingD1TableError(error: unknown, tables: string[]): boolean {
	const message = error instanceof Error ? error.message : String(error);

	return tables.some((table) => message.includes(`no such table: ${table}`));
}
