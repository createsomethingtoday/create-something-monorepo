import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function rewriteMediaPath(request: { url?: string }) {
  if (request.url?.startsWith('/media/')) request.url = request.url.replace('/media/', '/assets/');
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'halfdozen-local-media-routes',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          rewriteMediaPath(request);
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((request, _response, next) => {
          rewriteMediaPath(request);
          next();
        });
      }
    }
  ],
  server: {
    host: '0.0.0.0'
  },
  preview: {
    host: '0.0.0.0'
  }
});
