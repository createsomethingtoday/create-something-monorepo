#!/usr/bin/env node

// Deliberately accepts stdin without producing an MCP initialize response.
// The public client test uses it to prove bounded timeout and process cleanup.
process.stdin.resume();
