import { Template, waitForPort } from 'e2b';
import { fileURLToPath } from 'node:url';

export const BASE_IMAGE =
  'node@sha256:a25e59a5562406b0a4f34ce94ccad6c3902dcf3269b40e1fe12d881090c6f9be';
export const NODE_VERSION = '20.19.4';
export const PLAYWRIGHT_VERSION = '1.61.1';
export const RUNNER_PORT = 3_000;

export const runtimeTemplate = Template({
  fileContextPath: fileURLToPath(new URL('./context/', import.meta.url))
})
  .fromImage(BASE_IMAGE)
  .setUser('root')
  .setWorkdir('/app')
  .runCmd('npm init -y')
  .npmInstall([`playwright@${PLAYWRIGHT_VERSION}`])
  .runCmd('PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install --with-deps chromium')
  .copy(['server.mjs', 'runner.mjs'], '/app/', { mode: 0o500, user: 'root' })
  .runCmd(
    'chmod 0555 /app/server.mjs /app/runner.mjs && touch /tmp/app-review-runtime.log && chown user:user /tmp/app-review-runtime.log && chmod 0600 /tmp/app-review-runtime.log'
  )
  .setUser('user')
  .setWorkdir('/app')
  .setStartCmd('node /app/server.mjs', waitForPort(RUNNER_PORT));
