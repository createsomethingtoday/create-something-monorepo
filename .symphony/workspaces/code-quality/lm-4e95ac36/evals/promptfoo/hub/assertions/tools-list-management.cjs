const { fail, pass, passOnSkip, summarizeText } = require('./shared.cjs');

module.exports = (output) => {
  const skipped = passOnSkip(output);
  if (skipped) {
    return skipped;
  }

  const tools = output && output.body && output.body.result ? output.body.result.tools : undefined;
  if (!Array.isArray(tools)) {
    return fail(`Expected tools/list to return a tool array. ${summarizeText(output).slice(0, 220)}`);
  }

  const names = tools.map((tool) => tool && tool.name).filter((name) => typeof name === 'string');
  const hasCoreBrokerTools = names.includes('hub_search_proxy_tools') && names.includes('hub_execute_proxy_tool');
  const onlyHubTools = names.every((name) => name.startsWith('hub_'));

  if (output.ok && hasCoreBrokerTools && onlyHubTools) {
    return pass(`tools/list returned ${names.length} management tools and no direct proxy tools.`);
  }

  return fail(
    `Expected broker-only management tool list. names=${JSON.stringify(names)} text=${summarizeText(output).slice(0, 180)}`,
  );
};
