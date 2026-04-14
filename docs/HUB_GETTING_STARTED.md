# The Hub: Getting Started for Clients and Agents

## Short version

The Hub is a single MCP entrypoint that gives you controlled access to many downstream tools and services.

Another way to say it:

The Hub is a central place where services can be accessed and authorized as needed, with enough structure for agents to build workflows on top of that access.

Instead of connecting an agent directly to a long list of separate MCP servers, the Hub sits in the middle and does four jobs:

1. shows what services are available to you
2. helps you find the right tool
3. applies identity, auth, and policy before anything runs
4. records what happened so the work is easier to inspect later

If you are new to the Hub, the main idea is simple:

- you connect to one Hub
- the Hub shows you the services you can use
- you pick a service
- you find the right proxy tool
- you run that tool through the Hub

## What the Hub is

The Hub is the governed front door for MCP tool use.

You can think of it as a mix of:

- a directory
- a router
- a policy layer
- a record keeper

It is a directory because it helps you discover what services and tools are available.

It is a router because it sends your request to the right downstream MCP server.

It is a policy layer because it can limit what you are allowed to see or do based on identity, auth state, and session rules.

It is a record keeper because it can trace calls and make debugging easier.

## Why the Hub exists

Without a Hub, agents often need to connect to many MCP servers directly. That creates a few problems:

- tool catalogs get noisy and hard to navigate
- users can see too many things at once
- auth and reconnect flows become inconsistent
- policy is harder to apply in one place
- it becomes harder to trace what happened across systems

The Hub solves that by giving you one house surface instead of a pile of raw provider surfaces.

It also gives agents a more reliable base for workflow-building. Once the right services are visible and authorized, an agent can chain actions together without needing every integration to be handled as a separate one-off connection.

## What the Hub is not

The Hub is not the tool itself.

For example, if you send a Slack message through the Hub, the Hub is not replacing Slack. It is helping you reach the correct Slack tool in a safer and more organized way.

The Hub is also not a promise that every service is available to every person. Visibility can change based on:

- your account or session
- the discovery settings for your lane
- whether a service is connected
- policy rules

## The basic mental model

Here is the simplest way to think about it:

`You or your agent -> Hub -> right service -> right tool -> result`

The Hub is the layer that makes sure the jump from "I need something done" to "run this exact tool" happens in a controlled way.

## Important terms

### Service

A service is a downstream system or toolkit the Hub can expose.

Examples:

- Slack
- Notion
- Gmail
- Airtable
- GitHub

In the Hub flow, you normally start by looking at services, not individual tools.

### Proxy tool

A proxy tool is the Hub-safe version of a downstream tool.

Instead of calling a raw downstream tool directly, you call a Hub-visible proxy tool by name through `hub_execute_proxy_tool`.

### Discovery

Discovery is how the Hub decides what tools or services to show you.

The Hub can keep discovery narrow on purpose so the experience stays manageable.

### Discovery pack

A discovery pack is a named preset that defines a useful default set of visible services.

This matters most in shared or client-facing Hub environments, where showing everything by default is usually a bad idea.

### Session

A session is the identity context the Hub uses to understand who is making the request and what scope they should have.

### Policy

Policy is the rule layer that determines what is allowed, blocked, or requires a tighter path.

### Trace

A trace is the record of what happened during execution so a team can inspect a flow later.

## How the Hub works in practice

For most work, the Hub follows a broker flow.

That means you do not jump straight to a raw tool name. You move through a small sequence:

1. list the services
2. search for tools inside the chosen service
3. inspect the tool schema if needed
4. execute the selected proxy tool

This is the standard flow:

### 1. See available services

Use:

```json
{
  "name": "hub_list_services",
  "arguments": {}
}
```

This gives you the services currently visible to your account or session.

### 2. Search for the right tool inside a service

Use:

```json
{
  "name": "hub_search_proxy_tools",
  "arguments": {
    "serverName": "composio-toolkit-slack",
    "query": "send message",
    "limit": 5
  }
}
```

This returns a smaller set of matching proxy tools.

If you already know the service, pass `serverName`. That keeps discovery cleaner and faster.

### 3. Inspect the tool before running it

Use:

```json
{
  "name": "hub_describe_proxy_tool",
  "arguments": {
    "proxyToolName": "composio-toolkit-slack__slack_send_message"
  }
}
```

This helps when you need to confirm the input shape before execution.

### 4. Execute the tool through the Hub

Use:

```json
{
  "name": "hub_execute_proxy_tool",
  "arguments": {
    "proxyToolName": "composio-toolkit-slack__slack_send_message",
    "args": {
      "channel": "C123456",
      "text": "hello from the Hub"
    }
  }
}
```

The Hub then routes the request to the correct downstream MCP server and returns the result.

## What beginners should actually do

If you are a client or operator working with an agent:

1. start with the outcome you want, not the tool name
2. pick the service that best matches that outcome
3. authenticate or reconnect when the Hub asks you to
4. let the agent inspect the tool before execution if the schema is not obvious
5. expect the Hub to show only the tools you are supposed to use

Good prompt:

`Find the Slack service, check which send-message tool is available, and draft the message before sending it.`

Less useful prompt:

`Call whatever hidden Slack tool exists and send this immediately.`

The Hub is designed to make the first prompt work better than the second one.

## What agents should do

If you are building or prompting an agent that uses the Hub, follow this pattern:

1. use `hub_list_services` first
2. use `hub_search_proxy_tools` with `serverName` whenever you know the service
3. use `hub_describe_proxy_tool` before execution when the input shape is unclear
4. use `hub_execute_proxy_tool` for execution
5. do not assume a hidden tool is available just because a provider supports it

For auth and reconnect flows:

1. search for `__connection_status` or `__get_connect_link`
2. run that proxy tool through the Hub
3. present the returned connect link to the human
4. stop and wait for the human to complete auth

That pause is important. The correct next step is often "let the person finish auth," not "keep retrying."

## Why the broker flow matters

The broker flow may look like an extra step, but it solves real problems:

- it keeps large tool catalogs usable
- it makes auth flows more consistent
- it gives policy a clear place to act
- it keeps shared client environments safer
- it makes debugging easier because the route is explicit

In other words, the Hub is opinionated on purpose.

## Common beginner questions

### Why can’t I see a tool I expected?

Usually one of these is true:

- your session does not allow it
- your current discovery view is narrower than full catalog mode
- the service is not connected
- policy blocks that route

### Why do I need to list services first?

Because the Hub is designed to be service-first, not chaos-first.

Starting with services keeps the system understandable for humans and tractable for agents.

### Why describe a tool before running it?

Because tool names alone are often not enough. The describe step reduces bad calls caused by guessing the input schema.

### What happens if direct proxy tools are disabled?

That is the standard posture in broker-first Hub setups.

When direct proxy tools are disabled, use:

1. `hub_list_services`
2. `hub_search_proxy_tools`
3. `hub_describe_proxy_tool`
4. `hub_execute_proxy_tool`

### Is the Hub only for technical users?

No. A semi-technical operator should be able to use the Hub if they keep the mental model simple:

- choose the service
- find the tool
- inspect if needed
- run through the Hub

The deeper implementation details matter more for the people operating the system than for the people using it day to day.

## A simple example

Imagine you want an agent to send a message in Slack.

The clean Hub path is:

1. list services and confirm Slack is available
2. search Slack tools for "send message"
3. describe the returned proxy tool if needed
4. execute that proxy tool with the message payload

The important point is that the Hub helps the agent choose the correct path instead of guessing.

## A good default mindset

When using the Hub, think:

- one entrypoint
- service-first discovery
- proxy-tool execution
- policy before action
- traceability after action

That mindset will keep most beginner workflows on the right path.

## If you remember only five things

1. The Hub is the front door, not the destination.
2. Start with services, not raw tool names.
3. Use proxy tools through the Hub, not direct downstream calls.
4. Expect identity, auth, and policy to shape what you can see.
5. When in doubt, inspect the tool before you execute it.

## Deeper technical references

If you need the technical or architectural layer after reading this guide, the next documents to open are:

- `docs/MCP_HUB_CONTROL_PLANE.md`
- `packages/cs-mcp-hub/README.md`
- `packages/cs-mcp-hub-remote/README.md`
