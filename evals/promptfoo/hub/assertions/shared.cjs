function passOnSkip(output) {
  if (!output || output.skipped !== true) {
    return null;
  }

  return {
    pass: true,
    score: 1,
    reason: `Skipped live Hub check: ${output.reason || 'missing live configuration'}`,
  };
}

function summarizeText(output) {
  const bodyMessage =
    output && output.body && output.body.error && typeof output.body.error.message === 'string'
      ? output.body.error.message
      : '';
  const responseText = output && typeof output.text === 'string' ? output.text : '';
  const transportError = output && typeof output.error === 'string' ? output.error : '';

  return [bodyMessage, responseText, transportError].filter(Boolean).join(' | ');
}

function fail(reason) {
  return {
    pass: false,
    score: 0,
    reason,
  };
}

function pass(reason) {
  return {
    pass: true,
    score: 1,
    reason,
  };
}

module.exports = {
  fail,
  pass,
  passOnSkip,
  summarizeText,
};
