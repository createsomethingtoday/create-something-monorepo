const help = 'Supported edits: Rename <type name or id> to <new name>; Describe <type name or id> as <description>; Set the description of <type name or id> to <description>.';
const normalize = (value) => value.trim().toLocaleLowerCase('en-US');

function unquote(value) {
  const text = value.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
}

/** Apply one bounded, local vocabulary edit. Errors leave the input unchanged. */
export function editTypes(types, instruction) {
  if (!Array.isArray(types) || types.some((type) => !type || typeof type.id !== 'string' || typeof type.name !== 'string')) {
    throw new Error('Types must be an array of records with string id and name fields.');
  }
  if (typeof instruction !== 'string') throw new Error(help);
  const text = instruction.trim();
  let body;
  let separator;
  let field;
  if (/^rename\s+/i.test(text)) {
    body = text.replace(/^rename\s+/i, '').replace(/\.$/, '');
    separator = /\s+to\s+/gi;
    field = 'name';
  } else if (/^describe\s+/i.test(text)) {
    body = text.replace(/^describe\s+/i, '');
    separator = /\s+as\s+/gi;
    field = 'description';
  } else if (/^set\s+(?:the\s+)?description\s+of\s+/i.test(text)) {
    body = text.replace(/^set\s+(?:the\s+)?description\s+of\s+/i, '');
    separator = /\s+to\s+/gi;
    field = 'description';
  } else {
    throw new Error(help);
  }

  // Resolve every split against the vocabulary so names can contain "to" or "as".
  const candidates = [...body.matchAll(separator)].map((match) => {
    const selector = unquote(body.slice(0, match.index));
    const value = unquote(body.slice(match.index + match[0].length).replace(/(["'])\.$/, '$1'));
    const matches = types.map((type, index) => ({ type, index })).filter(({ type }) =>
      normalize(type.id) === normalize(selector) || normalize(type.name) === normalize(selector));
    return { selector, value, matches };
  });
  if (!candidates.length) throw new Error(help);
  const resolved = candidates.filter((candidate) => candidate.matches.length);
  if (!resolved.length) throw new Error(`No type matches "${candidates[0].selector}". Use an existing type name or id.`);
  if (resolved.length !== 1 || resolved[0].matches.length !== 1) {
    throw new Error('This edit is ambiguous. Use the exact type id and quote the type name and replacement.');
  }
  const { value, matches: [{ index }] } = resolved[0];
  if (!value) throw new Error('The replacement cannot be empty. ' + help);
  if (field === 'name') {
    const collision = types.find((type, candidateIndex) => candidateIndex !== index && normalize(type.name) === normalize(value));
    if (collision) throw new Error(`A type named "${collision.name}" already exists. Choose a different name.`);
  }
  return types.map((type, candidateIndex) => ({ ...type, ...(candidateIndex === index ? { [field]: value } : {}) }));
}
