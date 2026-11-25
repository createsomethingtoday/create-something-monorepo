import { DomainError } from './domain';
import type { Principal } from './domain-types';
import type { RuntimeEnv } from './env';
import { effectiveSubscriptionStatus } from './subscription-status';
const LIMIT=100;
/** Read-only, owner-scoped legacy inbox diagnostic, also available in shared mode.
 * Receipt acceptance is only HTTP callback acceptance, never proof of host processing.
 */
export async function monitoringStatus(env:RuntimeEnv,p:Principal,agentId:string){
 const now=Date.now();
 try{
  const agent=await env.DB.prepare('SELECT id,paused FROM agents WHERE id=? AND owner_subject=? AND deleted_at IS NULL').bind(agentId,p.subject).first<{id:string;paused:number}>();
  if(!agent)throw new DomainError('not_found',404,'Inbox unavailable');
  const subscriptions=await env.DB.prepare('SELECT status,expires_at,verified_at FROM subscriptions WHERE owner_subject=? AND agent_id=? ORDER BY created_at DESC,id LIMIT ?').bind(p.subject,agentId,LIMIT+1).all<{status:string;expires_at:number;verified_at:number}>();
  const deliveries=await env.DB.prepare(`SELECT d.state FROM deliveries d JOIN subscriptions s ON s.id=d.subscription_id WHERE s.owner_subject=? AND s.agent_id=? AND d.state IN('pending','retrying','suspended') ORDER BY d.id LIMIT ?`).bind(p.subject,agentId,LIMIT+1).all<{state:string}>();
  const receipt=await env.DB.prepare(`SELECT MAX(d.accepted_at) AS accepted_at FROM deliveries d JOIN subscriptions s ON s.id=d.subscription_id WHERE s.owner_subject=? AND s.agent_id=? AND d.state='accepted'`).bind(p.subject,agentId).first<{accepted_at:number|null}>();
  const rows=subscriptions.results.slice(0,LIMIT).map(s=>({status:effectiveSubscriptionStatus({status:s.status,expiresAt:s.expires_at},now),expiresAt:s.expires_at,verified:s.verified_at>0}));
  const active=await env.DB.prepare("SELECT id FROM subscriptions WHERE owner_subject=? AND agent_id=? AND status='active' AND verified_at>0 AND typeof(expires_at) IN('integer','real') AND expires_at>? LIMIT 1").bind(p.subject,agentId,now).first<{id:string}>();
  const live=!!active;
  const messages=await env.DB.prepare("SELECT id FROM messages WHERE to_agent_id=? AND kind='request' AND state IN('pending','claimed') AND content_deleted_at IS NULL AND expires_at>? ORDER BY cursor LIMIT ?").bind(agentId,now,LIMIT+1).all<{id:string}>();
  const counts=deliveries.results.slice(0,LIMIT);
  return {agentId,observedAt:now,paused:agent.paused===1,monitoringActive:!agent.paused&&live,subscriptions:rows,subscriptionsComplete:subscriptions.results.length<=LIMIT,actionableMessages:{count:Math.min(messages.results.length,LIMIT),complete:messages.results.length<=LIMIT,limit:LIMIT,scope:'unexpired_pending_or_claimed_requests; current counterpart permissions are not evaluated'},deliveryCounts:{pending:counts.filter(d=>d.state==='pending'||d.state==='retrying').length,suspended:counts.filter(d=>d.state==='suspended').length,complete:deliveries.results.length<=LIMIT,limit:LIMIT,unit:'delivery_receipts'},lastCallbackReceipt:receipt?.accepted_at?{acceptedAt:receipt.accepted_at,meaning:'HTTP callback accepted; host wake and message processing remain unknown'}:null,nextAction:agent.paused?'owner_unpause_inbox_then_resume_native_host_events':!live?'resume_native_host_events':'verify_native_host_monitoring_and_reconcile_pending_work',guidance:'Resume Events in the selected native host connection. An explicit saved cursor requests eligible replay; null or absent cursor starts now. Reconcile skipped historical work explicitly. Authentication and callback acceptance do not establish host wake or processing.'};
 }catch(error){if(error instanceof DomainError)throw error;throw new DomainError('storage_unavailable',503,'Monitoring status unavailable');}
}
