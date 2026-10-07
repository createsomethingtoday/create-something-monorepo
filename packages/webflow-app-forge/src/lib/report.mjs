// Shared finding shape and renderers.
//
// finding = { check, status: 'pass'|'fail'|'warn'|'skip', severity, title, detail?, evidence?: [string] }

const ORDER = { blocker: 0, required: 1, suggested: 2 };

export function finding(check, status, severity, title, detail = '', evidence = []) {
  return { check, status, severity, title, detail, evidence };
}

export function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const s = statusRank(a.status) - statusRank(b.status);
    if (s !== 0) return s;
    return (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9);
  });
}

function statusRank(status) {
  return { fail: 0, warn: 1, skip: 2, pass: 3 }[status] ?? 4;
}

export function summarize(findings) {
  const failures = findings.filter((f) => f.status === 'fail');
  const blockers = failures.filter((f) => f.severity === 'blocker');
  const required = failures.filter((f) => f.severity === 'required');
  const warnings = findings.filter((f) => f.status === 'warn' || (f.status === 'fail' && f.severity === 'suggested'));
  return {
    ready: blockers.length === 0 && required.length === 0,
    blockers: blockers.length,
    required: required.length,
    warnings: warnings.length,
    passed: findings.filter((f) => f.status === 'pass').length,
  };
}

export function renderText(title, findings) {
  const s = summarize(findings);
  const lines = [];
  lines.push(`${title}: ${s.ready ? 'READY' : 'NOT READY'}  (${s.blockers} blocker, ${s.required} required, ${s.warnings} suggested, ${s.passed} passed)`);
  for (const f of sortFindings(findings)) {
    const mark = f.status === 'pass' ? 'ok  ' : f.status === 'fail' ? (f.severity === 'suggested' ? 'warn' : 'FAIL') : f.status === 'warn' ? 'warn' : 'skip';
    lines.push(`  ${mark} [${f.severity}] ${f.check}: ${f.title}`);
    if (f.status !== 'pass' && f.detail) lines.push(`         ${f.detail}`);
    for (const e of (f.evidence || []).slice(0, 5)) lines.push(`         - ${e}`);
  }
  return lines.join('\n');
}
