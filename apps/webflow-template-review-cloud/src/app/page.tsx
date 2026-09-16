import { TEMPLATE_REVIEW_UPSTREAM_ORIGIN } from '../proxy';

export default function Home() {
  return (
    <main>
      <p className="eyebrow">CREATE SOMETHING · Webflow Cloud</p>
      <h1>Webflow Template Review MCP</h1>
      <p className="summary">
        A transparent Webflow Cloud origin for the reviewer-scoped Template Review workflow.
      </p>
      <dl>
        <div>
          <dt>MCP endpoint</dt>
          <dd><code>/mcp</code></dd>
        </div>
        <div>
          <dt>OAuth discovery</dt>
          <dd><code>/.well-known/oauth-protected-resource</code></dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>Transparent proxy to <code>{TEMPLATE_REVIEW_UPSTREAM_ORIGIN}</code></dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd><a href="/health">Read live adapter and upstream status</a></dd>
        </div>
      </dl>
    </main>
  );
}
