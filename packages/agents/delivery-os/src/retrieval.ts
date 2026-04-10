import OpenAI, { toFile } from 'openai';

import type { DeliveryArtifactSyncDocument, DeliveryArtifactSyncResult } from './types.js';

export function buildArtifactMarkdown(document: DeliveryArtifactSyncDocument): string {
  const lines = [
    `# ${document.title}`,
    '',
    `artifact_id: ${document.artifactId}`,
    `client_id: ${document.clientId}`,
    `engagement_id: ${document.engagementId}`,
    `component_id: ${document.componentId ?? ''}`,
    `artifact_type: ${document.artifactType}`,
    `source_url: ${document.sourceUrl ?? ''}`,
    `last_updated_at: ${document.lastUpdatedAt ?? ''}`,
    '',
    document.body.trim()
  ];

  return lines.join('\n');
}

function sanitizeFileName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function uploadArtifactsToVectorStore(
  client: OpenAI,
  vectorStoreId: string,
  documents: DeliveryArtifactSyncDocument[]
): Promise<DeliveryArtifactSyncResult[]> {
  const results: DeliveryArtifactSyncResult[] = [];

  for (const document of documents) {
    const filename = `${sanitizeFileName(document.title || document.artifactId)}.md`;
    const markdown = buildArtifactMarkdown(document);
    const file = await client.files.create({
      file: await toFile(new TextEncoder().encode(markdown), filename),
      purpose: 'user_data'
    });

    await client.vectorStores.files.create(vectorStoreId, {
      file_id: file.id,
      attributes: {
        artifact_id: document.artifactId,
        client_id: document.clientId,
        engagement_id: document.engagementId,
        component_id: document.componentId ?? '',
        artifact_type: document.artifactType
      }
    });

    results.push({
      artifactId: document.artifactId,
      fileId: file.id,
      vectorStoreId
    });
  }

  return results;
}
