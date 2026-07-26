# Operator Instructions

Use plain-language methodology for runbooks, onboarding, navigation, policies, and any artifact that asks a reader to act.

## Opening Contract

Establish these elements before architecture, history, or optional paths:

1. **Outcome:** State what the reader will accomplish.
2. **Use when:** Name the situation this path fits and the cases it does not.
3. **Prerequisites:** List what must already be true, available, or approved.
4. **First action:** Give one recommended starting action.
5. **Expected result:** Describe the visible output or state that confirms the action worked.
6. **Recovery:** Place the likely failure and next safe action beside the step that can fail.
7. **Completion proof:** Name the command, state, receipt, or observation that proves the task is done.

Do not force every short instruction into seven headings. Preserve the sequence and combine adjacent elements when the result stays easy to scan.

## Step Grammar

- Start each step with one imperative action.
- Put one primary action in each numbered step.
- Place commands immediately after the sentence that introduces them.
- Follow a command with its expected result when success is not self-evident.
- Put warnings before the risky action.
- Put recovery guidance next to the failure it resolves.
- Distinguish required steps from optional improvements.
- End with verification, not with background explanation.

## Choice and Navigation

Give one recommended path first. Explain why it is the default in one sentence. Move alternatives into a later section named for the condition that requires them.

For an index or documentation map:

- ask what task brought the reader here
- route each task to one starting document
- distinguish a starting point from supporting references
- hide exhaustive inventories behind a secondary catalog
- avoid asking a junior reader to synthesize several canonical documents before acting

## Progressive Disclosure

Order material by reader need:

1. usable path
2. safety and decision boundaries
3. expected evidence
4. alternatives and edge cases
5. architecture, rationale, and history

Move architecture earlier only when the reader must understand it to avoid an unsafe or irreversible action.

## Operator Test

Ask a reviewer to simulate the instructions without supplying missing context. They should be able to answer:

- Where am I?
- Is this the right path?
- What do I do first?
- What should happen?
- What do I do if it does not?
- What proves I am finished?
