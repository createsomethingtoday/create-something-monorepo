import { expect, test } from 'claude-code/testing'

import { bashDenyReason, fileDenyReason } from './lib'

test('submit-form requests and .map-into-public moves are refused; ordinary commands are not', () => {
  expect(bashDenyReason('curl -X POST https://developers.webflow.com/submit -d @packet.json')).toMatch(/developer's click/)
  expect(bashDenyReason('curl https://webflow-app-form.webflow.io/app-form/api/submit-form')).toMatch(/submits on the developer/)
  expect(bashDenyReason('cp review-artifacts/bundle.js.map public/')).toMatch(/review-artifacts/)
  expect(bashDenyReason('mv dist/bundle.js.map public/bundle.js.map')).toMatch(/review-artifacts/)
  expect(bashDenyReason('zip -r bundle.zip public review-artifacts/bundle.js.map')).toMatch(/private upload/)
  for (const ok of ['npm run build', 'ls public/', 'open https://developers.webflow.com/submit', 'cat review-artifacts/bundle.js.map | head', 'pnpm forge packet . listing.json']) {
    expect(bashDenyReason(ok)).toBe(null)
  }
})

test('writes and edits of a .map under public/ are refused', () => {
  expect(fileDenyReason('/app/public/bundle.js.map')).toMatch(/review-artifacts/)
  expect(fileDenyReason('public/x.map')).toMatch(/review-artifacts/)
  expect(fileDenyReason('/app/review-artifacts/bundle.js.map')).toBe(null)
  expect(fileDenyReason('/app/public/index.html')).toBe(null)
})

test('the engine sees a deny for a submit command and a pass for a build', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'built', stderr: '' } }))
  const denied = await $.tool.call({ tool: 'Bash', command: 'curl -X POST https://developers.webflow.com/submit' })
  expect(denied.deny).toMatch(/submission-guard/)
  const built = await $.tool.call({ tool: 'Bash', command: 'npm run build' })
  expect(built.deny).toBe(undefined)
})

test('a Write into public/*.map is refused before it reaches the engine', async ($, on) => {
  let reached = false
  on('tool.call', { tool: 'Write' }, () => {
    reached = true
    return { result: { type: 'create', filePath: '/app/public/bundle.js.map', content: '{}', structuredPatch: [] } }
  })
  const denied = await $.tool.call({ tool: 'Write', file_path: '/app/public/bundle.js.map', content: '{}' })
  expect(denied.deny).toMatch(/submission-guard/)
  expect(reached).toBe(false)
})
