import { createEmbedder, createReranker } from '../src/bindings.js';
import type { EmbedKind } from '../src/types.js';

export default {
  async fetch(request: Request, env: { AI: Ai }): Promise<Response> {
    if (request.method !== 'POST') return new Response('POST { texts, kind, model }', { status: 405 });
    const { texts, kind, model, rerankQuery } = (await request.json()) as { texts: string[]; kind: EmbedKind; model?: string; rerankQuery?: string };
    try {
      if (rerankQuery !== undefined) return Response.json({ scores: await createReranker(env.AI, model).rerank(rerankQuery, texts) });
      return Response.json({ data: await createEmbedder(env.AI, model).embed(texts, kind) });
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 502 });
    }
  },
};
