const { fail, pass, passOnSkip, summarizeText } = require('./shared.cjs');

module.exports = (output) => {
  const skipped = passOnSkip(output);
  if (skipped) {
    return skipped;
  }

  const text = summarizeText(output);
  const enforced =
    output &&
    output.ok === false &&
    /X-MCP-Session-Token|session_required|Missing X-MCP-Session-Token|Unauthorized MCP session token/i.test(text);

  if (enforced) {
    return pass('Hub rejects requests without a session token in strict identity mode.');
  }

  return fail(
    `Expected strict identity enforcement, received status=${output && output.status} text=${text.slice(0, 220)}`,
  );
};
