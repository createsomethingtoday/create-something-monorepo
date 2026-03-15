declare module '@create-something/notion-tools' {
	export function format_schema(propertiesJson: string): string;
	export function simplify_pages(pagesJson: string): string;
	export function find_duplicates(pagesJson: string, keepStrategy: string): string;
	export function estimate_tokens(text: string): number;
}
