import type { WriteJournal } from './indexed-transcript';

export const GATE_SCHEMA = `CREATE TABLE IF NOT EXISTS transcript_gate_intent (
  page_id TEXT PRIMARY KEY, pending TEXT
)`;
export const GATE_FIELDS = {
  current: 'Transcript Version', ready: 'Transcript Ready Version',
  categorized: 'Categorized Transcript Version', index: 'Transcript Retrieval Index',
} as const;
type Properties = Record<string, any>;
interface Transport {
  getPage(id: string): Promise<Record<string, any>>;
  updatePage(id: string, properties: Properties): Promise<unknown>;
}
const rich = (content: string) => ({ rich_text: content ? [{ type: 'text', text: { content } }] : [] });
export const propertyText = (value: any): string => (value?.rich_text ?? []).map((x: any) => x.plain_text ?? x.text?.content ?? '').join('');
export function gateToken(hash: string, generation: number): string {
  if (!/^[a-f0-9]{64}$/.test(hash) || !Number.isSafeInteger(generation) || generation < 1) throw Error('Invalid transcript gate version');
  return `${hash}:${generation}`;
}
export function gateCreationProperties(hash: string): Properties {
  return { [GATE_FIELDS.current]: rich(gateToken(hash, 1)), [GATE_FIELDS.ready]: rich(''), [GATE_FIELDS.index]: { url: null } };
}
function matches(properties: Properties, target: Properties): boolean {
  return Object.entries(target).every(([name, value]) => 'rich_text' in value
    ? propertyText(properties[name]) === propertyText(value) : properties[name]?.url === value.url);
}

// Serialize property intents across owners. A late Current-changing PATCH must
// be reconciled before a successor changes either properties or body blocks.
export class Gate {
  constructor(private db: D1Database, private transport: Transport, private journal: WriteJournal, private page: string) {}
  private async run(sql: string, values: unknown[]) {
    const f = this.journal.projectionFence?.();
    return this.db.prepare(sql + (f ? ' AND EXISTS (SELECT 1 FROM transcript_ingestion WHERE meeting_key = ? AND selected_key = ? AND owner = ? AND expires_at > ?)' : ''))
      .bind(...values, ...(f ? [f.key, f.selected, f.owner, new Date().toISOString()] : [])).run();
  }
  async reconcile(allowSend?: string, beforeSend?: () => Promise<void>): Promise<void> {
    await this.journal.assertOwner();
    const row = await this.db.prepare('SELECT pending FROM transcript_gate_intent WHERE page_id = ?').bind(this.page).first<{ pending: string | null }>();
    if (!row?.pending) return;
    const intent = JSON.parse(row.pending) as { key: string; properties: Properties };
    const complete = async () => {
      const actual = await this.transport.getPage(this.page);
      if (!matches(actual.properties, intent.properties)) return false;
      await this.journal.assertOwner();
      const result = await this.run('UPDATE transcript_gate_intent SET pending = NULL WHERE page_id = ? AND pending = ?', [this.page, row.pending]);
      if (result.meta.changes !== 1) throw Error('Readiness intent ownership lost');
      return true;
    };
    if (await complete()) return;
    if (intent.key !== allowSend) {
      // No request can have started without its permanent reservation. Cancel
      // an unsent intent atomically; never initiate an old Ready from recovery.
      const canceled = await this.run(`UPDATE transcript_gate_intent SET pending = NULL
        WHERE page_id = ? AND pending = ? AND NOT EXISTS
        (SELECT 1 FROM transcript_write_journal WHERE operation_key = ?)`, [this.page, row.pending, intent.key]);
      if (canceled.meta.changes === 1) return;
      if (await complete()) return;
      throw Error('Uncertain readiness property write requires reconciliation');
    }
    await beforeSend?.();
    if (!await this.journal.reserve(intent.key)) {
      if (await complete()) return;
      throw Error('Uncertain readiness property write requires reconciliation');
    }
    await beforeSend?.();
    await this.journal.assertOwner();
    try { await this.transport.updatePage(this.page, intent.properties); }
    catch (error) { if (await complete()) return; throw error; }
    if (!await complete()) throw Error('Readiness property readback mismatch');
  }
  private async patch(properties: Properties, beforeSend?: () => Promise<void>): Promise<void> {
    await this.reconcile();
    if (matches((await this.transport.getPage(this.page)).properties, properties)) return;
    const key = `gate:${this.page}:${crypto.randomUUID()}`;
    const intent = JSON.stringify({ key, properties });
    await this.journal.assertOwner();
    await this.run('INSERT OR IGNORE INTO transcript_gate_intent (page_id, pending) SELECT ?, NULL WHERE 1 = 1', [this.page]);
    const result = await this.run('UPDATE transcript_gate_intent SET pending = ? WHERE page_id = ? AND pending IS NULL', [intent, this.page]);
    if (result.meta.changes !== 1) throw Error('Readiness intent changed concurrently');
    await this.reconcile(key, beforeSend);
  }
  async prepare(token: string, writing: boolean): Promise<void> {
    await this.reconcile();
    await this.journal.assertOwner();
    await this.run('INSERT OR IGNORE INTO transcript_gate_intent (page_id, pending) SELECT ?, NULL WHERE 1 = 1', [this.page]);
    const p = (await this.transport.getPage(this.page)).properties;
    const current = propertyText(p[GATE_FIELDS.current]);
    if (current === token && !writing) return;
    if (current && current !== token && Number(current.split(':')[1]) >= Number(token.split(':')[1])) throw Error('Stale readiness generation');
    await this.patch({ [GATE_FIELDS.current]: rich(token), [GATE_FIELDS.ready]: rich(''), [GATE_FIELDS.index]: { url: null } });
  }
  async invalidate(): Promise<void> {
    await this.reconcile();
    const p = (await this.transport.getPage(this.page)).properties;
    if (!propertyText(p[GATE_FIELDS.current])) return; // Unmanaged/manual pages keep their existing workflow.
    await this.patch({ [GATE_FIELDS.ready]: rich(''), [GATE_FIELDS.index]: { url: null } });
  }
  async publish(token: string, index: string, assertReady: () => Promise<void>, indexPageUrl?: string): Promise<void> {
    await this.reconcile(); await assertReady(); await this.journal.assertOwner();
    if (propertyText((await this.transport.getPage(this.page)).properties[GATE_FIELDS.current]) !== token) throw Error('Readiness current version changed');
    // Never rewrite Current here. A delayed old Ready cannot validate a newer generation.
    if (indexPageUrl) {
      const url = new URL(indexPageUrl);
      if (url.protocol !== 'https:' || !['www.notion.so', 'notion.so', 'app.notion.com'].includes(url.hostname) || url.hash || !url.pathname.replace(/-/g, '').endsWith(index.replace(/-/g, ''))) throw Error('Invalid direct index page URL');
    }
    await this.patch({ [GATE_FIELDS.ready]: rich(token), [GATE_FIELDS.index]: { url: indexPageUrl ?? `https://www.notion.so/${this.page.replace(/-/g, '')}#${index.replace(/-/g, '')}` } }, assertReady);
    await assertReady();
  }
}
