const { fail, pass, passOnSkip, summarizeText } = require('./shared.cjs');

module.exports = (output) => {
  const skipped = passOnSkip(output);
  if (skipped) {
    return skipped;
  }

  const text = summarizeText(output);
  if (/Direct proxy tools are disabled/i.test(text)) {
    return pass('Direct proxy execution is blocked and the Hub returns the broker-only guidance message.');
  }

  return fail(`Expected direct proxy denial message. status=${output && output.status} text=${text.slice(0, 220)}`);
};
