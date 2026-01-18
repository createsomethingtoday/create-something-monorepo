# Agent Principles & Workflow

This project uses **bd** (beads) for agent-native issue tracking. Run `bd onboard` to get started.

## Guiding Principle: The Work Must Remain Connected

The central discipline of our agent workflow is ensuring that all work remains connected to the whole. Stranded local changes, untracked tasks, and un-pushed commits represent a disconnection from the project's shared reality. They obscure the true state of the work.

The following workflow is designed to enforce this principle. Each step is an act of reconnection.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Session Completion: "Landing the Plane"

Ending a work session is a critical process of reconnection. The goal is to leave the project in a perfectly clear and understandable state for the next contributor (whether human or agent).

### The Workflow of Reconnection

1.  **File issues for remaining work**
    *   **Principle:** Remove obscurity.
    *   **Rationale:** All discovered tasks must be captured in the shared `beads` system. Ideas or follow-ups that exist only in a local context are disconnected and will be lost.

2.  **Run quality gates**
    *   **Principle:** Serve the whole.
    *   **Rationale:** Tests, linters, and builds ensure that your changes integrate correctly with the entire system. A change that breaks another part of the system is a form of disconnection.

3.  **Update issue status**
    *   **Principle:** Remove obscurity.
    *   **Rationale:** The `beads` system must accurately reflect the state of the work. Closing finished tasks and updating progress removes ambiguity about what has been done and what remains.

4.  **Push to remote**
    *   **Principle:** The work must remain connected.
    *   **Rationale:** This is the most critical act of reconnection. Work that exists only on your local machine is stranded. It is invisible to the rest of the project and effectively does not exist. You must push your changes and verify they are integrated with the remote.
    *   **Workflow:**
        ```bash
        git pull --rebase
        bd sync
        git push
        git status  # MUST show "up to date with origin"
        ```

5.  **Clean up**
    *   **Principle:** "Less, but better."
    *   **Rationale:** Remove unnecessary artifacts from your session, such as temporary stashes or remote branches. This reduces clutter and leaves a clean environment for the next session.

6.  **Hand off**
    *   **Principle:** Make the work understandable.
    *   **Rationale:** Provide clear context for the next contributor. This reconnects your completed work with the future of the project, ensuring a smooth continuation of the hermeneutic circle.

### Core Disciplines

-   **Work is only complete when it is pushed.**
    *   **Rationale:** An un-pushed change is a disconnected artifact. Connection is achieved only when the work is integrated with the `origin`.

-   **The agent must complete the push.**
    *   **Rationale:** To remove ambiguity, the agent responsible for the work is also responsible for reconnecting it. Handing off a push is a transfer of responsibility that can lead to disconnection.

-   **If a push fails, you must resolve it.**
    *   **Rationale:** A failed push is a clear signal of disconnection. You must diagnose the conflict (e.g., merge conflicts, failed checks) and resolve it to successfully reconnect your work to the whole.
