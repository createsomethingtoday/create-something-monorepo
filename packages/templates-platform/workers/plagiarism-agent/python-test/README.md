# Python SDK Plagiarism Detection Test

Demonstrates capabilities beyond Cloudflare Workers using Claude Agent SDK.

## What This Tests

### 1. AST-Based Code Analysis
- Parses JavaScript code into Abstract Syntax Trees
- Detects shared function names (direct code copying)
- Detects shared class names (structural copying)
- Calculates similarity score based on code structure

### 2. Tool Use (Agent Agentic Behavior)
- Claude autonomously calls `analyze_code_similarity` tool
- Fetches HTML, extracts JavaScript, parses ASTs
- Returns structured analysis to Claude for reasoning

### 3. Multi-Model Cross-Validation
- Claude makes initial plagiarism judgment
- Gemini Pro reviews Claude's decision
- Provides second opinion for quality assurance

### 4. Filesystem Operations
- Saves analysis results to JSON files
- Enables review and comparison across cases

## Setup

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Add API keys to `.env`**:
```bash
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...  # Optional, for cross-validation
```

3. **Run test**:
```bash
python agent_test.py
```

## Expected Output

The test will:
1. Analyze the Webflow case (recgROoGWyyoQiSUq)
2. Call the `analyze_code_similarity` tool
3. Extract JavaScript from both sites
4. Parse ASTs and find shared functions/classes
5. Calculate similarity score
6. Make a plagiarism judgment
7. (Optional) Cross-validate with Gemini Pro

## Key Differences vs Workers

| Feature | Workers | Python SDK |
|---------|---------|------------|
| **AST Analysis** | ❌ No | ✅ Yes - detects shared functions/classes |
| **Tool Use** | ❌ No | ✅ Yes - agent calls tools autonomously |
| **Multi-Model** | ❌ No | ✅ Yes - Claude + Gemini validation |
| **Filesystem** | ❌ No | ✅ Yes - save intermediate results |
| **Cost** | $0.17 | $0.20-0.40 (tool use overhead) |
| **Latency** | <2 sec | 5-10 sec |
| **Deployment** | Edge (global) | Python server |

## What You'll Learn

- Whether AST analysis finds evidence that visual analysis missed
- How tool use enables autonomous agent behavior
- Whether multi-model validation improves accuracy
- Cost/benefit trade-offs of Python SDK vs Workers
