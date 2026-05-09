# Experiment #5: RELAY — Personal AI Agent on Cloudflare

**Status:** ✅ Deployed  
**Started:** January 30, 2026  
**Deployed:** January 30, 2026  
**Renamed:** January 31, 2026 — OpenClaw → RELAY  
**Hypothesis:** Personal AI agents belong on infrastructure you don't have to babysit.

---

## Live Deployment

**Control UI:** `https://relay.createsomething.workers.dev/?token=<redacted>`

**Gateway Token:** `<redacted>`

> **Security note:** A historical gateway token was removed from this document.
> Rotate `MOLTBOT_GATEWAY_TOKEN` before reusing this deployment.

> **Note:** The first request takes 1-2 minutes while the container cold starts.

---

## The Name

**RELAY** — passes your intent to services, bridges you to the digital world.

Fits the CREATE SOMETHING family:
- **GROUND** — Foundation, verification
- **LOOM** — Weaving threads together  
- **TEND** — Caring for systems
- **RELAY** — Passing signals, bridging connections

---

## Deployment Summary

| Component | Status | Details |
|-----------|--------|---------|
| Worker | ✅ Deployed | `relay.createsomething.workers.dev` |
| Container | ✅ Built | OpenClaw runtime in Cloudflare Sandbox |
| R2 Bucket | ✅ Created | `moltbot-data` |
| Secrets | ✅ Set | ANTHROPIC_API_KEY, MOLTBOT_GATEWAY_TOKEN |
| Cron | ✅ Active | R2 sync every 5 minutes |
| Design | ✅ Canon | Tufte clarity, Ive motion, Glass UI |

---

## Next Steps

1. **Open the Control UI** — Click the link above, wait for cold start (~90 seconds)
2. **Set up Zero Trust Access** — Protect `/_admin/` routes for device pairing
3. **Test chat integrations** — Add Telegram/Discord/Slack tokens if desired
4. **Enable R2 persistence** — Set R2 API credentials for data persistence across restarts

---

## The Mac Mini Gold Rush

Something interesting happened this week. Developers started buying Mac minis.

Not for the usual reasons—not for iOS builds or running a home server. They were buying them to run Moltbot, an open-source AI agent that had quietly been gaining traction among the "I want my own AI assistant" crowd.

Moltbot (now called OpenClaw after a rebrand) does something genuinely useful: it gives you a personal AI that remembers things, browses the web, reads your email, and responds to you via WhatsApp or Telegram or Slack. It's the AI assistant people imagined when ChatGPT first launched, except it actually integrates with your life instead of living in a browser tab.

The catch? You need to run it somewhere. And "somewhere" traditionally meant your own hardware.

Hence the Mac minis.

---

## The Security Problem Nobody Wanted to Talk About

Here's where it gets uncomfortable.

When you run an AI agent on your home network, you're making a series of security trade-offs that most people don't fully understand. Let me be specific:

**Your AI agent has system access.** It can read files, write files, execute commands. That's the whole point—it needs to do things on your behalf. But "system access" on your personal machine means access to everything.

**You're exposing your home network.** To access your agent remotely (from your phone, from work, from anywhere useful), you need to open ports. This means your home IP address is now a target. Most home routers weren't designed with "I'm running a publicly accessible AI service" in mind.

**Your API keys live on that machine.** Anthropic keys, OpenAI keys, integrations for every service you've connected. If someone compromises your home server, they get everything.

**There's no audit trail.** When something goes wrong—and in security, something always eventually goes wrong—you have no logs, no access records, no way to know what happened.

The security community noticed. The conversations in forums and Discord servers had a recurring theme: "This is really cool, but I'm not sure I want to run it at home."

---

## Then Cloudflare Did Something Clever

On January 29, 2026, Cloudflare published [Moltworker](https://github.com/cloudflare/moltworker), and suddenly the trade-off equation changed.

Moltworker runs OpenClaw entirely on Cloudflare's infrastructure. No Mac mini required. No ports to open. No hardware to maintain.

The interesting part isn't that they got it to run on Workers—that's table stakes for Cloudflare engineering. The interesting part is *how* they solved the security problems that made home deployment uncomfortable.

Let me walk through it.

---

## Security Through Architecture

Cloudflare's approach uses three layers of authentication, each solving a different problem:

**Layer 1: Zero Trust Access**

Instead of "anyone who knows the IP address can try to connect," Moltworker uses Cloudflare Access. You authenticate with your identity—email, Google, GitHub, whatever you've configured. No identity, no access. Period.

This is fundamentally different from port forwarding. With port forwarding, you're saying "trust the network." With Zero Trust, you're saying "trust the person." The network becomes irrelevant.

**Layer 2: Gateway Token**

Even after passing Zero Trust, you need a 256-bit random token to access the Control UI. This is defense in depth—if somehow Zero Trust has a vulnerability, the attacker still needs a secret they don't have.

**Layer 3: Device Pairing**

Every new device—every browser, every app—must be explicitly approved by an admin. Your phone doesn't automatically get access just because you logged in once. Someone has to say "yes, this device is allowed."

Three layers. Each one independent. Each one solving a different attack vector.

---

## The Infrastructure Beneath

The security model is built on top of Cloudflare's actual infrastructure:

**Sandboxes** run your OpenClaw instance in an isolated container. If something goes wrong, it's contained. The container has no access to other customers, no access to Cloudflare's systems, no access to anything except what you've explicitly configured.

**R2 Storage** keeps your data persistent and encrypted at rest. Conversations, configurations, paired devices—all stored in object storage designed for durability.

**AI Gateway** routes your model requests with full visibility. You can see every API call, track costs, set rate limits, configure fallbacks if a provider goes down.

**Browser Rendering** gives your agent web access without running a browser on your home network. Screenshots, form filling, navigation—all happening in Cloudflare's infrastructure.

The whole thing costs about $5/month. That's the Workers paid plan. Everything else has free tiers that handle normal personal use.

---

## Why This Matters to Us

We've been building toward this.

The CREATE SOMETHING thesis has always been "Automation Infrastructure"—the layer between human intention and system execution. The thing that makes outcomes possible while you sleep.

OpenClaw on Cloudflare Workers is exactly that layer. You tell your agent what you want via WhatsApp. It runs on Cloudflare's global network. Things happen. You don't manage servers.

The Automotive Framework we talk about? This is a perfect implementation:

| Vehicle Part | Cloudflare Product | What It Does |
|--------------|-------------------|--------------|
| Engine | Workers | Routes requests, runs logic |
| Transmission | Sandboxes | Coordinates the agent runtime |
| Fuel Tank | R2 | Stores persistent data |
| Turbocharger | AI Gateway | Adds intelligence |
| Cockpit | Control UI | Where you see what's happening |
| Ignition | Chat message | What starts the whole thing |

The metaphor isn't forced here. It's actually how the system works.

---

## What We're Testing

This experiment has a specific question: **Can we recommend this to clients?**

Not "does it work?" We know it works—Cloudflare's blog post demonstrates it, the GitHub repo has 2,500+ stars, developers are deploying it successfully.

The question is whether it's ready for the people we work with. Business users. Non-technical founders. People who want an AI assistant without becoming infrastructure engineers.

Here's what we need to validate:

**Deployment complexity.** The README looks straightforward, but READMEs always look straightforward. We need to actually do it and document where people will get stuck.

**Cold start latency.** Sandboxes need to spin up. How long does that take? Is it annoying? Does it matter for real usage patterns?

**Cost at scale.** The $5/month baseline is clear. But what happens with heavy use? What does a month of real usage actually cost?

**Security model in practice.** The architecture looks solid. But we need to test it—try to break it, document the threat model, understand what's protected and what isn't.

**Chat integration reliability.** WhatsApp, Telegram, Slack—these integrations are the whole point. Do they actually work well?

---

## The Deployment Path

Here's what deployment looks like:

```bash
# Clone the repo
git clone https://github.com/cloudflare/moltworker.git
cd moltworker

# Install dependencies
npm install

# Set your AI provider key
npx wrangler secret put ANTHROPIC_API_KEY

# Generate a gateway token (save this somewhere safe)
export TOKEN=$(openssl rand -hex 32)
echo "Your token: $TOKEN"
echo "$TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN

# Deploy
npm run deploy
```

After deployment, you configure Zero Trust Access through the Cloudflare dashboard, set up R2 for persistence, and optionally connect chat platforms.

The first request takes 1-2 minutes because the container needs to start. After that, it's fast.

---

## Use Cases We're Interested In

**Personal productivity.** "Check my email and summarize anything important." "Schedule a call with Sarah for next week." "Research this topic and create a brief."

**Developer workflows.** "Watch my GitHub notifications." "When CI fails, analyze the logs." "Run this script every morning and tell me the results."

**Business operations.** "Track social media mentions of our brand." "Send follow-ups to leads who haven't responded in three days." "Generate a weekly report from these metrics."

These aren't hypothetical—they're the kinds of tasks clients ask us about. The question is whether OpenClaw on Cloudflare is the right answer.

---

## What Could Go Wrong

Let's be honest about the risks:

**Moltworker is a proof of concept, not a product.** Cloudflare says this explicitly. They might stop maintaining it. The OpenClaw project might pivot. We'd need a plan for that.

**Container cold starts might frustrate users.** If your agent takes 90 seconds to wake up every time you message it, that's a bad experience. We need to understand this tradeoff.

**The security model is only as good as the configuration.** You can deploy this insecurely if you skip the Zero Trust setup or use weak tokens. Our guide needs to make the secure path the easy path.

**Support burden.** If we recommend this to clients, we're implicitly taking on some responsibility when things break. We need to understand common failure modes.

---

## Next Steps

1. **Deploy it.** Actually run through the setup on our Cloudflare account. Document every step, especially the confusing ones.

2. **Test the security model.** Try to access without authentication. Try to bypass device pairing. Document what's protected and what isn't.

3. **Measure the experience.** Cold start times. Response latency. What does daily use actually feel like?

4. **Document costs.** Run it for a month with real usage. Track every charge.

5. **Write the client guide.** If this validates, create something people can actually follow.

---

## Resources

**Cloudflare's announcement:** [Introducing Moltworker: a self-hosted personal AI agent, minus the minis](https://blog.cloudflare.com/moltworker-self-hosted-ai-agent)

**The repository:** [github.com/cloudflare/moltworker](https://github.com/cloudflare/moltworker)

**OpenClaw documentation:** [docs.openclaw.ai](https://docs.openclaw.ai/)

---

## The Bigger Picture

The Mac mini gold rush revealed something important: people want AI assistants that actually integrate with their lives. Not chatbots. Not copilots embedded in other products. Actual agents that do things.

The security concerns revealed something equally important: most people shouldn't be running internet-accessible services on their home networks. It's not that they can't—it's that the attack surface is too large and the expertise required is too specialized.

Cloudflare's infrastructure solves both problems simultaneously. You get the agent you want. Security professionals get the architecture they need. And you don't have to buy a Mac mini.

That's worth testing.

---

**Experiment Status:** 🔬 Research Phase  
**Next Action:** Deploy and document  
**Timeline:** Validation within one week

---

*This experiment connects to our broader work on automation infrastructure. If you're interested in the philosophy behind it, see the Automotive Framework section of CLAUDE.md.*
