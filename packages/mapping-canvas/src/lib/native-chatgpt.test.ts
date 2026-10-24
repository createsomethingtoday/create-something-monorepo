import { describe, expect, it } from 'vitest';
import { chatGPTDisconnectNotice, activeChatGPTAccount, canUseChatGPTPlan, chatGPTError, type ChatGPTStatus } from './native-chatgpt';
const state: ChatGPTStatus = { available: true, busy: false, activeClientId: 'selected', pendingClientIds: [], accounts: [{clientId:'other',subject:'other',email:'same@example.test',connected:true,planEnabled:true},{clientId:'selected',subject:'selected',email:'same@example.test',connected:true,planEnabled:false}] };
describe('ChatGPT authorization presentation', () => {
  it('does not borrow plan permission from another registration sharing an email', () => {
    expect(activeChatGPTAccount(state)?.subject).toBe('selected');
    expect(canUseChatGPTPlan(state)).toBe(false);
    expect(canUseChatGPTPlan({...state, activeClientId:'missing'})).toBe(false);
    expect(canUseChatGPTPlan({...state, activeClientId:'other'})).toBe(true);
  });
  it('requires a connected eligible idle runtime as well as a granted plan scope', () => {
    for (const overrides of [{available:false},{busy:true},{accounts:[{clientId:'other',subject:'other',connected:false,planEnabled:true}]}]) expect(canUseChatGPTPlan({...state,activeClientId:'other',...overrides})).toBe(false);
  });
  it('does not echo raw token, authorization URL, or server diagnostic text into the UI', () => {
    for (const error of [new Error('access_token=synthetic-secret'), 'https://auth.openai.com/?id_token_hint=synthetic-secret', {detail:'synthetic-secret'}]) {
      expect(chatGPTError(error)).not.toContain('synthetic-secret');
      expect(chatGPTError(error)).toContain('retained');
    }
    expect(chatGPTError('USAGE_LIMIT')).toContain('No other billing method');
    expect(chatGPTError('REVOCATION_UNCONFIRMED')).toContain('Remote revocation was not confirmed');
  });
});

describe('disconnect receipt wording', () => {
  it('separates local removal from all remote outcomes without claiming invalidation', () => {
    for (const [remoteRevocation, phrase] of [['no_refresh_token','No refresh token'],['not_attempted_unverifiable','not attempted'],['request_succeeded','does not prove token invalidation'],['request_failed_or_unverifiable','failed or could not be verified']] as const) {
      const notice = chatGPTDisconnectNotice({localTokensRemoved:true,remoteRevocation});
      expect(notice).toContain('Local credentials removed'); expect(notice).toContain(phrase);
    }
  });
  it('never invents successful local removal or historical remote revocation without a receipt', () => {
    expect(chatGPTDisconnectNotice()).toContain('Local credential removal is unconfirmed');
    expect(chatGPTDisconnectNotice(null)).toContain('Remote revocation status is unknown');
    expect(chatGPTDisconnectNotice({localTokensRemoved:false,remoteRevocation:'request_succeeded'})).toContain('Local credential removal is unconfirmed');
  });
});
