import { Template } from 'e2b';

export const TEMPLATE_REVIEW_BROWSER_TEMPLATE = 'webflow-template-review-browser-v1';
export const PLAYWRIGHT_BROWSERS_PATH = '/opt/ms-playwright';

/**
 * Browser-ready E2B image for the fixed published-site evidence collector.
 * The MCP Worker never exposes a shell or caller-provided program; this image
 * only avoids installing Chromium during each short-lived evidence run.
 */
export const templateReviewBrowserTemplate = Template()
  .fromTemplate('code-interpreter-v1')
  .pipInstall('playwright')
  .runCmd(
    `sudo env PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH} python -m playwright install --with-deps chromium`,
  )
  .runCmd(`sudo chmod -R a+rX ${PLAYWRIGHT_BROWSERS_PATH}`)
  .setEnvs({ PLAYWRIGHT_BROWSERS_PATH });
