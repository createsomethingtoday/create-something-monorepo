<script lang="ts">
	/**
	 * Template Recategorization Experiment
	 *
	 * Hypothesis: AI agents with MCP tool access can participate
	 * meaningfully in data curation through conversational interaction.
	 */
</script>

<svelte:head>
	<title>Template Recategorization: MCP as Hermeneutic Bridge | CREATE SOMETHING.io</title>
	<meta name="description" content="Using Claude Code with Airtable MCP to recategorize miscategorized Webflow templates—demonstrating how AI agents can participate in the hermeneutic circle of data curation." />
</svelte:head>

<div class="page">
	<div class="container">
		<!-- Header -->
		<header class="header">
			<p class="category-label">Experiment</p>
			<h1 class="title">Template Recategorization</h1>
			<p class="subtitle">MCP as Hermeneutic Bridge</p>
			<p class="meta">
				December 2025 · Claude Code + Airtable MCP · Tool Complementarity
			</p>
		</header>

		<!-- ASCII Art -->
		<div class="flex justify-center">
			<pre class="ascii-art">
╔══════════════════════════════════════════════════════════════════╗
║  TEMPLATE RECATEGORIZATION                        ✓ VALIDATED    ║
║  ────────────────────────────────────────────────────────────    ║
║  8 templates │ 5/5 criteria │ 0 rollbacks │ ~45 min total        ║
║                                                                  ║
║  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐  ║
║  │  SLACK   │     │  CLAUDE  │     │   MCP    │     │AIRTABLE │  ║
║  │  THREAD  │ ──► │   CODE   │ ──► │  BRIDGE  │ ──► │   DB    │  ║
║  └──────────┘     └──────────┘     └──────────┘     └─────────┘  ║
║                                                                  ║
║    Human           Agent          Protocol         System        ║
║   (intent)     (interpretation)   (access)        (state)        ║
╚══════════════════════════════════════════════════════════════════╝
			</pre>
		</div>

		<!-- Hypothesis -->
		<section class="abstract">
			<h2 class="section-title">Hypothesis</h2>
			<p class="lead">
				AI agents equipped with MCP (Model Context Protocol) tools can participate in
				the <em>hermeneutic circle</em> of data curation—where understanding the whole
				(category taxonomy) and the parts (individual templates) mutually inform each other.
			</p>
		</section>

		<!-- Context -->
		<section class="section">
			<h2 class="section-title">Context: The Problem</h2>
			<div class="content">
				<p class="body-text">
					Webflow templates in our CMS were incorrectly categorized under "Public Services"—a
					category intended for government entities (police departments, fire stations,
					municipal utilities, political offices).
				</p>

				<p class="body-text">
					Instead, templates for dentists, design agencies, law firms, and digital nomad
					lifestyles had accumulated there. This misalignment degrades user experience:
					someone browsing for government templates finds lifestyle coaches.
				</p>

				<div class="grid md:grid-cols-2 gap-6">
					<div class="card">
						<h4 class="card-title">Miscategorized Templates (8 corrected)</h4>
						<ul class="card-list">
							<li>• <strong>Zerixs</strong> — Home maintenance → Design & Creative</li>
							<li>• <strong>Crownline</strong> — Transportation → Transportation, Services</li>
							<li>• <strong>Jones Smith</strong> — Law firm → Law Firm & Attorney</li>
							<li>• <strong>Nomadlife</strong> — Digital nomad → Travel & Tours</li>
							<li>• <strong>Dactor</strong> — Medical → Doctor, Volunteer & Community</li>
							<li>• <strong>Avocats X</strong> — Legal → Law Firm & Attorney, Finance</li>
							<li>• <strong>Rover</strong> — Nonprofit → Advocacy, Charity & Fundraising</li>
							<li>• <strong>DentiCare</strong> — Dental → Dentist, Volunteer & Community</li>
						</ul>
					</div>
					<div class="card">
						<h4 class="card-title">Correct "Public Services" Templates</h4>
						<ul class="card-list">
							<li>• Police departments</li>
							<li>• Fire stations</li>
							<li>• Municipal utilities</li>
							<li>• Political offices</li>
							<li>• Government agencies</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Method -->
		<section class="section">
			<h2 class="section-title">Method: MCP Integration</h2>
			<div class="content">
				<p class="body-text">
					The Model Context Protocol (MCP) allows Claude Code to interact directly with
					external systems. By configuring the Airtable MCP server, the agent gains:
				</p>

				<div class="triad-stack">
					<div class="triad-item">
						<h4 class="triad-title">list_records</h4>
						<p class="triad-question">Query templates from specific views</p>
						<p class="triad-answer">→ Read the "Public Services" view to identify candidates</p>
					</div>
					<div class="triad-item">
						<h4 class="triad-title">search_records</h4>
						<p class="triad-question">Find templates by name or content</p>
						<p class="triad-answer">→ Locate specific templates across the database</p>
					</div>
					<div class="triad-item">
						<h4 class="triad-title">update_records</h4>
						<p class="triad-question">Modify template categories</p>
						<p class="triad-answer">→ Reassign categories using linked record IDs</p>
					</div>
				</div>

				<h3 class="subsection-title">Configuration</h3>
				<pre class="code-block">{`// ~/.claude.json
{
  "mcpServers": {
    "airtable": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"],
      "env": {
        "AIRTABLE_API_KEY": "pat..."
      }
    }
  }
}`}</pre>
			</div>
		</section>

		<!-- The Hermeneutic Circle -->
		<section class="section">
			<h2 class="section-title">Grounding: The Hermeneutic Circle</h2>
			<div class="content">
				<p class="body-text">
					Data curation is inherently hermeneutic. To categorize a template correctly, you must:
				</p>

				<ol class="list numbered">
					<li><strong>Understand the category taxonomy</strong> — What does "Public Services" mean?</li>
					<li><strong>Examine the individual template</strong> — What does this template represent?</li>
					<li><strong>Return to the whole</strong> — Does this template belong in this category?</li>
					<li><strong>Refine understanding</strong> — Should the category definition change?</li>
				</ol>

				<blockquote class="quote">
					<p>
						"The part can only be understood from the whole and the whole only from the parts."
					</p>
					<cite>— Wilhelm Dilthey, on the hermeneutic circle</cite>
				</blockquote>

				<p class="body-text">
					Traditional database queries break this circle: you either query by category
					(ignoring template content) or by template (ignoring taxonomy structure).
					MCP-enabled agents can traverse both simultaneously through conversation.
				</p>
			</div>
		</section>

		<!-- Workflow -->
		<section class="section">
			<h2 class="section-title">Workflow Demonstration</h2>
			<div class="content">
				<div class="decision">
					<h4 class="decision-title">Step 1: Human initiates via Slack</h4>
					<p class="decision-text">
						Aaron reports: "Public Services has templates that don't belong there—
						dentists, design agencies, law firms."
					</p>
				</div>

				<div class="decision">
					<h4 class="decision-title">Step 2: Claude Code queries Airtable</h4>
					<pre class="code-block">{`// Using mcp__airtable__list_records
{
  "baseId": "appMoIgXMTTTNIc3p",
  "tableId": "tblRwzpWoLgE9MrUm",
  "view": "viwp2Qn6UhDx4OMgW"  // Public Services view
}`}</pre>
				</div>

				<div class="decision">
					<h4 class="decision-title">Step 3: Agent interprets results</h4>
					<p class="decision-text">
						"I found 4 templates in Public Services. Zerixs appears to be home maintenance,
						Crownline is a law firm, Jones Smith looks like a portfolio template..."
					</p>
				</div>

				<div class="decision">
					<h4 class="decision-title">Step 4: User provides context</h4>
					<p class="decision-text">
						"Templates should have two categories when possible—not just remove
						Public Services, but add an appropriate second category."
					</p>
				</div>

				<div class="decision">
					<h4 class="decision-title">Step 5: Agent updates records</h4>
					<pre class="code-block">{`// Using mcp__airtable__update_records
{
  "baseId": "appMoIgXMTTTNIc3p",
  "tableId": "tblRwzpWoLgE9MrUm",
  "records": [
    {
      "id": "rec...",
      "fields": {
        "category": ["recnorfWCNFvhf5Mb"]  // Home Services
      }
    }
  ]
}`}</pre>
				</div>
			</div>
		</section>

		<!-- Success Criteria -->
		<section class="section">
			<h2 class="section-title">Success Criteria</h2>
			<div class="criteria-grid">
				<div class="criterion validated">
					<span class="check">✓</span>
					<div>
						<strong>MCP server connects to Claude Code</strong>
						<p>Airtable tools appear after restart</p>
					</div>
				</div>
				<div class="criterion validated">
					<span class="check">✓</span>
					<div>
						<strong>Agent can query specific views</strong>
						<p>list_records returns Public Services templates</p>
					</div>
				</div>
				<div class="criterion validated">
					<span class="check">✓</span>
					<div>
						<strong>Agent identifies miscategorization</strong>
						<p>Correctly interprets template content vs category intent</p>
					</div>
				</div>
				<div class="criterion validated">
					<span class="check">✓</span>
					<div>
						<strong>Agent updates records correctly</strong>
						<p>8 templates recategorized with proper linked record IDs</p>
					</div>
				</div>
				<div class="criterion validated">
					<span class="check">✓</span>
					<div>
						<strong>Changes sync to Webflow via Whalesync</strong>
						<p>Categories visible on template listing pages</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Tool Complementarity -->
		<section class="section">
			<h2 class="section-title">Tool Complementarity in Practice</h2>
			<div class="content">
				<p class="body-text">
					This experiment demonstrates the complementarity principle from the CREATE SOMETHING
					philosophy: Claude Code excels at interpretation and creation, while humans provide
					context and verify results.
				</p>

				<!-- Mobile: Card layout -->
				<div class="responsive-table-cards">
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Identify problem</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Claude Code</span>
								<span class="responsive-table-card-value status-partial">—</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Human</span>
								<span class="responsive-table-card-value status-pass">✓ (Slack thread)</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Query database</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Claude Code</span>
								<span class="responsive-table-card-value status-pass">✓ (MCP tools)</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Human</span>
								<span class="responsive-table-card-value status-partial">—</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Interpret results</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Claude Code</span>
								<span class="responsive-table-card-value status-pass">✓ (Template content)</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Human</span>
								<span class="responsive-table-card-value status-pass">✓ (Category intent)</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Decide new category</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Claude Code</span>
								<span class="responsive-table-card-value status-pass">✓ (Suggestion)</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Human</span>
								<span class="responsive-table-card-value status-pass">✓ (Approval)</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Execute update</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Claude Code</span>
								<span class="responsive-table-card-value status-pass">✓ (MCP update)</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Human</span>
								<span class="responsive-table-card-value status-partial">—</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Verify in production</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Claude Code</span>
								<span class="responsive-table-card-value status-partial">—</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Human</span>
								<span class="responsive-table-card-value status-pass">✓ (Webflow check)</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Desktop: Table layout -->
				<div class="responsive-table-wrapper">
					<table class="responsive-table">
						<thead>
							<tr>
								<th>Task</th>
								<th>Claude Code</th>
								<th>Human</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Identify problem</td>
								<td class="status-partial">—</td>
								<td class="status-pass">✓ (Slack thread)</td>
							</tr>
							<tr>
								<td>Query database</td>
								<td class="status-pass">✓ (MCP tools)</td>
								<td class="status-partial">—</td>
							</tr>
							<tr>
								<td>Interpret results</td>
								<td class="status-pass">✓ (Template content)</td>
								<td class="status-pass">✓ (Category intent)</td>
							</tr>
							<tr>
								<td>Decide new category</td>
								<td class="status-pass">✓ (Suggestion)</td>
								<td class="status-pass">✓ (Approval)</td>
							</tr>
							<tr>
								<td>Execute update</td>
								<td class="status-pass">✓ (MCP update)</td>
								<td class="status-partial">—</td>
							</tr>
							<tr>
								<td>Verify in production</td>
								<td class="status-partial">—</td>
								<td class="status-pass">✓ (Webflow check)</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Subtractive Triad -->
		<section class="section">
			<h2 class="section-title">Subtractive Triad Application</h2>
			<div class="content">
				<div class="triad-stack">
					<div class="triad-item">
						<h4 class="triad-title">DRY (Implementation)</h4>
						<p class="triad-question">"Have I built this before?"</p>
						<p class="triad-answer">→ Use existing MCP server (airtable-mcp-server npm package)</p>
					</div>
					<div class="triad-item">
						<h4 class="triad-title">Rams (Artifact)</h4>
						<p class="triad-question">"Does this earn its existence?"</p>
						<p class="triad-answer">→ Remove templates that pollute category meaning</p>
					</div>
					<div class="triad-item">
						<h4 class="triad-title">Heidegger (System)</h4>
						<p class="triad-question">"Does this serve the whole?"</p>
						<p class="triad-answer">→ Clean categories serve the Webflow marketplace taxonomy</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Learnings -->
		<section class="section">
			<h2 class="section-title">Technical Learnings</h2>
			<div class="content">
				<div class="decision">
					<h4 class="decision-title">MCP server location matters</h4>
					<p class="decision-text">
						Project-level <code>.mcp.json</code> didn't load the server. Global
						<code>~/.claude.json</code> worked. Claude Code's MCP server discovery
						appears to prioritize the global config.
					</p>
				</div>

				<div class="decision">
					<h4 class="decision-title">Linked records require ID lookup</h4>
					<p class="decision-text">
						Airtable category fields store linked record IDs (e.g., <code>recnorfWCNFvhf5Mb</code>),
						not human-readable names. Updates require querying the categories table first.
					</p>
				</div>

				<div class="decision">
					<h4 class="decision-title">View-based queries are powerful</h4>
					<p class="decision-text">
						Querying a pre-configured Airtable view ("Public Services") is more efficient
						than filtering all records. Views encode domain knowledge.
					</p>
				</div>
			</div>
		</section>

		<!-- Results -->
		<section class="section">
			<h2 class="section-title">Results</h2>
			<div class="content">
				<p class="body-text">
					The experiment successfully recategorized 8 templates from the "Public Services"
					category. Each template was reassigned to appropriate categories that accurately
					reflect its content and intended audience.
				</p>

				<!-- Mobile: Card layout -->
				<div class="responsive-table-cards">
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Zerixs</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Previous</span>
								<span class="responsive-table-card-value">Public services, Design & Creative</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Updated</span>
								<span class="responsive-table-card-value status-pass">Design & Creative</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Crownline</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Previous</span>
								<span class="responsive-table-card-value">Public services, Transportation, Services</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Updated</span>
								<span class="responsive-table-card-value status-pass">Transportation, Services</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Jones Smith</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Previous</span>
								<span class="responsive-table-card-value">Public services, Law Firm & Attorney</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Updated</span>
								<span class="responsive-table-card-value status-pass">Law Firm & Attorney</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Nomadlife</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Previous</span>
								<span class="responsive-table-card-value">Public services, Travel & Tours</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Updated</span>
								<span class="responsive-table-card-value status-pass">Travel & Tours</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Dactor</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Previous</span>
								<span class="responsive-table-card-value">Public services, Doctor, Volunteer & Community</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Updated</span>
								<span class="responsive-table-card-value status-pass">Doctor, Volunteer & Community</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Avocats X</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Previous</span>
								<span class="responsive-table-card-value">Public services, Law Firm & Attorney, Finance</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Updated</span>
								<span class="responsive-table-card-value status-pass">Law Firm & Attorney, Finance & Accounting</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">Rover</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Previous</span>
								<span class="responsive-table-card-value">Public services, Advocacy & Campaigns, Charity</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Updated</span>
								<span class="responsive-table-card-value status-pass">Advocacy & Campaigns, Charity & Fundraising</span>
							</div>
						</div>
					</div>
					<div class="responsive-table-card">
						<div class="responsive-table-card-header">
							<span class="responsive-table-card-title">DentiCare</span>
						</div>
						<div class="responsive-table-card-body">
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Previous</span>
								<span class="responsive-table-card-value">Public services, Dentist, Volunteer & Community</span>
							</div>
							<div class="responsive-table-card-row">
								<span class="responsive-table-card-label">Updated</span>
								<span class="responsive-table-card-value status-pass">Dentist, Volunteer & Community</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Desktop: Table layout -->
				<div class="responsive-table-wrapper">
					<table class="responsive-table">
						<thead>
							<tr>
								<th>Template</th>
								<th>Previous Categories</th>
								<th>Updated Categories</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Zerixs</td>
								<td>Public services, Design & Creative</td>
								<td class="status-pass">Design & Creative</td>
							</tr>
							<tr>
								<td>Crownline</td>
								<td>Public services, Transportation, Services</td>
								<td class="status-pass">Transportation, Services</td>
							</tr>
							<tr>
								<td>Jones Smith</td>
								<td>Public services, Law Firm & Attorney</td>
								<td class="status-pass">Law Firm & Attorney</td>
							</tr>
							<tr>
								<td>Nomadlife</td>
								<td>Public services, Travel & Tours</td>
								<td class="status-pass">Travel & Tours</td>
							</tr>
							<tr>
								<td>Dactor</td>
								<td>Public services, Doctor, Volunteer & Community</td>
								<td class="status-pass">Doctor, Volunteer & Community</td>
							</tr>
							<tr>
								<td>Avocats X</td>
								<td>Public services, Law Firm & Attorney, Finance</td>
								<td class="status-pass">Law Firm & Attorney, Finance & Accounting</td>
							</tr>
							<tr>
								<td>Rover</td>
								<td>Public services, Advocacy & Campaigns, Charity</td>
								<td class="status-pass">Advocacy & Campaigns, Charity & Fundraising</td>
							</tr>
							<tr>
								<td>DentiCare</td>
								<td>Public services, Dentist, Volunteer & Community</td>
								<td class="status-pass">Dentist, Volunteer & Community</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="decision">
					<h4 class="decision-title">Key Insight: Category Field Structure</h4>
					<p class="decision-text">
						The Categories field (<code>ℹ️🪣Categories</code>) uses linked record IDs.
						Updates require the exact record ID (e.g., <code>recpqfmySq2tHP5yC</code> for
						Public services), not human-readable names. The agent learned to search for
						category records first, then use those IDs in update operations.
					</p>
				</div>
			</div>
		</section>

		<!-- Limitations -->
		<section class="section">
			<h2 class="section-title">Limitations</h2>
			<div class="content">
				<div class="limitation">
					<h4>No undo mechanism</h4>
					<p>
						MCP updates are immediate and permanent. There's no built-in rollback.
						A production workflow should include change logging or snapshot restoration.
					</p>
				</div>

				<div class="limitation">
					<h4>Agent cannot verify Webflow sync</h4>
					<p>
						Changes sync to Webflow via Whalesync asynchronously. Claude Code cannot
						confirm the sync completed—human verification remains necessary.
					</p>
				</div>

				<div class="limitation">
					<h4>Category taxonomy is implicit</h4>
					<p>
						"Public Services means government entities" is tribal knowledge. The agent
						inferred this from context but couldn't have known without being told.
					</p>
				</div>
			</div>
		</section>

		<!-- What This Proves / Doesn't Prove -->
		<section class="section">
			<h2 class="section-title">What This Proves / Doesn't Prove</h2>
			<div class="content">
				<div class="grid md:grid-cols-2 gap-6">
					<div class="card">
						<h4 class="card-title">What This Proves</h4>
						<ul class="card-list">
							<li>• MCP enables agent participation in data curation</li>
							<li>• Conversational interaction can traverse the hermeneutic circle</li>
							<li>• Human-agent collaboration produces accurate recategorization</li>
							<li>• Linked record field updates work via MCP</li>
						</ul>
					</div>
					<div class="card">
						<h4 class="card-title">What This Doesn't Prove</h4>
						<ul class="card-list">
							<li>• Agent can categorize without human context</li>
							<li>• This workflow scales to thousands of records</li>
							<li>• Agent can create new categories when needed</li>
							<li>• Automated rollback is possible via MCP</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Reproducibility -->
		<section class="section">
			<h2 class="section-title">Reproducibility</h2>
			<div class="content">
				<h3 class="subsection-title">Prerequisites</h3>
				<ul class="list">
					<li>Claude Code CLI installed</li>
					<li>Airtable account with API access (Personal Access Token)</li>
					<li>airtable-mcp-server npm package</li>
					<li>Knowledge of target category definitions</li>
				</ul>

				<h3 class="subsection-title">Steps to Reproduce</h3>
				<ol class="list numbered">
					<li>Configure MCP server in <code>~/.claude.json</code> (see Configuration above)</li>
					<li>Restart Claude Code to load MCP tools</li>
					<li>Identify miscategorized records via human review or query</li>
					<li>Query category table to obtain linked record IDs</li>
					<li>Update records with corrected category IDs</li>
					<li>Verify changes in Airtable and downstream systems</li>
				</ol>

				<h3 class="subsection-title">Expected Challenges</h3>
				<ul class="list">
					<li>MCP server may not load from project-level config—use global config</li>
					<li>Linked record fields require ID lookup, not human-readable names</li>
					<li>Category definitions may be tribal knowledge—document them first</li>
				</ul>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="section">
			<h2 class="section-title">Conclusion</h2>
			<div class="content">
				<p class="body-text">
					The hypothesis is <strong>validated</strong>. Claude Code with MCP tools
					can participate meaningfully in the hermeneutic circle of data curation.
					In this experiment, 8 templates were successfully recategorized through
					conversational interaction—demonstrating that AI agents can:
				</p>

				<ul class="list">
					<li>Query and interpret data (understanding parts: individual templates)</li>
					<li>Apply category definitions (understanding whole: "Public services = government")</li>
					<li>Propose and execute corrections (synthesis: remove miscategorizations)</li>
					<li>Learn from human feedback (iteration: preserve appropriate secondary categories)</li>
				</ul>

				<blockquote class="quote featured">
					<p>"The bridge is a thing that gathers."</p>
					<cite>— Heidegger, Building Dwelling Thinking</cite>
				</blockquote>

				<p class="body-text">
					MCP serves as a bridge—gathering human intent, agent capability, and system
					state into a unified workflow. The protocol recedes; the curation emerges.
				</p>

				<div class="decision">
					<h4 class="decision-title">Pattern Validated for .agency</h4>
					<p class="decision-text">
						This workflow is now a validated pattern for client service delivery.
						Airtable MCP enables data curation tasks that previously required manual
						database manipulation. The pattern: Human identifies issue → Agent queries
						and interprets → Human confirms → Agent executes.
					</p>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<footer class="footer">
			<div class="grid md:grid-cols-2 gap-8">
				<div>
					<h4 class="footer-heading">Principles Applied</h4>
					<ul class="footer-list">
						<li><a href="https://createsomething.ltd/patterns/tool-complementarity">Tool Complementarity</a></li>
						<li><a href="https://createsomething.ltd/patterns/hermeneutic-spiral">Hermeneutic Spiral</a></li>
						<li><a href="https://createsomething.ltd/patterns/subtractive-triad-audit">Subtractive Triad</a></li>
					</ul>
				</div>
				<div>
					<h4 class="footer-heading">Related</h4>
					<ul class="footer-list">
						<li><a href="/experiments/meeting-capture">Meeting Capture Experiment</a></li>
						<li><a href="/papers/hermeneutic-spiral-ux">The Hermeneutic Spiral in UX</a></li>
						<li><a href="/experiments">All Experiments</a></li>
					</ul>
				</div>
			</div>
		</footer>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.container {
		max-width: 64rem;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
	}

	/* Header */
	.header {
		padding-bottom: var(--space-lg);
		margin-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.category-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.title {
		font-size: var(--text-display);
		font-weight: 700;
		margin: 0 0 var(--space-xs);
	}

	.subtitle {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		font-style: italic;
		margin: 0 0 var(--space-sm);
	}

	.meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* ASCII Art */
	.ascii-art {
		font-family: monospace;
		font-size: 0.65rem;
		line-height: 1.2;
		color: var(--color-fg-tertiary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		overflow-x: auto;
	}

	/* Sections */
	.section {
		margin: var(--space-2xl) 0;
	}

	.abstract {
		margin: var(--space-xl) 0;
		padding-left: var(--space-md);
		border-left: 4px solid var(--color-border-emphasis);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		margin: 0 0 var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.subsection-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin: var(--space-lg) 0 var(--space-sm);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	/* Typography */
	.lead {
		font-size: var(--text-body-lg);
		line-height: 1.8;
		color: var(--color-fg-secondary);
	}

	.body-text {
		line-height: 1.7;
		color: var(--color-fg-secondary);
	}

	em {
		font-style: italic;
		color: var(--color-fg-primary);
	}

	/* Success Criteria */
	.criteria-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.criterion {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.criterion .check {
		font-size: var(--text-body-lg);
		width: 1.5rem;
		flex-shrink: 0;
	}

	.criterion.validated .check { color: var(--color-success); }
	.criterion.partial .check { color: var(--color-warning); }
	.criterion.pending .check { color: var(--color-fg-muted); }

	.criterion strong {
		display: block;
		color: var(--color-fg-primary);
	}

	.criterion p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Status indicators for table cells */
	.status-pass { color: var(--color-success); font-weight: 600; }
	.status-partial { color: var(--color-fg-muted); }

	/* Cards */
	.card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.card-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.card-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Triad */
	.triad-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.triad-item {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-border-emphasis);
	}

	.triad-title {
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.triad-question {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.triad-answer {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	/* Lists */
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-bg-subtle);
	}

	.list.numbered {
		counter-reset: list-counter;
	}

	.list.numbered li {
		counter-increment: list-counter;
	}

	.list.numbered li::before {
		content: counter(list-counter) ". ";
		color: var(--color-fg-muted);
	}

	/* Decisions */
	.decision {
		background: var(--color-bg-elevated);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		margin-bottom: var(--space-sm);
	}

	.decision-title {
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.decision-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Limitations */
	.limitation {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-error);
		margin-bottom: var(--space-sm);
	}

	.limitation h4 {
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.limitation p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	code {
		font-family: monospace;
		font-size: 0.875em;
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
	}

	/* Quote */
	.quote {
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-md) 0;
	}

	.quote p {
		font-style: italic;
		color: var(--color-fg-secondary);
	}

	.quote cite {
		display: block;
		margin-top: var(--space-xs);
		font-size: var(--text-body-sm);
		font-style: normal;
		color: var(--color-fg-muted);
	}

	.quote.featured {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
	}

	.quote.featured p {
		font-size: var(--text-body-lg);
	}

	/* Code */
	.code-block {
		font-family: monospace;
		font-size: var(--text-body-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		overflow-x: auto;
		color: var(--color-fg-secondary);
		white-space: pre-wrap;
	}

	/* Footer */
	.footer {
		margin-top: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-heading {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.footer-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
	}

	.footer-list li {
		border: none;
		padding: 0;
	}

	.footer-list a {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-list a:hover {
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-md);
		}
	}
</style>
