import { expect, test } from 'claude-code/testing'

import { computeFlags, isRecordId, matchQueue, parseContext, parseHistory, parseTickets, resultJson, statusLine } from './lib'

const CONTEXT = {
  ok: true,
  data: {
    context: {
      versionId: 'recV', assetId: 'recA', appName: 'AltTextify Alt Text', reviewer: { name: 'Pablo Miranda' }, reviewStatus: '🆕Ready for Review', reviewType: 'Asset Update',
      asset: { appCapabilities: 'Hybrid', marketplaceStatus: '3️⃣Published🚀', visibilityStatus: 'Public', paymentTimes: ['Paid'], notes: 'For API KEY use abc', privacyPolicyUrl: 'https://x.test/privacy', termsAndConditionsUrl: 'https://x.test/terms', websiteUrl: 'https://x.test', demoVideoUrl: 'https://youtu.be/1', installUrl: 'https://x.test/authorize', clientId: 'f4cccb4b3893b4a6ad7dfb', iconImageAltText: 'logo', carouselImageUrls: ['a', 'b', 'c', 'd'] },
      version: { versionNumber: 46, daysInCurrentStage: 3, submissionDatetime: '2026-10-02T09:54:33.000Z', undecidedExceptionItems: 0, deniedExceptionItems: 0, assetUndecidedExceptions: 0, assetApprovedExceptions: 0, zendeskTicketId: '1201050' },
    },
  },
}
const HISTORY = { ok: true, data: { count: 46, versions: [
  { versionNumber: 46, reviewType: 'Asset Update', reviewStatus: '🆕Ready for Review', submissionDatetime: '2026-10-02T09:54:33.000Z' },
  { versionNumber: 44, reviewType: 'Asset Update', reviewStatus: '❌Rejected', rejectionReason: 'Guideline Infringement', submissionDatetime: '2026-08-18T09:44:01.000Z' },
  { versionNumber: 43, reviewType: 'Asset Update', reviewStatus: '❌Rejected', rejectionReason: 'App issue', submissionDatetime: '2026-08-01T09:44:01.000Z' },
  { versionNumber: 42, reviewType: 'Meta Update', reviewStatus: '❌Rejected', rejectionReason: 'App issue', submissionDatetime: '2026-07-01T09:44:01.000Z' },
] } }

test('a get_review_context payload becomes a snapshot with the right flags', () => {
  const s = parseContext(CONTEXT, 5)
  expect(s?.appName).toBe('AltTextify Alt Text')
  expect(s?.capability).toBe('Hybrid')
  expect(s?.reviewer).toBe('Pablo Miranda')
  expect(s?.urls.privacy).toBe('https://x.test/privacy')
  expect(s?.carouselCount).toBe(4)
  expect(s?.notesHint).toMatch(/credentials/)
  s!.history = parseHistory(HISTORY)
  const flags = computeFlags(s!)
  expect(flags.some(f => /Repeat: 3 of the last 4/.test(f))).toBe(true)
  expect(flags.some(f => /Data Client surface/.test(f))).toBe(true)
  expect(flags.some(f => /Paid/.test(f))).toBe(true)
  expect(flags.some(f => /Live app/.test(f))).toBe(true)
  expect(flags.some(f => /Aging/.test(f))).toBe(false)
  s!.flags = flags
  expect(statusLine(s!)).toMatch(/^AltTextify Alt Text v46 · Asset Update · 3d · Pablo · 5 flags$/)
})

test('history rows are newest first with the rejection reason', () => {
  const h = parseHistory(HISTORY)
  expect(h.total).toBe(46)
  expect(h.rows[0]?.n).toBe(46)
  expect(h.rows[1]?.status).toBe('Rejected')
  expect(h.rows[1]?.reason).toBe('Guideline Infringement')
})

test('undecided exception items and aging raise red flags; missing legal URLs are noticed', () => {
  const s = parseContext(CONTEXT, 5)!
  s.exceptions.undecided = 2
  s.days = 14
  s.urls = { website: 'https://x.test' }
  const flags = computeFlags(s)
  expect(flags[0]).toMatch(/Cannot approve: 2/)
  expect(flags.some(f => /Aging: 14 days/.test(f))).toBe(true)
  expect(flags.some(f => /Legal URL missing/.test(f))).toBe(true)
  expect(flags.some(f => /No demo video/.test(f))).toBe(true)
})

test('names resolve against the queue, record ids are recognised, results parse from text', () => {
  const queue = { ok: true, data: { records: [
    { assignableVersionId: 'rec1', appName: 'Outspire SEO Publisher', normalizedStatus: 'ready_to_review', submissionDatetime: '2026-09-29T17:56:51.000Z' },
    { assignableVersionId: 'rec2', appName: 'AltTextify Alt Text', normalizedStatus: 'ready_to_review', submissionDatetime: '2026-10-02T09:54:33.000Z' },
  ] } }
  expect(matchQueue(queue, 'alttextify')[0]?.versionId).toBe('rec2')
  expect(matchQueue(queue, 'nothing').length).toBe(0)
  expect(isRecordId('recg6Kq7nNMcicvMI')).toBe(true)
  expect(isRecordId('AltTextify')).toBe(false)
  expect(parseContext(resultJson({ text: `prefix\n${JSON.stringify(CONTEXT)}` }), 1)?.versionId).toBe('recV')
  expect(parseTickets({ ok: true, data: { tickets: [{ ticketId: '1', status: 'hold', updatedAt: '2026-10-05T17:53:39Z' }] } })[0]?.updatedAt).toBe('2026-10-05')
})
