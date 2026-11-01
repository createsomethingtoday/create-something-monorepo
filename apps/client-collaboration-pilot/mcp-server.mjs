import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Transform } from "node:stream";
import { openRuntime, defaultHome } from "./runtime.mjs";
import { principals, contract, invoke } from "./store.mjs";

const { store } = openRuntime(process.env.COLLABORATION_HOME || defaultHome);
const server = new Server(
  { name: "create-something-client-collaboration", version: "0.2.0" },
  { capabilities: { tools: {}, resources: {} } },
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: contract.tools.map((t) => ({
    ...t,
    description:
      t.name === "proposal.create"
        ? "Propose a bounded edit. This never approves, applies or deploys it."
        : "Record supporting feedback or an edit request on an exact source version.",
  })),
}));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: contract.resources.map((r) => ({
    ...r,
    name: "Workspace context",
    mimeType: "application/json",
  })),
}));
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== contract.resources[0].uri)
    throw new McpError(ErrorCode.InvalidParams, "Unknown resource");
  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(store.context(principals.agent)),
      },
    ],
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            invoke(
              store,
              principals.agent,
              request.params.name,
              request.params.arguments,
            ),
          ),
        },
      ],
    };
  } catch (e) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: e.message,
            recovery:
              "Read context. Reuse requestId after an uncertain response. Approval and application require the reviewer surface.",
          }),
        },
      ],
    };
  }
});
// Bound each newline-delimited MCP message before SDK parsing. No model jobs,
// network access, sampling, elicitation, or approval capabilities are exposed.
let bytes = 0;
const input = new Transform({
  transform(chunk, encoding, done) {
    for (const byte of chunk) {
      bytes = byte === 10 ? 0 : bytes + 1;
      if (bytes > 16384) {
        done(Error("MCP message exceeds 16 KiB"));
        return;
      }
    }
    done(null, chunk);
  },
});
const transport = new StdioServerTransport(input, process.stdout);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await server.close();
  store.close();
}
input.on("error", () => {
  console.error("MCP input limit exceeded");
  close().finally(() => process.exit(1));
});
process.stdin.on("end", () => close());
process.on("SIGTERM", () => close().finally(() => process.exit(0)));
process.on("SIGINT", () => close().finally(() => process.exit(0)));
await server.connect(transport);
process.stdin.pipe(input);
