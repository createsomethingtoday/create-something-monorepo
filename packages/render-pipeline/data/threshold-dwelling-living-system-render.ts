/**
 * Receipt for a design-visualization asset, not a construction representation.
 * The image is deliberately retained with its plan dependency and prompt so a
 * later WorkWay session can compare it to a future accepted project revision.
 */
export const THRESHOLD_DWELLING_LIVING_SYSTEM_PUBLIC_ROOM_RENDER = {
  schemaVersion: 'workway.render-receipt.v1',
  id: 'threshold-dwelling-rev-0.8-public-room-hero-v1',
  status: 'proposed-design-visualization',
  project: {
    id: 'threshold-dwelling',
    baseRevision: '0.7',
    derivedRevision: '0.8'
  },
  sourcePlan: {
    path: 'packages/space/static/experiments/threshold-dwelling/renders/floor-plan.png',
    role: 'spatial-reference-only'
  },
  asset: {
    path: 'packages/space/static/experiments/threshold-dwelling/renders/living-system-public-room-hero-v1.png',
    sha256: 'ff78a4af53c0c1117c1cf83db22e451728733dffaba9bd2356a046ebc9ad63ba',
    publication: 'unpublished-local-project-asset'
  },
  generation: {
    method: 'OpenAI built-in image generation',
    inputRole: 'floor plan supplied as a spatial reference, not an edit target',
    prompt:
      'Calm, credible high-end architectural interior visualization of the Rev 0.8 shared public room: kitchen, dining, and living bays in a single 43 ft by 13 ft low horizontal pavilion room; a 9 ft by 3 ft island and 30 in-deep kitchen run; clear 7 ft circulation edge; floor-to-ceiling public glazing; low-sheen polished concrete; quiet mineral walls; one restrained cedar public-room ceiling plane; durable casework; no text, people, site claim, or construction-document implication.'
  },
  visualChecks: {
    publicRoomSequenceVisible: true,
    circulationEdgeVisiblyClear: true,
    continuousConcreteDatumVisible: true,
    cedarLimitedToPublicCeilingPlane: true,
    constructionEvidence: 'not-supplied'
  },
  constructionReady: false
} as const;
