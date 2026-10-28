let context;
let busy = false;
const pending = new Map();
const grants = new Map();
const byId = (id) => document.getElementById(id);
const element = (tag, text, cls) => {
  const e = document.createElement(tag);
  e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
const status = (text) => (byId("status").textContent = text);
async function request(path, args) {
  const response = await fetch(
    "/api/collaboration" + path,
    args
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
        }
      : {},
  );
  const body = await response.json();
  if (!response.ok)
    throw Error(
      body.error === "identity_required"
        ? "Sign in with your project account."
        : body.error,
    );
  return body;
}
async function refresh() {
  context = await request("");
  render();
}
async function action(key, path, args) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  let saved = false;
  key = JSON.stringify({ key, path, args });
  const existing = pending.get(key);
  const payload = existing ?? { ...args, requestId: crypto.randomUUID() };
  pending.set(key, payload);
  try {
    await request(path, payload);
    saved = true;
    pending.delete(key);
    status("Saved.");
    await refresh();
  } catch (e) {
    status(
      saved
        ? "Saved, but refresh failed. Use Refresh to reload."
        : e.message + " · Retry this action if the connection failed.",
    );
  } finally {
    busy = false;
    document.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}
function button(label, fn) {
  const b = element("button", label);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
async function targetHash() {
  const input = JSON.stringify(context.version.target);
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function connectAgent(task) {
  if (busy) return;
  busy = true;
  let grant = grants.get(task.id);
  if (!grant) {
    const token = 'cg_' + Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
    grant = { token, args: { requestId: crypto.randomUUID(), taskId: task.id, tokenHash } };
    grants.set(task.id, grant);
  }
  try {
    await request('/agent-connect', grant.args);
    status('Agent connection ready. Copy the task token into your agent’s secure MCP configuration.');
    await refresh();
  } catch (e) { status(e.message + ' · Retry connection with the same task.'); }
  finally { busy = false; }
}
function render() {
  byId("headline").textContent = context.version.text;
  const dl = byId("version");
  dl.replaceChildren();
  for (const [label, value] of [
    ["Source commit", context.version.sourceCommit],
    ["Deployment", context.version.deploymentId],
    ["Content version", context.version.kvContentHash],
    ["Preview destination", context.version.target.origin],
  ])
    dl.append(element("dt", label), element("dd", value));
  const notes = byId("feedback-list");
  notes.replaceChildren();
  for (const f of context.feedback) {
    const a = element("article", "");
    a.append(element("p", f.text));
    const task = [...context.jobs]
      .reverse()
      .find((j) => j.kind === "agent-proposal" && j.feedbackId === f.id);
    const expired =
      task?.status === "requested" && Math.min(task.expiresAt, task.grant?.expiresAt ?? task.expiresAt) <= Date.now();
    if (f.versionHash !== context.version.hash) {
      a.append(
        element(
          "p",
          "The preview changed. Save a new edit request against the current version.",
          "muted",
        ),
      );
    } else {
      if (task)
        a.append(
          element(
            "p",
            "Agent task " +
              (expired ? "expired" : task.status) +
              " · " +
              task.id,
            "muted",
          ),
        );
      if (task?.status === 'requested' && !expired && context.version.target.contentBinding === 'DB:collaboration_projects') {
        if (!task.grant) a.append(button('Connect Claude or Codex', () => connectAgent(task)));
        else if (grants.has(task.id)) {
          a.append(element('p', 'MCP endpoint: ' + task.grant.audience, 'muted'));
          a.append(button('Copy task token', async () => {
            try { await navigator.clipboard.writeText(grants.get(task.id).token); status('Task token copied. It cannot approve or publish.'); }
            catch { status('Clipboard unavailable. Reconnect from a browser with clipboard permission.'); }
          }));
        } else a.append(element('p', 'Agent connected. Token is held only in the browser that created it; request a new task after expiry if it was lost.', 'muted'));
      }
      if (!task || expired)
        a.append(
          button(
            expired ? "Request a new agent proposal" : "Request agent proposal",
            () =>
              action("agent:" + f.id, "/agent-request", {
                feedbackId: f.id,
                versionHash: f.versionHash,
              }),
          ),
        );
    }
    notes.append(a);
  }
  const proposals = byId("proposals");
  proposals.replaceChildren();
  if (!context.proposals.length)
    proposals.append(
      element("p", "No proposals yet. Agent proposals appear here for review."),
    );
  for (const q of context.proposals) {
    const a = element("article", "");
    a.append(
      element("p", q.status),
      element("p", q.content.before, "before"),
      element("p", q.content.after, "after"),
      element("p", q.content.reason),
      element("p", "Proposal " + q.digest, "muted"),
    );
    if (q.status === "proposed")
      for (const decision of ["approved", "rejected"])
        a.append(
          button(decision === "approved" ? "Approve this edit" : "Reject", () =>
            action("review:" + q.id, "/review", {
              id: q.id,
              digest: q.digest,
              decision,
            }),
          ),
        );
    if (
      q.status === "approved" &&
      !context.jobs.some((j) => j.kind === "preview" && j.proposalId === q.id)
    )
      a.append(
        button("Request preview", async () =>
          action("preview:" + q.id, "/preview", {
            id: q.id,
            digest: q.digest,
            targetHash: await targetHash(),
          }),
        ),
      );
    proposals.append(a);
  }
  const jobs = byId("jobs");
  jobs.replaceChildren();
  for (const j of context.jobs.filter((j) => j.kind === "preview")) {
    const a = element("article", "");
    a.append(
      element(
        "p",
        j.status === "verified"
          ? "Preview verified"
          : "Preview requested · awaiting executor",
      ),
      element("p", j.destination.origin),
      element("p", "Request " + j.id, "muted"),
    );
    if (context.version.target.contentBinding === "DB:collaboration_projects") {
      if (j.status === "awaiting-executor") a.append(button("Publish reviewed preview", () => action("publish:" + j.id, "/publish-preview", { jobId: j.id, digest: j.digest, targetHash: j.targetHash })));
      if (j.execution === "worker-snapshot-published") {
        const link = element("a", "Open reviewed preview"); link.href = "/collaboration/preview/" + j.id + "/"; a.append(link);
        const source = element("a", "Download source proposal"); source.href = "/collaboration/source/" + j.id + ".json"; a.append(source);
      }
    }
    if (j.evidence)
      a.append(
        element("p", "Source " + j.evidence.version.sourceCommit, "muted"),
      );
    jobs.append(a);
  }
  if (!jobs.children.length) jobs.append(element("p", "No preview requested."));
}
byId("feedback-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (context)
    action("feedback", "/feedback", {
      versionHash: context.version.hash,
      text: byId("feedback").value,
    });
});
byId("refresh").addEventListener("click", () =>
  refresh()
    .then(() => status("Up to date."))
    .catch((e) => status(e.message)),
);
refresh()
  .then(() => status("Project access verified."))
  .catch((e) => status(e.message));
