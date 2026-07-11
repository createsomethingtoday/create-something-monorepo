import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createGuardLabMcpServer } from './server.js';
import { labStore } from '../lib/server/store.js';

async function connect(scope: Parameters<typeof createGuardLabMcpServer>[1]) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createGuardLabMcpServer(labStore, scope);
  const client = new Client({ name: 'guard-lab-parity', version: '0.1.0' }, { capabilities: {} });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

const operator = await connect({ role: 'operator' });
try {
  const reset = await operator.client.callTool({ name: 'guard_reset_workspace', arguments: { confirm: 'RESET' } });
  const created = await operator.client.callTool({ name: 'guard_create_player', arguments: { name: 'Codex Parity Player' } });
  const createdContent = created.structuredContent as { workspace?: { selectedPlayerId?: string } };
  const playerId = createdContent.workspace?.selectedPlayerId;
  if (reset.isError || created.isError || !playerId) throw new Error('Operator MCP could not establish the clean parity workspace.');

  const stat = await operator.client.callTool({ name: 'guard_register_evidence', arguments: {
    kind: 'stat-line', title: 'Official NCAA Division I statistics index', sourceLabel: 'NCAA',
    sourceUrl: 'https://www.ncaa.com/stats/basketball-men/d1', level: 'college',
    observation: 'Official collegiate statistics source saved for later review; no comparison or ranking inferred.'
  } });
  const receipt = await operator.client.callTool({ name: 'guard_save_receipt', arguments: {
    date: '2026-07-11', strength: 'Named the helper before choosing the finish',
    nextFocus: 'Hold the first defender with pace', playerWords: 'I saw the nail step before my second dribble'
  } });
  if (stat.isError || receipt.isError) throw new Error('Operator MCP could not save the parity evidence and receipt.');

  const player = await connect({ role: 'player', playerId });
  try {
    const tools = await player.client.listTools();
    const film = await player.client.callTool({ name: 'guard_register_evidence', arguments: {
      kind: 'video-highlight', title: 'Illinois event video source', sourceLabel: 'IHSA',
      sourceUrl: 'https://www.ihsa.org/Resources/Media/Watch-Events', level: 'high-school', jurisdiction: 'Illinois',
      observation: 'Official state event video index saved for a later source review; the video is linked, not copied.'
    } });
    const engagement = await player.client.callTool({ name: 'guard_record_engagement', arguments: { stage: 'help', status: 'active', source: 'player', note: 'Asked Codex to review the first helper before the next session.' } });
    const workspace = await player.client.callTool({ name: 'guard_get_workspace', arguments: {} });
    const playerContent = workspace.structuredContent as { workspace?: { players?: unknown[]; receipts?: unknown[]; artifacts?: unknown[]; engagements?: unknown[] } };
    if (film.isError || engagement.isError || workspace.isError || tools.tools.some((tool) => ['guard_create_player', 'guard_reset_workspace'].includes(tool.name))) throw new Error('Player MCP capability isolation failed.');
    if (playerContent.workspace?.players?.length !== 1 || playerContent.workspace?.receipts?.length !== 1 || playerContent.workspace?.artifacts?.length !== 2 || playerContent.workspace?.engagements?.length !== 1) throw new Error('Player MCP data isolation or parity counts failed.');
    console.log(JSON.stringify({ ok: true, playerId, operatorWrites: { stat: !stat.isError, receipt: !receipt.isError }, playerTools: tools.tools.map((tool) => tool.name), playerWorkspace: playerContent.workspace }, null, 2));
  } finally {
    await player.client.close();
    await player.server.close();
  }
} finally {
  await operator.client.close();
  await operator.server.close();
}
