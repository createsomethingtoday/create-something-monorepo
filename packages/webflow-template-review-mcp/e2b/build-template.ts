import { Template, defaultBuildLogger } from 'e2b';

import {
  TEMPLATE_REVIEW_BROWSER_TEMPLATE,
  templateReviewBrowserTemplate,
} from './template.js';

const templateName = process.env.E2B_BROWSER_TEMPLATE?.trim() || TEMPLATE_REVIEW_BROWSER_TEMPLATE;

const build = await Template.build(templateReviewBrowserTemplate, templateName, {
  cpuCount: 2,
  memoryMB: 2048,
  onBuildLogs: defaultBuildLogger({ minLevel: 'info' }),
});

console.log(
  JSON.stringify({
    status: 'ready',
    templateName: build.name,
    templateId: build.templateId,
    buildId: build.buildId,
  }),
);
