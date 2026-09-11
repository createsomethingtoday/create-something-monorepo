import {z} from 'zod';
import {unitVector} from './abundance-sourcing';
const runId=z.string().regex(/^abnationalrun_[a-zA-Z0-9_-]+$/).max(100);
const entry=z.object({
 npi:z.string().regex(/^\d{10}$/),source_payload_hash:z.string().regex(/^[a-f0-9]{64}$/),
 status:z.enum(['matched','unmatched']),latitude:z.number().finite().min(-90).max(90).optional(),
 longitude:z.number().finite().min(-180).max(180).optional(),matched_address:z.string().min(1).max(500).optional(),
 fetched_at:z.string().datetime()
}).strict().refine(v=>v.status==='matched' ? v.latitude!==undefined&&v.longitude!==undefined&&!!v.matched_address : v.latitude===undefined&&v.longitude===undefined&&v.matched_address===undefined,'Matched results require coordinates and address; unmatched results must omit them.');
export const geocodeImportSchema=z.object({run_id:runId,results:z.array(entry).min(1).max(500)}).strict().refine(v=>new Set(v.results.map(r=>r.npi)).size===v.results.length,'Duplicate NPIs.');
async function completedRun(db:D1Database,id:string){
 runId.parse(id);
 const run=await db.prepare("SELECT id,taxonomy_scope FROM abundance_healthcare_nationwide_runs WHERE id=? AND status='succeeded'").bind(id).first<{id:string;taxonomy_scope:string}>();
 if(!run)throw new TypeError('Requested completed snapshot is unavailable.');return run;
}
export async function readGeocodeSource(db:D1Database,id:string,cursor:string){
 const run=await completedRun(db,id);
 if(cursor&&!/^\d{10}$/.test(cursor))throw new TypeError('Invalid cursor.');
 const [rows,count]=await Promise.all([
 db.prepare(`SELECT provider_npi AS npi,
 json_extract(provider_snapshot_json,'$.source_payload_hash') AS source_payload_hash,
 json_extract(provider_snapshot_json,'$.practice_address_1') AS practice_address_1,
 json_extract(provider_snapshot_json,'$.practice_city') AS practice_city,
 json_extract(provider_snapshot_json,'$.practice_state') AS practice_state,
 json_extract(provider_snapshot_json,'$.practice_postal_code') AS practice_postal_code,
 json_extract(provider_snapshot_json,'$.practice_country') AS practice_country
 FROM abundance_healthcare_nationwide_memberships WHERE run_id=? AND provider_npi>? ORDER BY provider_npi LIMIT 2000`).bind(id,cursor).all<{npi:string;source_payload_hash:string;practice_address_1:string|null;practice_city:string|null;practice_state:string|null;practice_postal_code:string|null;practice_country:string|null}>(),
 db.prepare('SELECT count(*) AS total FROM abundance_healthcare_nationwide_memberships WHERE run_id=?').bind(id).first<{total:number}>()
 ]);
 const records=rows.results??[];
 return {run_id:run.id,taxonomy_scope:run.taxonomy_scope,total:count?.total??0,records,next_cursor:records.length===2000?records.at(-1)!.npi:null};
}
export async function importGeocodes(db:D1Database,input:unknown){
 const parsed=geocodeImportSchema.parse(input);await completedRun(db,parsed.run_id);
 const data=JSON.stringify(parsed.results.map(r=>({...r,...(r.status==='matched'?unitVector(r.latitude!,r.longitude!):{})})));
 // Keep the bounded upload rows outermost so SQLite probes the (run_id, NPI) index.
 // A reorderable JOIN scans the whole national snapshot against every batch row.
 const matching=await db.prepare(`SELECT count(*) AS n FROM json_each(?) i
 CROSS JOIN abundance_healthcare_nationwide_memberships m ON m.run_id=? AND m.provider_npi=json_extract(i.value,'$.npi')
 WHERE json_extract(m.provider_snapshot_json,'$.source_payload_hash')=json_extract(i.value,'$.source_payload_hash')`).bind(data,parsed.run_id).first<{n:number}>();
 if(matching?.n!==parsed.results.length)throw new TypeError('Every geocode must match the pinned NPI source version; no rows imported.');
 // One statement is atomic and retries retain exactly one entry per NPI/source version.
 // Recheck the complete run and every source version inside the write to handle pruning races.
 const result=await db.prepare(`INSERT INTO abundance_healthcare_geocodes
 (provider_npi,source_payload_hash,status,latitude,longitude,unit_x,unit_y,unit_z,matched_address,fetched_at)
 SELECT json_extract(i.value,'$.npi'),json_extract(i.value,'$.source_payload_hash'),json_extract(i.value,'$.status'),
 json_extract(i.value,'$.latitude'),json_extract(i.value,'$.longitude'),json_extract(i.value,'$.x'),json_extract(i.value,'$.y'),json_extract(i.value,'$.z'),json_extract(i.value,'$.matched_address'),json_extract(i.value,'$.fetched_at')
 FROM json_each(?) i
 WHERE EXISTS(SELECT 1 FROM abundance_healthcare_nationwide_runs WHERE id=? AND status='succeeded')
 AND (SELECT count(*) FROM json_each(?) v CROSS JOIN abundance_healthcare_nationwide_memberships m ON m.run_id=? AND m.provider_npi=json_extract(v.value,'$.npi') WHERE json_extract(m.provider_snapshot_json,'$.source_payload_hash')=json_extract(v.value,'$.source_payload_hash'))=?
 ON CONFLICT(provider_npi,source_payload_hash) DO UPDATE SET status=excluded.status,latitude=excluded.latitude,longitude=excluded.longitude,unit_x=excluded.unit_x,unit_y=excluded.unit_y,unit_z=excluded.unit_z,matched_address=excluded.matched_address,fetched_at=excluded.fetched_at`).bind(data,parsed.run_id,data,parsed.run_id,parsed.results.length).run();
 if(result.meta.changes!==parsed.results.length)throw new Error('Snapshot changed during import; retry after checking retained source.');
 return {imported:parsed.results.length,matched:parsed.results.filter(r=>r.status==='matched').length,unmatched:parsed.results.filter(r=>r.status==='unmatched').length};
}
