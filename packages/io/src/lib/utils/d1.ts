export function hasMissingD1TableError(error: unknown, tables: string | string[]): boolean {
	const message = error instanceof Error ? error.message : String(error ?? '');
	const normalizedMessage = message.toLowerCase();
	const expectedTables = Array.isArray(tables) ? tables : [tables];

	return expectedTables.some((table) =>
		normalizedMessage.includes(`no such table: ${table.toLowerCase()}`)
	);
}
