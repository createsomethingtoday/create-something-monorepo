import { describe, expect, it } from 'vitest';
import { createDocument } from './document';
import { capabilityHash, consumePublishLimit, createShare, purgeExpiredPublishLimits, purgeExpiredShares, readShare, revokeShare, updateShare, type ShareDb } from './share';

class MemoryDb {
  shares = new Map<string, Record<string, unknown>>(); limits = new Map<string, { window_started_at: number; publish_count: number }>();
  raceNextUpdate = false;
  prepare(sql: string) { return new MemoryStatement(this, sql); }
  async batch() { return []; }
}
class MemoryStatement {
  args: unknown[] = []; constructor(private db: MemoryDb, private sql: string) {} bind(...args: unknown[]) { this.args = args; return this; }
  async first<T>() {
    if (this.sql.includes('FROM draw_shares')) { const row = this.db.shares.get(String(this.args[0])); if (!row || row.revoked_at || (row.expires_at && String(row.expires_at) <= String(this.args[1]))) return null; return structuredClone(row) as T; }
    if (this.sql.includes('FROM draw_publish_limits')) return (this.db.limits.get(String(this.args[0])) ?? null) as T;
    return null;
  }
  async run() {
    if (this.sql.startsWith('INSERT INTO draw_shares')) { const [share_id,management_hash,document_json,title,published_at,updated_at,expires_at]=this.args; this.db.shares.set(String(share_id),{share_id,management_hash,document_json,title,revision:1,published_at,updated_at,expires_at,revoked_at:null}); return {success:true,meta:{changes:1}}; }
    if (this.sql.startsWith('UPDATE draw_shares SET document_json')) { const [document_json,title,revision,updated_at,share_id,expected]=this.args; const row=this.db.shares.get(String(share_id)); if (this.db.raceNextUpdate && row) { this.db.raceNextUpdate = false; row.revision = Number(expected) + 1; return {success:true,meta:{changes:0}}; } if (!row || row.revision!==expected || row.revoked_at) return {success:true,meta:{changes:0}}; Object.assign(row,{document_json,title,revision,updated_at}); return {success:true,meta:{changes:1}}; }
    if (this.sql.startsWith('UPDATE draw_shares SET revoked_at')) { const [revoked_at,document_json,share_id]=this.args; const row=this.db.shares.get(String(share_id)); if (!row || row.revoked_at) return {success:true,meta:{changes:0}}; Object.assign(row,{revoked_at,document_json}); return {success:true,meta:{changes:1}}; }
    if (this.sql.startsWith('DELETE FROM draw_shares')) { const [now,limit]=this.args; const expired=[...this.db.shares.entries()].filter(([,row])=>row.expires_at && String(row.expires_at)<=String(now)).slice(0,Number(limit)); expired.forEach(([id])=>this.db.shares.delete(id)); return {success:true,meta:{changes:expired.length}}; }
    if (this.sql.startsWith('DELETE FROM draw_publish_limits')) { const [windowStart,limit]=this.args; const expired=[...this.db.limits.entries()].filter(([,row])=>row.window_started_at<Number(windowStart)).slice(0,Number(limit)); expired.forEach(([key])=>this.db.limits.delete(key)); return {success:true,meta:{changes:expired.length}}; }
    if (this.sql.startsWith('INSERT INTO draw_publish_limits')) { const [key,start]=this.args; const old=this.db.limits.get(String(key)); if (old && old.window_started_at===start && old.publish_count>=10) return {success:true,meta:{changes:0}}; this.db.limits.set(String(key),{window_started_at:Number(start),publish_count:old && old.window_started_at===start?old.publish_count+1:1}); return {success:true,meta:{changes:1}}; }
    return {success:false,meta:{changes:0}};
  }
}

describe('share snapshot domain', () => {
  it('creates opaque public and management capabilities, updates optimistically, and revokes without disclosure', async () => {
    const memory = new MemoryDb(), db = memory as unknown as ShareDb, document = createDocument('Circulate');
    const created = await createShare(db, document);
    expect(created.shareId).toMatch(/^[A-Za-z0-9_-]{22}$/); expect(created.managementToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const stored = memory.shares.get(created.shareId)!;
    expect(stored.management_hash).toBe(await capabilityHash(created.managementToken)); expect(JSON.stringify(stored)).not.toContain(created.managementToken);
    expect((await readShare(db, created.shareId))?.document).toEqual(document);
    expect(await updateShare(db, created.shareId, 'x'.repeat(43), 1, document)).toBeNull();
    expect(await updateShare(db, created.shareId, created.managementToken, 2, document)).toEqual({conflict:true,revision:1});
    expect(await updateShare(db, created.shareId, created.managementToken, 1, {...document,title:'Updated'})).toMatchObject({revision:2});
    expect((await readShare(db, created.shareId))?.document.title).toBe('Updated');
    memory.raceNextUpdate = true;
    expect(await updateShare(db, created.shareId, created.managementToken, 2, document)).toEqual({ conflict: true, revision: 3 });
    expect(await revokeShare(db, created.shareId, created.managementToken)).toBe(true);
    expect(await readShare(db, created.shareId)).toBeNull(); expect(await revokeShare(db, created.shareId, created.managementToken)).toBe(false);
  });

  it('bounds documents and rate limits by secret HMAC without retaining an address', async () => {
    const memory = new MemoryDb(), db = memory as unknown as ShareDb;
    for (let i=0;i<10;i++) expect(await consumePublishLimit(db,'203.0.113.7','secret',0)).toBe(true);
    expect(await consumePublishLimit(db,'203.0.113.7','secret',0)).toBe(false);
    expect([...memory.limits.keys()].join('')).not.toContain('203.0.113.7');
    await expect(consumePublishLimit(db,'x','')).rejects.toThrow('unavailable');
    await expect(createShare(db,{...createDocument(),objects:Array.from({length:1001},(_,i)=>({id:`n${i}`,kind:'note',createdAt:'x',x:0,y:0,width:1,height:1,text:'x'}))})).rejects.toThrow('limits');
    await expect(createShare(db, createDocument(), 'not-a-date')).rejects.toThrow('future date');
    await expect(createShare(db, createDocument(), '2020-01-01T00:00:00.000Z')).rejects.toThrow('future date');
  });

  it('purges expired snapshot payloads in bounded batches', async () => {
    const memory = new MemoryDb(), db = memory as unknown as ShareDb;
    const expired = await createShare(db, createDocument('Expired'), '2100-01-01T00:00:00.000Z');
    const retained = await createShare(db, createDocument('Retained'), '2200-01-01T00:00:00.000Z');
    expect(await purgeExpiredShares(db, '2150-01-01T00:00:00.000Z', 25)).toBe(1);
    expect(memory.shares.has(expired.shareId)).toBe(false);
    expect(memory.shares.has(retained.shareId)).toBe(true);
  });

  it('purges stale publish-limit buckets in bounded batches', async () => {
    const memory = new MemoryDb(), db = memory as unknown as ShareDb;
    memory.limits.set('old-a', { window_started_at: 0, publish_count: 1 });
    memory.limits.set('old-b', { window_started_at: 0, publish_count: 1 });
    memory.limits.set('current', { window_started_at: 600_000, publish_count: 1 });
    expect(await purgeExpiredPublishLimits(db, 600_000, 1)).toBe(1);
    expect(memory.limits.size).toBe(2);
    expect(memory.limits.has('current')).toBe(true);
  });
});
