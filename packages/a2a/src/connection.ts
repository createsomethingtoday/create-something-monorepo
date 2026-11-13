import recoveryPolicy from '../docs/connection-recovery-policy.json';
/** Owned connection contract. Expectations never attest the host installation. */
import type { Principal } from './domain-types';
import type { RuntimeEnv } from './env';
export const CONNECTION = Object.freeze({
 id:'a2a-inbox',revision:'2026-11-13.1',bindingRevision:'renewable-0.1.2',
 expected:Object.freeze({client:'oauth_chatgpt_44e6fb875ebf',app:'asdk_app_6af688c38ffc8191a32e149b35c6c95e',plugin:'plugins_6af2716266c88191bebfb9bd3e74c4e7',release:'pluginrel_6af69941bbd88191b758785434f6559d',resource:'https://a2a.createsomething.agency/mcp'})
});
export function connectionStatus(env:RuntimeEnv,p?:Principal){
 return {connectionId:CONNECTION.id,contractRevision:CONNECTION.revision,bindingRevision:CONNECTION.bindingRevision,buildRevision:env.BUILD_REVISION,
  transport:{resource:env.AUTH_RESOURCE,issuer:env.IDENTITY_ISSUER,protocolVersion:'2025-03-26'},
  binding:{expected:CONNECTION.expected,observed:'unknown',expectationApplies:env.AUTH_RESOURCE===CONNECTION.expected.resource},
  ...(p?{principal:{subject:p.subject},allowedOperations:[...(p.scopes.includes('a2a:read')?['read','connection_status']:[]),...(p.scopes.includes('a2a:read')&&p.scopes.includes('a2a:write')?['send','claim','finish']:[])],renewal:{hostRefresh:'unknown',consent:'unknown',serverAuthentication:'confirmed',identityAudit:p.renewal??'unknown'},nextAction:'none'}:{nextAction:'authenticate_for_owner_status'})};
}
export interface RecoveryInput {status?:number;code?:string;write?:boolean;uncertain?:boolean;attempt?:number;retryAfter?:string|null;now?:number;}
/** Advice only: never runs retries or changes consent. attempt is zero-based. */
export function recoveryAction(input:RecoveryInput){
 const {status,code}=input;
 if(status===403||code==='revoked'||code==='access_denied')return {action:'stop' as const};
 if(input.write&&input.uncertain)return {action:'reconcile' as const};
 if(status===401||code==='invalid_grant'||code==='consent_required')return {action:'owner_action_required' as const};
 if((status===429||status===502||status===503||status===504||status===undefined)&&!input.write){
  const attempt=input.attempt??0;if(!Number.isInteger(attempt)||attempt<0||attempt>=recoveryPolicy.maxAttempts)return {action:'stop' as const};
  const raw=input.retryAfter;let delay=2**attempt*1000;
  if(raw){const parsed=/^\d+$/.test(raw)?Number(raw)*1000:Date.parse(raw)-(input.now??Date.now());if(Number.isFinite(parsed))delay=Math.max(delay,parsed);}
  // Never shorten a provider's required wait. An excessive wait exits this bounded loop.
  if(delay>recoveryPolicy.maxDelayMs)return {action:'stop' as const};
  return {action:'retry_after' as const,delayMs:Math.max(0,delay),maxAttempts:recoveryPolicy.maxAttempts};
 }
 return {action:'stop' as const};
}
export function executionReceipt(operation:string,outcome:'confirmed'|'denied'|'unknown',requestId=crypto.randomUUID()){
 return {requestId,operation,connectionId:CONNECTION.id,contractRevision:CONNECTION.revision,bindingRevision:CONNECTION.bindingRevision,timestamp:new Date().toISOString(),outcome};
}
