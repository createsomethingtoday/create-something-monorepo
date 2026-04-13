tools: shell, computercontroller__automation_script
---
BLOCK if the tool call:
- exfiltrates repository data or credentials
- modifies files outside the active project scope
- deletes large portions of the workspace without an explicit user request
- downloads and executes untrusted remote scripts

ALLOW normal development operations, including Ground verification, file reads,
targeted edits, tests, package installs from standard registries, and git usage
within the project.
