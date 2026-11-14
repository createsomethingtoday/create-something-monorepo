// Local visual/interaction harness. No credentials, provider calls, or persistent writes.
// Run the production Next server on :3174 first. Bind only the loopback interface.
import http from 'node:http';
const version = {
  versionId: 'rec12345678901234',
  versionNumber: 2,
  reviewStatus: '👀In Review',
  submissionDatetime: '2026-11-13T14:30:00Z',
  reviewer: { name: 'QA Reviewer' },
  zendeskTicketId: '123',
  reviewFeedback: 'Verify the offline bundle and the requested permissions.',
  rejectionFeedback: ''
};
const asset = {
  assetId: 'rec12345678901235',
  appName: 'QA Calendar Connector',
  appId: 'qa-only-connector',
  latestReviewStatus: version.reviewStatus,
  versionNumber: 2,
  submissionDatetime: version.submissionDatetime,
  reviewer: version.reviewer,
  descriptionShort:
    'Fictional submission for local UI verification. No developer will be contacted.'
};
const receipts = [];
let signedIn = true;
const bundles = [
  {
    id: '7fdc962c-dbc8-4f37-a452-088c4bd61db4',
    filename: 'qa-fixture.zip',
    appName: 'QA Calendar Connector',
    versionLabel: '2.0.0',
    sha256: 'a'.repeat(64),
    sizeBytes: 480,
    fileCount: 3
  }
];
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1:3175').pathname;
  if (path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (path === '/api/status') return res.end(JSON.stringify({ signInReady: true }));
    let data = {};
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      if (body && req.headers['content-type'] === 'application/json') data = JSON.parse(body);
    } catch {
      res.writeHead(400);
      return res.end('{}');
    }
    if (path === '/api/auth/logout') {
      signedIn = false;
      res.writeHead(204);
      return res.end();
    }
    if (!signedIn) {
      res.writeHead(401);
      return res.end(
        JSON.stringify({ error: { message: 'Sign in with your Webflow work account.' } })
      );
    }
    const result =
      path === '/api/session'
        ? {
            verificationFixture: true,
            user: { accountId: 'qa-only', email: 'qa@example.test', name: 'Local QA fixture' },
            capabilities: {
              queue: true,
              bundles: true,
              approve: true,
              reject: true,
              changes: true,
              message: true
            },
            analysisReady: true,
            model: 'gpt-6-astra'
          }
        : path === '/api/queue'
          ? { records: [{ ...asset, latestReviewStatus: version.reviewStatus }] }
          : path.startsWith('/api/assets/')
            ? { asset, versions: [version] }
            : path.startsWith('/api/thread/')
              ? {
                  thread: {
                    subject: 'QA fixture conversation',
                    status: 'open',
                    comments: [
                      {
                        id: 1,
                        createdAt: '2026-11-13T14:00:00Z',
                        author: { name: 'Fictional developer' },
                        body: 'The updated bundle is ready for review.',
                        attachments: []
                      }
                    ],
                    hasOlderComments: false
                  }
                }
              : path === '/api/bundles'
                ? { bundles }
                : path.startsWith('/api/bundles/')
                  ? {
                      bundle: bundles[0],
                      files: [
                        { path: 'manifest.json', sizeBytes: 56, readable: true, truncated: false },
                        { path: 'src/index.js', sizeBytes: 42, readable: true, truncated: false },
                        { path: 'README.md', sizeBytes: 66, readable: true, truncated: false }
                      ],
                      reports: [],
                      jobs: []
                    }
                  : path === '/api/activity'
                    ? receipts
                    : null;
    if (path === '/api/actions' && req.method === 'POST') {
      if (data.confirmed !== true) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: { message: 'Confirmation required.' } }));
      }
      const r = {
        id: data.id,
        action: data.action,
        target_id: data.versionId,
        status: 'completed',
        created_at: new Date().toISOString(),
        result_json: JSON.stringify({ simulated: true, developerMessageSent: false })
      };
      receipts.unshift(r);
      if (data.action === 'approve') version.reviewStatus = '✅Approved';
      if (data.action === 'reject') version.reviewStatus = '❌Rejected';
      if (data.action === 'changes') version.reviewStatus = '📤Changes Requested';
      return res.end(JSON.stringify(r));
    }
    if (result !== null) return res.end(JSON.stringify(result));
    res.writeHead(404);
    return res.end('{}');
  }
  const upstream = await fetch(`http://127.0.0.1:3174${req.url}`);
  const headers = new Headers(upstream.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  res.writeHead(upstream.status, Object.fromEntries(headers));
  res.end(Buffer.from(await upstream.arrayBuffer()));
});
server.listen(3175, '127.0.0.1', () =>
  console.log('Local fixture UI: http://127.0.0.1:3175 — all review actions simulated.')
);
