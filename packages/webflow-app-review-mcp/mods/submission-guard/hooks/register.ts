import type { Register } from 'claude-code'

import { bashDenyReason, fileDenyReason, isBundleCommand } from './lib'

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const reason = bashDenyReason(e.command)
    if (reason) {
      $.ui.toast(reason)
      return { deny: reason }
    }
    if (isBundleCommand(e.command)) {
      const cwd = await $.session.cwd()
      let publicDir = 'public'
      try {
        const manifest = JSON.parse(await $.fs.read(`${cwd}/webflow.json`)) as { publicDir?: unknown }
        if (typeof manifest.publicDir === 'string' && manifest.publicDir) publicDir = manifest.publicDir
      } catch {
        // no manifest here; the CLI will say so
      }
      const entries = await $.fs.list(`${cwd}/${publicDir}`).catch(() => [])
      const maps = entries.filter(entry => entry.name.endsWith('.map')).map(entry => entry.name)
      if (maps.length > 0) {
        const deny = `submission-guard: ${publicDir}/ holds ${maps.join(', ')}; bundling now ships a source map to customers. Move it to review-artifacts/ first.`
        $.ui.toast(deny)
        return { deny }
      }
    }
    return next(e)
  })

  on('tool.call', { tool: 'Write' }, ($, e, next) => {
    const reason = fileDenyReason(e.file_path)
    if (reason) {
      $.ui.toast(reason)
      return { deny: reason }
    }
    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, ($, e, next) => {
    const reason = fileDenyReason(e.file_path)
    if (reason) {
      $.ui.toast(reason)
      return { deny: reason }
    }
    return next(e)
  })
}
