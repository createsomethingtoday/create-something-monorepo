import { PreviewSession } from '../src/lib/server/preview/preview-session.js';
import { workspaceRegistry } from '../src/lib/server/workspaces/default-registry.js';

const preview = new PreviewSession({ workspace: workspaceRegistry.resolve('demo-frontend') });

try {
  const status = await preview.start();
  const response = await preview.proxy(
    new Request(`http://workspace.test${status.previewPath}`, { method: 'GET' })
  );
  const html = await response.text();
  if (!response.ok || !html.includes('Build what clients can see.')) {
    throw new Error('preview_smoke_failed');
  }
  console.log(
    JSON.stringify({
      state: status.state,
      previewPath: status.previewPath,
      initialHeadlineFound: true,
      internalOriginExposed: JSON.stringify(status).includes('127.0.0.1')
    })
  );
} finally {
  preview.close();
}
