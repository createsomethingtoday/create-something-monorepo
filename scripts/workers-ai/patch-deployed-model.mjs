// CRE-2475: bounded patch for exact deployed bundles. No config or migrations.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export function patch(name, source) {
  const old = '@cf/meta/llama-3.1-8b-instruct';
  const expected = name === 'webflow-apps-audit-agent' ? 2 : 1;
  if (source.split(old).length - 1 !== expected) throw new Error('Unexpected model occurrence count');
  let result = source.replaceAll(old, MODEL);
  const changes = {
    'scanner-worker': ['if ("response" in response && typeof response.response === "string") {\n      return parseAIResponse(response.response);', 'if ("response" in response && response.response != null) {\n      return parseAIResponse(typeof response.response === "string" ? response.response : JSON.stringify(response.response));'],
    'webflow-apps-audit-agent': ['const text = response.response || "";', 'const value = typeof response === "object" && response !== null && "response" in response ? response.response : response;\n    const text = typeof value === "string" ? value : JSON.stringify(value ?? null);'],
    'plagiarism-agent': ['const result = extractJSON(response.response);', 'const result = extractJSON(typeof response.response === "string" ? response.response : JSON.stringify(response.response ?? null));']
  };
  if (!changes[name]) throw new Error('Unapproved worker');
  const [before, after] = changes[name];
  if (result.split(before).length !== 2) throw new Error('Unexpected parser occurrence count');
  result = result.replace(before, after);
  if (result.replace(after,before).replaceAll(MODEL,old) !== source) throw new Error('Patch is not reversible');
  return result;
}
if (process.argv[1]?.endsWith('patch-deployed-model.mjs')) {
  const [name,input,output] = process.argv.slice(2);
  const source=readFileSync(input,'utf8'); const result=patch(name,source);
  writeFileSync(output,result);
  console.log(JSON.stringify({name,beforeSha256:createHash('sha256').update(source).digest('hex'),afterSha256:createHash('sha256').update(result).digest('hex')}));
}
