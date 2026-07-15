import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    watch: {
      // Managed client projects run their own preview process. Their generated
      // files and edits must refresh the preview, not reload the control shell.
      ignored: ['**/clients/**']
    }
  }
});
