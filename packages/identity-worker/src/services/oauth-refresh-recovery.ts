/** A recovery key requires BOTH the predecessor credential and its unpredictable
 * request id. Domain separation and authenticated bindings prevent substitution.
 * Only ciphertext and the request hash are stored. Eligibility lasts at most
 * five minutes; deletion is opportunistic, not a timed retention guarantee. */
const encoder = new TextEncoder();
const encode = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = (value: string) => Uint8Array.from(atob(value), x => x.charCodeAt(0));
export async function recoveryHash(value: string): Promise<string> {
 return encode(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
}
async function key(token:string, requestId:string) {
 const material=await crypto.subtle.importKey('raw',encoder.encode(token),'HKDF',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:encoder.encode(requestId),info:encoder.encode('identity:a2a-refresh-recovery:v1')},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptRecovery(token:string,requestId:string,binding:string,response:Record<string,unknown>):Promise<string>{
 const iv=crypto.getRandomValues(new Uint8Array(12));
 return `${encode(iv)}.${encode(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(binding)},await key(token,requestId),encoder.encode(JSON.stringify(response))))}`;
}
export async function readRecovery(db:D1Database,grantId:string,token:string,requestId:string,binding:string):Promise<Record<string,unknown>|null>{
 const row=await db.prepare('SELECT request_hash,binding,response_ciphertext,recover_until FROM oauth_refresh_recoveries WHERE grant_id=?').bind(grantId).first<{request_hash:string;binding:string;response_ciphertext:string;recover_until:number}>();
 if(!row||row.recover_until<=Math.floor(Date.now()/1000)||row.request_hash!==await recoveryHash(requestId)||row.binding!==binding)return null;
 const [iv,ciphertext]=row.response_ciphertext.split('.');
 return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:encoder.encode(binding)},await key(token,requestId),decode(ciphertext))));
}
export async function commitRecovery(db:D1Database,grant:{jti:string;client_id:string;exp:number},requestId:string,binding:string,ciphertext:string):Promise<void>{
 const now=Math.floor(Date.now()/1000);
 const parts=JSON.parse(binding) as unknown[];
 if(parts.length!==6||parts[0]!==grant.jti||parts[1]!==grant.client_id||typeof parts[2]!=='string'||typeof parts[4]!=='string')throw new Error('Invalid recovery binding');
 // D1 batch is transactional. changes() belongs to the immediately preceding
 // INSERT: a losing contender cannot attach its response to the winner's grant.
 await db.batch([
  db.prepare('DELETE FROM connection_renewal_audit WHERE committed_at<?').bind(now-90*86400),
  db.prepare('DELETE FROM oauth_refresh_recoveries WHERE recover_until<=?').bind(now),
  db.prepare('INSERT OR IGNORE INTO oauth_grant_consumptions(grant_id,grant_kind,client_id,expires_at) VALUES(?,?,?,?)').bind(grant.jti,'oauth_refresh_token',grant.client_id,grant.exp),
  db.prepare('INSERT INTO oauth_refresh_recoveries(grant_id,request_hash,binding,response_ciphertext,recover_until) SELECT ?,?,?,?,? WHERE changes()=1').bind(grant.jti,await recoveryHash(requestId),binding,ciphertext,Math.min(now+300,grant.exp)),
  db.prepare('INSERT OR IGNORE INTO connection_renewal_audit(grant_id,owner_subject,client_id,resource,committed_at) SELECT ?,?,?,?,? WHERE changes()=1').bind(grant.jti,parts[2],grant.client_id,parts[4],now),
 ]);
}

export async function recoverySuccessorConsumed(db:D1Database,response:Record<string,unknown>):Promise<boolean>{
 const token=response.refresh_token;
 if(typeof token!=='string')return true;
 const payload=JSON.parse(atob(token.split('.')[1].replaceAll('-','+').replaceAll('_','/')));
 return Boolean(await db.prepare('SELECT grant_id FROM oauth_grant_consumptions WHERE grant_id=?').bind(payload.jti).first());
}
