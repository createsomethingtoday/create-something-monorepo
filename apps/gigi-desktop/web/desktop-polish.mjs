import { escapeHtml as safe } from './reference-layout.mjs';

// Presentation only: preserve custom statuses and all persisted values.
const statusLabels = { ready_for_review: 'Ready for review', in_progress: 'In progress', not_started: 'Not started', on_hold: 'On hold', to_do: 'To do', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', open: 'Open', expected: 'Expected', invoiced: 'Invoiced', overdue: 'Overdue', paid: 'Paid' };
export function statusLabel(value) {
  const text = String(value ?? '').trim();
  return Object.hasOwn(statusLabels, text) ? statusLabels[text] : text;
}
export function peopleShortcut(event, page, chatVisible) {
  return !chatVisible && (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'f' && (event.shiftKey || page === 'contacts');
}
export function todaySummary(data) {
  return `<nav class="today-summary" aria-label="Today summary">${[['gigs','Upcoming work'],['tasks','Open tasks'],['finances','Unpaid records']].map(([entity,title]) => `<button class="btn text" data-page="${entity}"><strong>${safe(data[entity]?.count ?? 0)}</strong> ${title}</button>`).join('')}</nav>`;
}
export function builtInChatSetup(status, failed = false) {
  const ready = status?.available === true && status?.authenticated === true;
  const label = failed ? 'Check unavailable' : !status ? 'Not checked' : !status.available ? 'Codex unavailable' : !status.authenticated ? 'Sign in needed' : 'Codex signed in';
  const next = failed ? 'Could not check Codex on this Mac. Check again or open the setup guide.' : !status ? 'Check the Codex status on this Mac.' : !status.available ? 'Install the Codex CLI and sign in on this Mac, then check again.' : !status.authenticated ? 'Sign in to the Codex CLI with your ChatGPT account, then check again.' : 'Open Ask GiGi to start a conversation. Changes still require your review.';
  return `<section class="panel" id="built-in-chat"><div class="panel-head"><h2>Ask GiGi · built-in chat</h2><span class="tag ${ready ? '' : 'off'}">${label}</span></div><p>${next}</p><p class="muted">Uses your Codex subscription on this Mac. External-agent registration below is separate; local records need neither connection.</p><div class="inline-actions"><button class="btn ${ready ? 'primary' : ''}" data-chat-open="1">Open Ask GiGi</button><button class="btn" data-setup-chat-refresh="1">Check chat status</button>${ready ? '' : '<button class="btn text" data-help="codex-setup">Codex setup guide ↗</button>'}</div></section>`;
}
