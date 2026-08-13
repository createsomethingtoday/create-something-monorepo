import { describe, expect, it } from 'vitest';

import {
  THRESHOLD_DWELLING_PRIVATE_GEOMETRY_EVIDENCE_PACKET,
  applyThresholdDwellingPrivateGeometryEvidence,
  projectThresholdDwellingClientSafeGeometryIssuance,
  type ThresholdDwellingPrivateGeometryEvidencePacket
} from './geometry-evidence-packet.js';
import { THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE } from './geometry-issuance.js';

describe('Threshold Dwelling private geometry evidence packet', () => {
  it('unlocks only its accepted fact while omitting its private document reference from client delivery', () => {
    const packet: ThresholdDwellingPrivateGeometryEvidencePacket = {
      ...THRESHOLD_DWELLING_PRIVATE_GEOMETRY_EVIDENCE_PACKET,
      records: [
        {
          id: 'evidence-door-opening-r1',
          factId: 'door-opening-geometry',
          status: 'accepted',
          document: {
            documentId: 'architectural-r1',
            accessScope: 'private-project-graph',
            clientTransfer: 'excluded'
          },
          proposedValue: 'Issued door schedule and opening elevations, revision R1.',
          reviewedBy: 'Licensed design professional'
        }
      ]
    };

    const issuance = applyThresholdDwellingPrivateGeometryEvidence(
      THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE,
      packet
    );
    const projection = projectThresholdDwellingClientSafeGeometryIssuance(issuance);
    const doorFact = issuance.facts.find((fact) => fact.id === 'door-opening-geometry');
    const wallFact = issuance.facts.find((fact) => fact.id === 'exterior-wall-assembly-geometry');

    expect(doorFact).toMatchObject({
      evidenceStatus: 'accepted',
      sourceDocumentId: 'architectural-r1',
      verifiedBy: 'Licensed design professional'
    });
    expect(wallFact).toMatchObject({ evidenceStatus: 'missing', sourceDocumentId: null });
    expect(projection.canGeneratePhysicalOneToOneScene).toBe(false);
    expect(projection.unissuedFactIds).not.toContain('door-opening-geometry');
    expect(projection.clientSourceDocuments).toBe('excluded');
    expect(JSON.stringify(projection)).not.toContain('architectural-r1');
  });

  it('rejects a private file path in place of an opaque document identifier', () => {
    const packet: ThresholdDwellingPrivateGeometryEvidencePacket = {
      ...THRESHOLD_DWELLING_PRIVATE_GEOMETRY_EVIDENCE_PACKET,
      records: [
        {
          id: 'evidence-window-path-r1',
          factId: 'window-and-glass-opening-geometry',
          status: 'submitted',
          document: {
            documentId: '/Users/project/private-window-schedule.pdf',
            accessScope: 'private-project-graph',
            clientTransfer: 'excluded'
          },
          proposedValue: 'Window schedule, revision R1.'
        }
      ]
    };

    expect(() =>
      applyThresholdDwellingPrivateGeometryEvidence(
        THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE,
        packet
      )
    ).toThrow(/opaque document ID/);
  });
});
