export interface WorkflowWorkedExample {
  title: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  result: string;
  exception: string;
}

/** Authored fixtures for teaching. They do not describe client data or executed tools. */
export const workflowWorkedExamples: Record<string, WorkflowWorkedExample> = {
  'mcp-server-development': {
    title: 'A small support-tool contract', columns: ['Primitive', 'Allowed work', 'Boundary'],
    rows: [['Article resource', 'Read the current support article', 'Approved workspace only'], ['Draft tool', 'Prepare a reply from that article', 'Return a draft and source revision'], ['Send action', 'Wait for the responsible owner', 'Separate permission and approval']],
    result: 'Keep source lookup, drafting and sending as separate operations.',
    exception: 'If the article cannot be verified, return the missing source and pause. Do not send a plausible answer.'
  },
  'ai-workflow-automation': {
    title: 'Automate preparation, keep the decision', columns: ['Step', 'Before', 'Bounded change'],
    rows: [['Gather', 'Copy facts between tools', 'Read the permitted source once'], ['Prepare', 'Rewrite the same reply', 'Return a draft with source references'], ['Decide', 'Send without a visible check', 'Owner reviews before sending']],
    result: 'The proposed automation produces a draft, not an unreviewed customer reply.',
    exception: 'If two records disagree, keep both references and ask the owner which source is current.'
  },
  'ai-workflow-governance': {
    title: 'An action and approval matrix', columns: ['Action', 'Rule', 'Recorded result'],
    rows: [['Read approved article', 'May run within scope', 'Source and revision'], ['Draft a reply', 'May prepare; cannot send', 'Draft and evidence'], ['Send to customer', 'Needs owner approval', 'Owner, action and outcome']],
    result: 'Each action has a specific rule and a record to keep.',
    exception: 'A requested action outside this matrix stops with a reason. Changing the rule requires its own approval.'
  },
  'human-in-the-loop-ai': {
    title: 'What the reviewer receives', columns: ['Review field', 'Example', 'Why it matters'],
    rows: [['Proposed action', 'Send the prepared support reply', 'One decision, clearly named'], ['Supporting source', 'Current article, revision 2', 'The owner can inspect the basis'], ['Available choices', 'Approve, ask for evidence, stop', 'The next state follows the choice']],
    result: 'A reviewer sees the proposed action and evidence together.',
    exception: 'Without the current article, the useful choice is to request evidence. Approval cannot substitute for missing facts.'
  },
  'ai-agent-evaluation': {
    title: 'Two cases before more access', columns: ['Case', 'Expected behavior', 'Check'],
    rows: [['Current source available', 'Draft and cite the current revision', 'Source matches draft'], ['Source unavailable', 'Ask for evidence; do not send', 'No external action'], ['Duplicate request', 'Recognize the previous result', 'No duplicate send']],
    result: 'Success includes the denied and uncertain paths, not only the ordinary case.',
    exception: 'If a missing-source case produces a confident reply, the release check fails. Keep access unchanged and repair the behavior.'
  },
  'mcp-security-oauth': {
    title: 'Identity is not unlimited access', columns: ['Check', 'Example boundary', 'Outcome'],
    rows: [['Identity', 'A known operator in workspace A', 'Name the actor'], ['Scope', 'Read support articles in workspace A', 'Permit the scoped lookup'], ['Protected action', 'Send a customer reply', 'Require the separate action approval']],
    result: 'A valid connection still checks the workspace, scope and action.',
    exception: 'A request for workspace B is denied even when the token is valid for workspace A.'
  },
  'mcp-vs-api': {
    title: 'Choose from the calling task', columns: ['Caller', 'Smallest useful interface', 'Shared boundary'],
    rows: [['An assistant needs a lookup', 'A narrowly defined MCP resource or tool', 'Source ownership and scope'], ['A fixed server-to-server job', 'The existing API operation', 'Inputs, retries and permissions'], ['Both callers need the same rule', 'One owned business operation', 'Do not duplicate the authority rule']],
    result: 'The interface follows the caller; the business rule remains owned in one place.',
    exception: 'If an existing read-only export answers the task, avoid building either new integration until a gap is demonstrated.'
  },
  'webflow-marketplace-operations': {
    title: 'A review queue with separate owners', columns: ['Stage', 'Artifact', 'Next decision'],
    rows: [['Intake', 'Exact submission and version', 'Is the review ready?'], ['Checks', 'Repeatable findings with references', 'What needs human judgment?'], ['Review', 'Owner decision and required changes', 'Approve, return or escalate']],
    result: 'Evidence preparation and the final review decision stay separate.',
    exception: 'A missing reviewer or changed submission version returns the case to a clear owner instead of silently continuing.'
  },
  'webflow-app-review': {
    title: 'An exact-version evidence packet', columns: ['Evidence', 'Example record', 'Check'],
    rows: [['Submitted version', 'Build and installation instructions', 'Reviewer opens the intended build'], ['Access request', 'Scopes and data use explained', 'Permission matches the task'], ['Recovery', 'Denied, expired and disconnected states', 'Reviewer can recover or stop']],
    result: 'The packet identifies the same version across installation, permissions and recovery.',
    exception: 'If the build changes during review, identify the new version and repeat affected checks before making a decision.'
  },
  'webflow-template-review': {
    title: 'Checks support the reviewer', columns: ['Finding', 'Evidence', 'Authority'],
    rows: [['Repeatable check', 'Exact page and observed condition', 'Automation can gather'], ['Visual judgment', 'Rendered context and comparison', 'Qualified reviewer decides'], ['Correction', 'Version and follow-up evidence', 'Reviewer confirms the result']],
    result: 'The packet makes evidence inspectable without converting a check into final approval.',
    exception: 'An incomplete render or uncertain finding stays marked uncertain and goes to manual review.'
  },
  'workflow-mapping': {
    title: 'One task, mapped before tools', columns: ['Part', 'Example', 'Owner or boundary'],
    rows: [['Start', 'A support request arrives', 'Support lead owns the task'], ['Preparation', 'Read source and draft a reply', 'Approved articles only'], ['Decision and result', 'Review, then permit the send', 'Keep decision and reply reference']],
    result: 'The map names the input, work, decision, result and responsible person.',
    exception: 'A request outside the approved topic goes to the support lead. It does not gain permission through the map.'
  },
  'ai-workflow-observability': {
    title: 'A trace that explains the stop', columns: ['Event', 'Record', 'Meaning'],
    rows: [['Request received', 'Task reference and source revision', 'What started the work'], ['Evidence requested', 'Owner and missing source', 'Why the work waited'], ['Result preserved', 'No send; next owner identified', 'What happened and how to continue']],
    result: 'The trace connects the result to the source, decision and next owner.',
    exception: 'A missing outcome is an unresolved run, not a successful one. Preserve the last known state and investigate before retrying.'
  }
};
