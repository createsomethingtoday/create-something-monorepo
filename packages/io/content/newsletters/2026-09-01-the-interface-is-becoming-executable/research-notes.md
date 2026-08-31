# Research notes: The interface is becoming executable

## Editorial decision

**Controlling idea:** The agent is moving closer to the work, so the operating contract is moving into the interface around it.

**Category sequence:**

1. Sites become tools — declaration.
2. Capabilities become packages — portability.
3. Workspaces become runtimes — isolation.
4. Proof becomes part of the interface — verification.

This sequence forms one system rather than four unrelated trend items.

## Category matrix

| Category | Current signal | Operator consequence | Boundary to retain |
| --- | --- | --- | --- |
| Sites become tools | OpenAI Site tools; WebMCP origin trial and challenge | Expose narrow application actions beside the human UI | Tool registration is not authorization; OpenAI currently supports only a subset of the proposal |
| Capabilities become packages | Agent Plugins 1.0.0 | Version skills, MCP servers, and operating references as one reviewable unit | The format does not define install trust, distribution, permissions, sandboxing, or provenance |
| Workspaces become runtimes | Codex and GitHub worktree-backed sessions | Give each agent task an owned starting state and isolated files | Isolation does not prove correctness or resolve final worktree disposition |
| Proof becomes interface | Oracle-signal research; browser-agent QA practice | Define expectations independently and preserve direct observations | A test file, coverage report, or agent screenshot alone is not completion |

## Primary sources

- OpenAI, [Site tools](https://learn.chatgpt.com/docs/webmcp), current documentation retrieved August 31, 2026.
- OpenAI, [WebMCP Challenge](https://openai.com/webmcp-challenge/), August 25–September 3, 2026.
- Chrome for Developers, [WebMCP](https://developer.chrome.com/docs/ai/webmcp), published May 18 and updated August 7, 2026.
- Chrome for Developers, [Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), updated August 20, 2026.
- Chrome for Developers, [Secure WebMCP tools](https://developer.chrome.com/docs/ai/webmcp/secure-tools), updated July 1, 2026.
- Web Machine Learning Community Group, [WebMCP draft](https://webmachinelearning.github.io/webmcp), draft report dated August 26, 2026.
- Google Developers Blog, [Agent Plugins package your skills, tools, and more](https://developers.googleblog.com/en/agent-plugins-package-your-skills-tools-and-more/), August 6, 2026.
- Agent Plugins maintainers, [Agent Plugins Specification 1.0.0](https://github.com/agentplugins/agent-plugins-spec/blob/bd383552/spec/1.0.0.md).
- OpenAI Developers, [Codex worktrees](https://developers.openai.com/codex/app/worktrees), current documentation retrieved August 31, 2026.
- GitHub Changelog, [Copilot in VS Code, July 2026](https://github.blog/changelog/2026-07-30-github-copilot-in-visual-studio-code-july-2026-releases/), July 30, 2026.
- GitHub Changelog, [Copilot weekly releases, August 3](https://github.blog/changelog/2026-08-07-github-copilot-weekly-releases-august-3/), August 7, 2026.
- Banik, Chowdhury, and Shamim, [All Smoke, No Alarm: Oracle Signals in Agent-Authored Test Code](https://arxiv.org/html/2606.18168), 2026 preprint.

## First-hand practitioner source

- Integral Engineering, [Hawkeye: Why We Stopped Maintaining UI Tests and Built an AI Tester Instead](https://engineering.integral.de/posts/hawkeye-ai-qa-tester/), August 11, 2026. Useful for a concrete browser-observation practice and for its stated limitations; not treated as neutral market evidence.

## CREATE SOMETHING context

- Atlas Studio and Workflow Map are the strongest internal WebMCP fit because the operator and agent share a live graph, proposal state, parameters, provenance, and approval surface.
- The current published-site review snippet uses the older `navigator.modelContext` path and silently ignores registration failures. Do not describe the existing snippet as current Site tools support until it is migrated, instrumented, and tested.
- Ground supplies one verification layer. It does not own merge, deployment, publication, or production acceptance.
- Every published tool link should correspond to something used, built, evaluated, or deliberately rejected in this issue.

## Exclusions

- No “top tools” ranking.
- No adoption or popularity claim inferred from launch coverage.
- No claim that Site tools bypass normal confirmation or application permissions.
- No claim that Agent Plugins provides a security or trust model.
- No claim that worktrees make parallel work safe by themselves.
- No claim that the oracle-signal study executed and judged every test’s real fault-detection ability.
