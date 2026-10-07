/** Why a Bash command is refused, or null when it is fine. */
export function bashDenyReason(command: string): string | null {
  const c = command.trim()
  if (/developers\.webflow\.com\/submit\b/i.test(c) && /\b(curl|wget|http|fetch|xh)\b/i.test(c)) {
    return 'submission-guard: the Marketplace submission is the developer\'s click, not a command. Hand over the packet instead.'
  }
  if (/app-form\/api\/(submit-form|submission-intent)\b/i.test(c)) {
    return 'submission-guard: posting to the submission form API submits on the developer\'s behalf. The packet is the handoff; the developer submits.'
  }
  if (/\b(cp|mv|rsync|install)\b[^|;&]*\.map\b[^|;&]*\bpublic\//.test(c) || /\bpublic\/[^|;&\s]*\.map\b/.test(c) && /\b(cp|mv|rsync|touch|tee|install)\b/.test(c)) {
    return 'submission-guard: a .map in public/ ships inside bundle.zip. Source maps go to review-artifacts/ and the form\'s private upload.'
  }
  if (/\bzip\b[^|;&]*\.map\b/.test(c)) {
    return 'submission-guard: zipping a .map puts it in the artifact customers run. Attach it to the form\'s private upload instead.'
  }
  return null
}

/** Why a Write or Edit to this path is refused, or null. */
export function fileDenyReason(filePath: string): string | null {
  if (/(^|\/)public\/.*\.map$/.test(filePath)) {
    return 'submission-guard: source maps never go in public/. Write to review-artifacts/ instead.'
  }
  return null
}

export function isBundleCommand(command: string): boolean {
  return /\bwebflow\s+extension\s+bundle\b/.test(command)
}
