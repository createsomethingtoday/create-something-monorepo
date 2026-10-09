let context;
let busy = false;
const pending = new Map();
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
      task?.status === "requested" && task.expiresAt <= Date.now();
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
