import { fileURLToPath } from 'node:url';

// Pure rendering/consent fixtures only. Subscription delivery is mocked in its test.
const root = fileURLToPath(new URL('../', import.meta.url));
export default {
  root,
  resolve: {
    alias: {
      '@create-something/canon/performance/email':
        root + 'packages/canon/src/lib/performance/email.ts'
    }
  },
  test: {
    include: [
      'packages/canon/src/lib/performance/email.test.ts',
      'packages/canon/test/contact-*.test.ts',
      'packages/canon/src/lib/newsletter/subscribe.test.ts',
      'packages/canon/src/lib/newsletter/reengagement-email.test.ts'
    ],
    pool: 'forks',
    maxWorkers: 1
  }
};
