# Webflow Template Preflight

A creator checklist and Claude skill for reviewing Webflow templates before submission. Includes Designer/MCP guidance, a published-site scanner, and a report template.

## Install for Claude Code

Requires Python 3.10+. The scanner uses only the Python standard library; aspell is optional.

```bash
cp -R template-preflight ~/.claude/skills/
```

If that directory already exists, back it up first. Start a new Claude Code session and ask it to check your template before you submit it. Connect the Webflow MCP for Designer checks; the published-site scanner works without MCP.

## Scan a published site

```bash
~/.claude/skills/template-preflight/checks/published-site-checks.sh https://timestate.webflow.io --json /tmp/template-preflight.json
```

Supply extra paths after the URL if pages are absent from links/sitemaps. Use `--template-name` for the exact listing name and `--max-pages` to increase the default 200-URL limit. Incomplete crawling fails explicitly.

The scanner checks titles, descriptions, utility pages, footer links, license boilerplate, image dimensions, form defaults and label associations, and copy heuristics. Image dimension failures appear once per page; JSON retains individual image details.

Exit zero means no automated failures. It does **not** mean the template is approved or all manual checks passed. Licensing completeness, computed layout, image loading relative to the fold, actual form feedback, and visual design need manual verification. Forms are never submitted by the scanner.

## Files

- [Skill instructions](SKILL.md)
- [Creator checklist](criteria/hard-requirements.md)
- [Designer/MCP checks](checks/designer-mcp-checks.md)
- [Rubric](criteria/rubric.md)
- [Scanner usage and limits](checks/README.md)
- [Report template](output/preflight-report.md)

## Tests

```bash
python3 -m unittest discover -s checks/tests
```

Tests run the real CLI against a local HTTP server, including negative cases and JSON receipts. For the measured result with and without this skill, see [../evals/results/2026-11-26.md](../evals/results/2026-11-26.md).

This is an independent CREATE SOMETHING tool, not an official Webflow validator or an approval guarantee. Use the required Template Validator and current [Webflow submission guidelines](https://webflow.com/templates/submission-guidelines) before submitting. Reviewer-feedback priorities are qualitative, not measured rejection rates.
