let state, pending;
let repositoryDefaultsApplied=false;
const $ = (id) => document.getElementById(id);
const notice = (message) => {
  $("notice").textContent = message;
};
const elem = (tag, text, className) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
};
const anchor = () => ({
  page: state.source.page,
  component: state.source.component,
  baseVersion: state.source.version,
  baseHash: state.sourceHash,
});
async function refresh() {
  const r = await fetch("/api/context");
  if (!r.ok) throw Error("Context unavailable");
  state = await r.json();
  render();
}
async function send(path, body) {
  const key = JSON.stringify({ path, body });
  if (!pending || pending.key !== key)
    pending = { key, id: crypto.randomUUID() };
  const r = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Review-CSRF": state.csrf,
    },
    body: JSON.stringify({
      ...body,
      requestId: pending.id,
      ...(path === "/api/tools/call"
        ? { arguments: { ...body.arguments, requestId: pending.id } }
        : {}),
    }),
  });
  const data = await r.json();
  if (!r.ok) throw Error(`${data.error}. ${data.recovery}`);
  await refresh();
  pending = null;
  return data;
}
async function run(fn) {
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    await fn();
  } catch (e) {
    notice(e.message);
  } finally {
    document.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}
function action(label, fn) {
  const b = elem("button", label);
  b.onclick = () => run(fn);
  return b;
}
function render() {
  if (state.repositoryMode) {
    $("intro-copy").textContent =
      "Request an edit on an exact source version. Review the agent proposal, approve its content, then apply it to the local synthetic repository.";
    $("application-boundary").textContent =
      "Application creates an approved commit in the isolated synthetic Git repository. Deployment and real MaverickX content remain unchanged.";
    $('agent-explanation').textContent='Claude Code and Codex can submit proposals through stdio MCP. This form manually exercises the same bounded operation.';
    $('preview-subtitle').textContent=state.source.subtitle;
    document.querySelector('footer').textContent='Request → Agent proposal → Exact review → Approved source commit → Separate deployment';
    if (!repositoryDefaultsApplied) {
      $("replacement").value = "Chemistry engineered for measurable outcomes.";
      repositoryDefaultsApplied=true;
    }
  }
  $("anchor").textContent =
    `${state.source.page} · ${state.source.component} · Version ${state.source.version} · ${state.sourceHash.slice(0, 12)}`;
  if (state.repositoryMode)
    $("anchor").textContent +=
      ` · Commit ${state.source.baseCommit.slice(0, 12)} · Content ${state.source.contentHash.slice(0, 12)}`;
  $("headline").textContent = state.source.text;
  $("feedback-list").replaceChildren();
  $("feedback-id").replaceChildren();
  for (const f of [...state.feedback].reverse()) {
    const row = elem("div", undefined, "item");
    row.append(
      elem("span", `Feedback · Version ${f.baseVersion}`, "badge"),
      elem("p", f.text),
    );
    $("feedback-list").append(row);
    if (f.baseHash === state.sourceHash) {
      const option = elem("option", f.text.slice(0, 90));
      option.value = f.id;
      $("feedback-id").append(option);
    }
  }
  if (!state.feedback.length)
    $("feedback-list").append(
      elem("p", "No feedback yet. Save a note to start a proposal.", "meta"),
    );
  $("proposals").replaceChildren();
  for (const q of [...state.proposals].reverse()) {
    const stale =
      q.content.baseHash !== state.sourceHash && q.status !== "promoted";
    const card = elem("article", undefined, "item");
    card.append(
      elem("span", `${q.status}${stale ? " · stale base" : ""}`, "badge"),
      elem("h3", "Headline revision"),
      elem("p", q.content.reason),
    );
    const diff = elem("div", undefined, "diff");
    diff.append(
      elem("p", `Before: ${q.content.before}`),
      elem("p", `After: ${q.content.after}`, "after"),
    );
    card.append(diff);
    card.append(
      elem(
        "p",
        `Version ${q.content.baseVersion} · Content ${q.digest.slice(0, 12)} · One text field · 0 provider calls`,
        "meta",
      ),
    );
    const evidence = elem("details");
    evidence.append(
      elem("summary", "Inspect exact content & evidence"),
      elem("pre", JSON.stringify(q, null, 2)),
    );
    card.append(evidence);
    const actions = elem("div", undefined, "actions");
    const review = (decision) => async () => {
      await send("/api/review", { id: q.id, digest: q.digest, decision });
      notice(
        decision === "approved"
          ? "Exact content approved. Local promotion is a separate action."
          : "Proposal rejected. Create a new proposal to revise it.",
      );
    };
    if (q.status === "pending" && !stale)
      actions.append(action("Approve exact content", review("approved")));
    if (q.status === "pending")
      actions.append(action("Reject proposal", review("rejected")));
    if (q.status === "approved" && (!stale || q.recoveryReceipt))
      actions.append(
        action(
          q.recoveryReceipt
            ? "Recover application receipt"
            : state.repositoryMode
              ? "Apply approved source edit"
              : "Promote to local handoff",
          async () => {
            await send("/api/promote", { id: q.id, digest: q.digest });
            notice(
              state.repositoryMode
                ? "Approved source commit and receipt recorded. No deployment occurred."
                : "Local handoff recorded. No repository files or deployment changed.",
            );
          },
        ),
      );
    if (stale && !q.recoveryReceipt)
      actions.append(
        elem(
          "p",
          "The source version changed. Leave fresh feedback and create a new proposal.",
          "meta",
        ),
      );
    card.append(actions);
    $("proposals").append(card);
  }
  if (!state.proposals.length)
    $("proposals").append(
      elem(
        "p",
        "No proposals yet. The proposed copy and its exact diff will appear here.",
        "meta",
      ),
    );
  $("handoffs").replaceChildren();
  for (const h of state.outbox) {
    const d = elem("details");
    d.append(
      elem(
        "summary",
        h.commit
          ? `Applied source commit · ${h.commit.slice(0, 12)}`
          : `Local source handoff · ${h.digest.slice(0, 12)}`,
      ),
      elem("pre", JSON.stringify(h, null, 2)),
    );
    $("handoffs").append(d);
  }
  $("receipts").textContent = JSON.stringify(state.receipts, null, 2);
}
$("refresh").onclick = () =>
  run(async () => {
    await refresh();
    notice("Latest source and review state loaded.");
  });
$("feedback-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    await send("/api/feedback", { ...anchor(), text: $("feedback").value });
    $("feedback").value = "";
    notice("Feedback saved against this exact version.");
  });
};
$("proposal-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    if (!$("feedback-id").value)
      throw Error("Save feedback on the current version first.");
    await send("/api/tools/call", {
      name: "proposal.create",
      arguments: {
        ...anchor(),
        feedbackId: $("feedback-id").value,
        replacement: $("replacement").value,
        reason: $("reason").value,
      },
    });
    notice("Proposal ready for review. Nothing has been approved.");
  });
};
Promise.all([
  refresh(),
  fetch("/api/contract")
    .then((r) => r.json())
    .then((c) => {
      $("contract").textContent = JSON.stringify(c, null, 2);
    }),
]).catch((e) => notice(e.message));
