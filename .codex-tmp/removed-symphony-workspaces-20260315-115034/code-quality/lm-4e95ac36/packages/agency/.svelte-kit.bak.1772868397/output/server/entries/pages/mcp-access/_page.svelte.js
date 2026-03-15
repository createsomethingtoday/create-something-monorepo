import { a4 as attr, a6 as escape_html, aa as ensure_array_like, a7 as attr_class } from "../../../chunks/index.js";
import { S as SEO } from "../../../chunks/SEO.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const hostOptions = [
      {
        id: "codex",
        label: "Codex",
        urlExample: "https://YOUR-MCP-URL/mcp"
      },
      {
        id: "claude",
        label: "Claude Desktop",
        urlExample: "https://YOUR-MCP-URL/mcp"
      },
      {
        id: "cursor",
        label: "Cursor",
        urlExample: "https://YOUR-MCP-URL/mcp"
      }
    ];
    let busy = false;
    let selectedHost = "codex";
    const activeHost = hostOptions.find((host) => host.id === selectedHost) ?? hostOptions[0];
    const productState = "Once issued, this token becomes your single portable credential for approved `.agency` MCP access.";
    const tokenValue = "PASTE_YOUR_BEARER_TOKEN_HERE";
    const codexSnippet = `[mcp_servers.create_something]
url = "${activeHost.urlExample}"
bearer_token = "${tokenValue}"`;
    `{
  "mcpServers": {
    "create-something": {
      "url": "${activeHost.urlExample}",
      "headers": {
        "Authorization": "Bearer ${tokenValue}"
      }
    }
  }
}`;
    `{
  "mcpServers": {
    "create-something": {
      "url": "${activeHost.urlExample}",
      "headers": {
        "Authorization": "Bearer ${tokenValue}"
      }
    }
  }
}`;
    const activeSnippet = codexSnippet;
    SEO($$renderer2, {
      title: "MCP Access",
      description: "Issue, rotate, copy, and govern your personal CREATE SOMETHING .agency MCP bearer token.",
      propertyName: "agency",
      noindex: true
    });
    $$renderer2.push(`<!----> <section class="access-shell svelte-2vnsri"><div class="access-inner svelte-2vnsri"><header class="hero svelte-2vnsri"><p class="eyebrow svelte-2vnsri">Operator Access</p> <h1 class="svelte-2vnsri">MCP Access</h1> <p class="lede svelte-2vnsri">Sign in with Auth0, manage one personal bearer token, and use it in approved hosts without exposing
				system-side runtime secrets.</p></header> <div class="grid svelte-2vnsri"><article class="card token-card svelte-2vnsri"><div class="card-header svelte-2vnsri"><div><h2 class="svelte-2vnsri">Personal Bearer Token</h2> <p class="svelte-2vnsri">One active token per authenticated user. Raw token material is shown only on creation or regeneration.</p></div> <a href="/security" class="inline-link svelte-2vnsri">Security model</a></div> `);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<p class="empty-state svelte-2vnsri">No MCP bearer token has been issued for this account.</p>`);
    }
    $$renderer2.push(`<!--]--> <div class="actions svelte-2vnsri"><button${attr("disabled", false, true)} class="svelte-2vnsri">Create token</button> <button${attr("disabled", busy, true)} class="secondary svelte-2vnsri">Regenerate + Reveal</button> <button${attr("disabled", true, true)} class="secondary svelte-2vnsri">Revoke</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></article> <article class="card svelte-2vnsri"><div class="card-header svelte-2vnsri"><div><h2 class="svelte-2vnsri">Managed Access Scope</h2> <p class="svelte-2vnsri">What this token is allowed to do right now, based on live \`.agency\` entitlement state.</p></div> <a href="/bearer-token-policy" class="inline-link svelte-2vnsri">Policy</a></div> <div class="scope-block svelte-2vnsri"><div class="svelte-2vnsri"><span class="svelte-2vnsri">Current product posture</span> <p>${escape_html(productState)}</p></div> <div class="svelte-2vnsri"><span class="svelte-2vnsri">Toolkit profile</span> `);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<p class="empty-inline svelte-2vnsri">No toolkit profile has been attached yet.</p>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="svelte-2vnsri"><span class="svelte-2vnsri">Allowed tool prefixes</span> `);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<p class="empty-inline svelte-2vnsri">Tool visibility will appear here once the entitlement broker assigns concrete MCP prefixes.</p>`);
    }
    $$renderer2.push(`<!--]--></div></div></article> <article class="card full-span svelte-2vnsri"><div class="card-header svelte-2vnsri"><div><h2 class="svelte-2vnsri">Host Setup</h2> <p class="svelte-2vnsri">Use the same personal token in approved hosts. Replace the MCP URL with the endpoint provisioned for your account.</p></div></div> <div class="host-tabs svelte-2vnsri"><!--[-->`);
    const each_array_2 = ensure_array_like(hostOptions);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let host = each_array_2[$$index_2];
      $$renderer2.push(`<button type="button"${attr_class("host-tab svelte-2vnsri", void 0, { "active": selectedHost === host.id })}>${escape_html(host.label)}</button>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="snippet-meta svelte-2vnsri"><div class="svelte-2vnsri"><span class="svelte-2vnsri">MCP URL placeholder</span> <strong>${escape_html(activeHost.urlExample)}</strong></div> <button class="secondary small svelte-2vnsri" type="button">Copy snippet</button></div> <pre class="svelte-2vnsri"><code class="svelte-2vnsri">${escape_html(activeSnippet)}</code></pre> <p class="footnote svelte-2vnsri">\`.agency\` is the user-facing credential broker. Auth0 proves identity. Runtime secrets and service keys remain in managed infrastructure such as Infisical. Stripe billing state and policy acceptance are the product-side controls that keep paid MCP access active.</p></article></div></div></section>`);
  });
}
export {
  _page as default
};
