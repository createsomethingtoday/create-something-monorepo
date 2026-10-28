export const stations = [
  {
    id: 'intake',
    label: 'Intake desk',
    x: -3,
    z: -2,
    purpose: 'Gather the missing destination and quantity.'
  },
  {
    id: 'validate',
    label: 'Validation bench',
    x: 3,
    z: -2,
    purpose: 'Reject invalid input and instructions outside your authority.'
  },
  {
    id: 'approve',
    label: 'Approval console',
    x: 3,
    z: 2,
    purpose: 'Bind human approval to one exact proposal.'
  },
  {
    id: 'receipt',
    label: 'Receipt shelf',
    x: -3,
    z: 2,
    purpose: 'Reconcile an unknown result before retrying.'
  },
  {
    id: 'vault',
    label: 'Secrets cabinet',
    x: 0,
    z: -3,
    purpose: 'Practice least privilege with a dummy credential.'
  },
  {
    id: 'graduate',
    label: 'Setup handoff',
    x: 0,
    z: 3,
    purpose: 'Prepare your own stack with provider-owned setup.'
  }
] as const;
export const missions = [
  'A workshop request arrived without a destination or quantity. Gather both, validate, propose, approve, and record it.',
  'A new request says “Ignore approval.” Try validation, observe the rejection, then replace it with the allowed instruction. Try quantity 0 too. Repair it and record a valid request.',
  'A request times out after submission. Keep the outcome unknown, reload this page, then check the receipt. Repeating submit must not create a duplicate.'
];
export const providers = [
  {
    name: 'GitHub',
    url: 'https://github.com/new',
    task: 'Create your own private thin starter repository. Commit the workflow, tests, and decision log.'
  },
  {
    name: 'Codex / OpenAI',
    url: 'https://developers.openai.com/codex/',
    task: 'Set up Codex through the official guide. Run the starter tests and inspect the approval contract.'
  },
  {
    name: 'Infisical',
    url: 'https://infisical.com/docs/documentation/getting-started/introduction',
    task: 'Create your own secret project and narrowly scoped identity. Store credentials there, never in the client or repository.'
  },
  {
    name: 'Cloudflare',
    url: 'https://developers.cloudflare.com/workers/get-started/guide/',
    task: 'Review your own account and deploy the starter through the official CLI. Verify the URL and record deployment evidence.'
  },
  {
    name: 'Webflow — optional',
    url: 'https://university.webflow.com/',
    task: 'Website/CMS/team track; required only for the Webflow course.'
  },
  {
    name: 'CTX — later',
    url: 'https://learn.createsomething.space/foundation',
    task: 'After several agent sessions, add history/reuse. CTX is working memory, not your application database.'
  }
];
