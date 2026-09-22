const fail = (m) => {
  throw new Error(m);
};
export function validateAnswer(answer, question) {
  if (!answer || answer.type !== question.type) fail('Unexpected answer type');
  if (question.type === 'noul') {
    if (
      typeof answer.noul !== 'number' ||
      !Number.isFinite(answer.noul) ||
      answer.noul < 0 ||
      answer.noul > 1
    )
      fail('Invalid Noul probability');
  } else if (question.type === 'choice') {
    const keys = Object.keys(question.criteria ?? {}),
      p = answer.probabilities;
    if (
      !keys.length ||
      !keys.includes(answer.choice) ||
      !p ||
      Object.keys(p).length !== keys.length ||
      keys.some(
        (k) => typeof p[k] !== 'number' || !Number.isFinite(p[k]) || p[k] < 0 || p[k] > 1
      ) ||
      Math.abs(keys.reduce((s, k) => s + p[k], 0) - 1) > 1e-6
    )
      fail('Invalid Choice distribution');
    if (
      typeof answer.confidence !== 'number' ||
      !Number.isFinite(answer.confidence) ||
      answer.confidence < 0 ||
      answer.confidence > 1 ||
      p[answer.choice] < Math.max(...keys.map((k) => p[k]))
    )
      fail('Invalid Choice confidence or winner');
  } else fail('Unsupported primitive');
  return structuredClone(answer);
}
export function validateResponse(response, questions) {
  if (typeof response?.model !== 'string' || !response.model.trim()) fail('Missing served model');
  if (!response.answers || Object.keys(response.answers).length !== Object.keys(questions).length)
    fail('Answer matrix mismatch');
  for (const [id, q] of Object.entries(questions)) validateAnswer(response.answers[id], q);
  return structuredClone(response);
}
export async function askJev({
  apiKey,
  request,
  reserve,
  fetchImpl = fetch,
  timeoutMs = 15000,
  maxBytes = 20000
}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) fail('Missing TypeSafe credential');
  if (typeof reserve !== 'function') fail('Budget reservation required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) fail('Invalid timeout');
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 20000)
    fail('Invalid payload bound');
  const snapshot = structuredClone(request);
  if (
    snapshot.state === undefined ||
    snapshot.state === null ||
    !['string', 'object'].includes(typeof snapshot.state) ||
    snapshot.model !== 'jev-latest' ||
    !snapshot.questions ||
    !Object.keys(snapshot.questions).length ||
    Object.keys(snapshot.questions).length > 16
  )
    fail('Invalid bounded request');
  for (const q of Object.values(snapshot.questions)) {
    if (
      !['noul', 'choice'].includes(q.type) ||
      typeof q.instructions !== 'string' ||
      !q.instructions.trim()
    )
      fail('Invalid question');
    if (
      q.type === 'choice' &&
      (!q.criteria ||
        Array.isArray(q.criteria) ||
        Object.keys(q.criteria).length < 2 ||
        Object.values(q.criteria).some((value) => value !== null && typeof value !== 'string'))
    )
      fail('Invalid choices');
  }
  const body = JSON.stringify(snapshot);
  if (new TextEncoder().encode(body).length > maxBytes) fail('Payload limit exceeded');
  // Caller owns durable, atomic budget storage. Reservation must precede network activity.
  const granted = await reserve({
    maximumUsd: 0.01,
    requestBytes: new TextEncoder().encode(body).length
  });
  if (granted !== true) fail('Budget denied');
  const start = performance.now();
  try {
    const r = await fetchImpl('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!r.ok)
      return {
        status: 'unavailable',
        reason: `http_${r.status}`,
        latencyMs: performance.now() - start
      };
    const response = validateResponse(await r.json(), snapshot.questions);
    return { status: 'ok', response, latencyMs: performance.now() - start };
  } catch {
    return {
      status: 'unavailable',
      reason: 'transport_or_response_invalid',
      latencyMs: performance.now() - start
    };
  }
}
