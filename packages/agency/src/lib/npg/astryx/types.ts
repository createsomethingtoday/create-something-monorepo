export type HistoryItem = { id: string; title: string; status: string; updated_at: number };
export type NpgBootstrap = { owner: string; conversations: HistoryItem[] };
