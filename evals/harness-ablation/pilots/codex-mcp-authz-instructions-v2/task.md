# Task: repair MCP hub route classification

Work only in `@create-something/mcp-authz`.

Read-only downstream tools are being misclassified when their free-form
descriptions contain incidental words such as `state` or `trash`. Multiplexed
management tools also need to classify the concrete invocation action rather
than treating every action as the route name's broad default.

Implement a focused repair that:

- keeps stable route identifiers authoritative over free-form descriptions;
- lets an optional invocation action classify read, write, destructive,
  authentication-administration, and control-plane intent;
- threads that action through authorization-request construction and retained
  request metadata;
- preserves existing destructive, write, authentication, control-plane, OAuth,
  tag, and authorization behavior; and
- adds focused public regression tests.

Do not inspect repository history, remote sources, another run, or any commit
that may contain a prior solution. Do not change files outside
`packages/mcp-authz`.

Run the package's documented validation. Report only commands you actually ran
and keep source validation separate from any claim about deployment or live
runtime state.

