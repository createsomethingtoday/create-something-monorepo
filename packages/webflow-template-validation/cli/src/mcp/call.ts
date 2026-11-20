// Minimal MCP Streamable HTTP client: initialize, tools/list, then two read-only
// Webflow design-data calls (list_sites, query_styles). Prints shapes, not values.

import { randomBytes } from "node:crypto";
import { McpClient, findArray } from "./client.ts";
import { loadToken } from "./login.ts";

const AGENT_ID = `cli|webflow-template-validate|${randomBytes(3).toString("hex")}`;

async function main(): Promise<void> {
	const tok = await loadToken();
	const client = new McpClient(tok.server, tok.access_token);

	const init = await client.initialize();
	const info = init.serverInfo as { name?: string; version?: string } | undefined;
	console.log(`initialize: ${info?.name ?? "?"} ${info?.version ?? ""} protocol ${String(init.protocolVersion)} (Mcp-Session-Id ${client.hasSession ? "issued" : "not issued"})`);

	const tools: { name: string }[] = [];
	let cursor: string | undefined;
	do {
		const page = await client.request("tools/list", cursor ? { cursor } : undefined);
		tools.push(...((page.tools as { name: string }[]) ?? []));
		cursor = page.nextCursor as string | undefined;
	} while (cursor);
	console.log(`tools/list: ${tools.length} tools`);
	console.log(`  ${tools.map((t) => t.name).join(", ")}`);

	const callTool = (name: string, args: Record<string, unknown>, context: string) => client.callTool(name, args, { agentId: AGENT_ID, context });

	const sites = await callTool(
		"data_sites_tool",
		{ actions: [{ label: "sites", list_sites: { detail: "summary" } }] },
		"A template validation command line client lists the authorized workspace sites so it can choose a template site to inspect for design data.",
	);
	console.log(`tool session_id: ${client.hasToolSession ? "issued" : "not issued"}`);
	const siteList = findArray(sites, "id") ?? [];
	console.log(`list_sites: ${siteList.length} site(s)`);
	const site = siteList[0];
	if (!site) return console.log("no sites in the authorized workspace; stopping");
	console.log(`  first site: ${String(site.displayName ?? site.name ?? "")} (${String(site.id)})`);

	const pages = await callTool(
		"data_pages_tool",
		{ actions: [{ label: "pages", list_pages: { site_id: site.id, limit: 1 } }] },
		"A template validation command line client lists pages on the chosen site to get a page identifier required by the style query.",
	);
	const page = findArray(pages, "id")?.[0];
	if (!page) return console.log("site has no pages; stopping");
	console.log(`  first page: ${String(page.title ?? page.slug ?? "")} (${String(page.id)})`);

	const styles = await callTool(
		"data_style_tool",
		{
			siteId: site.id,
			pageId: page.id,
			actions: [{ label: "buttons", query_styles: { queries: [{ label: "button", name_path: ["button"], include_properties: true }] } }],
		},
		"A template validation command line client reads button class styles with properties to check the template design system for consistency.",
	);
	const styleList = findArray(styles, "name") ?? [];
	const keys = new Set<string>();
	for (const s of styleList) {
		const props = s.properties;
		if (Array.isArray(props)) for (const p of props) keys.add(String((p as Record<string, unknown>).property_name ?? (p as Record<string, unknown>).name ?? "?"));
		else if (props && typeof props === "object") for (const k of Object.keys(props)) keys.add(k);
	}
	console.log(`query_styles name_path ['button']: ${styleList.length} style(s)`);
	console.log(`  property keys (${keys.size}): ${[...keys].sort().join(", ") || "(none found)"}`);
	if (!styleList.length) console.log(`  raw payload shape: ${JSON.stringify(styles).slice(0, 300)}`);
}

main().catch((err: Error) => {
	console.error(`call failed: ${err.message}`);
	process.exit(1);
});
