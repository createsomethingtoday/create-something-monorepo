# Anthropic Claude Partner Network Application

**To**: claude-partners@anthropic.com
**Subject**: Partnership Proposal: Ground MCP - Verification-First Code Analysis

---

## About CREATE SOMETHING

CREATE SOMETHING builds automation infrastructure for AI-native workflows. Our tools help AI agents work more reliably by providing verification-first patterns that prevent hallucination.

## Tools We're Proposing

### Ground MCP

**Purpose**: Prevent AI hallucination in code analysis.

**The Problem**: AI agents confidently make claims about code without verification. They'll say "these files are 95% similar" without comparing them, or "this code is dead" without checking usage.

**The Solution**: Ground requires verification before claims:
- `ground_compare` → computes actual similarity
- `ground_count_uses` → counts actual usages
- `ground_claim_*` → only succeeds if evidence exists

**Why This Aligns with Anthropic's Mission**:
- Prevents Claude from making ungrounded claims about code
- Demonstrates responsible AI tooling
- Reduces error rates in code analysis tasks
- Supports Claude's accuracy in agentic workflows

**Results**:
- <5% false positive rate (vs 30%+ with pattern matching)
- 10 minutes vs 9+ hours manual review
- Every claim backed by computed evidence

### Loom

**Purpose**: External memory for AI agents.

Provides checkpointing, session recovery, and task coordination across agent sessions. Prevents loss of context during complex multi-step work.

## Technical Details

**Protocol**: Model Context Protocol (MCP)
**Installation**: `npm install @createsomething/ground-mcp`
**License**: MIT
**Documentation**: https://createsomething.io/docs/ground

## Integration Proposal

We propose Ground as a **Claude Connector** for:
1. Claude Desktop users doing code analysis
2. Claude API users building coding assistants
3. Claude MCP integrations

**Demo Available**: We can demonstrate Ground preventing hallucinated code analysis claims in real-time.

## About Our Team

- Micah Johnson, Founder
- Background: Automation infrastructure, distributed systems
- Location: United States

## Contact

- Email: hello@createsomething.io
- GitHub: https://github.com/createsomethingtoday
- Website: https://createsomething.io

---

Thank you for considering Ground for the Claude Partner Network. We believe verification-first code analysis aligns naturally with Anthropic's commitment to safe and reliable AI.

Best regards,
Micah Johnson
CREATE SOMETHING
