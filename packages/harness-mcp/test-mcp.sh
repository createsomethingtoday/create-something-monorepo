#!/bin/bash

# Harness MCP Test Script
# Tests all major MCP tools to verify functionality

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MCP_INDEX="$SCRIPT_DIR/dist/index.js"

echo "🧪 Testing Harness MCP Server"
echo "=============================="
echo ""

# Test 1: List tools
echo "1️⃣  Testing tools/list..."
RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node "$MCP_INDEX" 2>&1 | grep -v "Harness MCP server")
if echo "$RESULT" | grep -q '"get_issue"'; then
    echo "✅ tools/list works"
else
    echo "❌ tools/list failed"
fi
echo ""

# Test 2: Get priority
echo "2️⃣  Testing get_priority..."
RESULT=$(echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_priority","arguments":{}}}' | node "$MCP_INDEX" 2>&1 | grep -v "Harness MCP server")
if echo "$RESULT" | grep -q 'recommendations'; then
    echo "✅ get_priority works"
else
    echo "❌ get_priority failed"
fi
echo ""

# Test 3: Get specific issue
echo "3️⃣  Testing get_issue..."
RESULT=$(echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_issue","arguments":{"issueId":"csm-psf94"}}}' | node "$MCP_INDEX" 2>&1 | grep -v "Harness MCP server")
if echo "$RESULT" | grep -q 'csm-psf94'; then
    echo "✅ get_issue works"
else
    echo "❌ get_issue failed"
fi
echo ""

# Test 4: Git status
echo "4️⃣  Testing get_git_status..."
RESULT=$(echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_git_status","arguments":{}}}' | node "$MCP_INDEX" 2>&1 | grep -v "Harness MCP server")
if echo "$RESULT" | grep -q 'branch'; then
    echo "✅ get_git_status works"
else
    echo "❌ get_git_status failed"
fi
echo ""

# Test 5: List issues with filter
echo "5️⃣  Testing list_issues with filter..."
RESULT=$(echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"list_issues","arguments":{"labels":["complexity:trivial"]}}}' | node "$MCP_INDEX" 2>&1 | grep -v "Harness MCP server")
if echo "$RESULT" | grep -q 'csm-psf94'; then
    echo "✅ list_issues works"
else
    echo "❌ list_issues failed"
fi
echo ""

echo "=============================="
echo "🎉 MCP Server Tests Complete!"
echo ""
echo "Next steps:"
echo "  1. Configure Claude Code MCP: See README.md"
echo "  2. Consider OpenCode.ai instead of Gemini CLI (model-agnostic, more agentic)"
echo "  3. Run cost comparison test"
