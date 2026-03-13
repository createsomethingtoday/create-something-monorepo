const { fail, pass, passOnSkip, summarizeText } = require('./shared.cjs');

module.exports = (output) => {
  const skipped = passOnSkip(output);
  if (skipped) {
    return skipped;
  }

  const body = output && output.body ? output.body : null;
  const tools =
    body && body.result && body.result.structuredContent ? body.result.structuredContent.tools : undefined;

  if (output && output.ok && !body?.error && Array.isArray(tools)) {
    return pass(`hub_search_proxy_tools returned a structured tool envelope with ${tools.length} visible tools.`);
  }

  return fail(
    `Expected a structured hub_search_proxy_tools response. status=${output && output.status} text=${summarizeText(output).slice(0, 220)}`,
  );
};
