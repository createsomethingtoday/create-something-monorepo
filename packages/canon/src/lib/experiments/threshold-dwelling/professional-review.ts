import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  type ThresholdDwellingDimensionCandidate
} from './dimensioned-project.js';

/**
 * Evidence the Composer must receive before it can request a human
 * construction-readiness determination. This is an intake, not a code engine
 * or a substitute for licensed review.
 */
export type ThresholdDwellingProfessionalReviewRequirementId =
  | 'licensed-site-survey'
  | 'coordinated-architectural-package'
  | 'structural-and-wind-design'
  | 'mechanical-electrical-plumbing-design'
  | 'energy-compliance-package'
  | 'jurisdictional-determination';

export type ThresholdDwellingEvidenceStatus = 'missing' | 'submitted' | 'accepted';

export interface ThresholdDwellingProfessionalReviewRequirement {
  id: ThresholdDwellingProfessionalReviewRequirementId;
  title: string;
  responsibleRole: string;
  requiredArtifacts: readonly string[];
  purpose: string;
}

export interface ThresholdDwellingEvidenceRecord {
  requirementId: ThresholdDwellingProfessionalReviewRequirementId;
  status: Exclude<ThresholdDwellingEvidenceStatus, 'missing'>;
  documentId: string;
  submittedBy: string;
  reviewedBy?: string;
}

export interface ThresholdDwellingProfessionalReviewRequirementAssessment extends ThresholdDwellingProfessionalReviewRequirement {
  status: ThresholdDwellingEvidenceStatus;
  evidence: ThresholdDwellingEvidenceRecord[];
}

export interface ThresholdDwellingProfessionalReviewAssessment {
  projectId: ThresholdDwellingDimensionCandidate['id'];
  modelStatus: ThresholdDwellingDimensionCandidate['status'];
  requirements: ThresholdDwellingProfessionalReviewRequirementAssessment[];
  missingRequirementIds: ThresholdDwellingProfessionalReviewRequirementId[];
  /** Evidence completion allows a human determination request; it never certifies construction readiness. */
  canRequestProfessionalDetermination: boolean;
  constructionReady: false;
  allowedUses: readonly [
    'visual walkthroughs',
    'rough program comparisons',
    'proposed-change previews',
    'decision capture'
  ];
}

/**
 * Human-determined workflow state. `issued` can reference a responsible
 * professional's external document but does not give WorkWay authority to
 * authorize construction.
 */
export type ThresholdDwellingProfessionalDeterminationStatus =
  | 'notRequested'
  | 'requested'
  | 'issued';

export interface ThresholdDwellingProfessionalDetermination {
  id: string;
  requirementId: ThresholdDwellingProfessionalReviewRequirementId;
  status: ThresholdDwellingProfessionalDeterminationStatus;
  scope: string;
  sourceDocumentId?: string;
  issuedBy?: string;
  issuerCredential?: string;
  issuedAt?: string;
  conditions: readonly string[];
}

/** A read model of determination progress, not a construction authorization. */
export interface ThresholdDwellingProfessionalDeterminationRegister {
  schemaVersion: 'workway.professional-review-packet.v1';
  projectId: ThresholdDwellingDimensionCandidate['id'];
  projectRevision: ThresholdDwellingDimensionCandidate['source']['revision'];
  determinations: readonly ThresholdDwellingProfessionalDetermination[];
  constructionReady: false;
}

export const THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS = [
  {
    id: 'licensed-site-survey',
    title: 'Licensed site survey',
    responsibleRole: 'Registered professional land surveyor',
    requiredArtifacts: [
      'sealed boundary and easement survey',
      'topographic grades and project datum',
      'utility and right-of-way context'
    ],
    purpose:
      'Establish the parcel, setbacks, access, grades, and site reference for every downstream drawing.'
  },
  {
    id: 'coordinated-architectural-package',
    title: 'Coordinated architectural package',
    responsibleRole: 'Architect or qualified residential design professional',
    requiredArtifacts: [
      'dimensioned plans, sections, and elevations',
      'wall, door, window, fixture, finish, accessibility/clearance, and glazing-intent schedules',
      'site/threshold and weather-protection details'
    ],
    purpose:
      'Resolve real assemblies, room use, egress/clearance intent, and coordination across drawings.'
  },
  {
    id: 'structural-and-wind-design',
    title: 'Structural and wind design',
    responsibleRole: 'Licensed structural engineer',
    requiredArtifacts: [
      'foundation, framing, roof/truss, and connection design',
      'lateral/wind bracing plan with design criteria',
      'calculation package and special inspection requirements, if applicable'
    ],
    purpose:
      'Establish the load path, wind resistance, foundation approach, and connection details.'
  },
  {
    id: 'mechanical-electrical-plumbing-design',
    title: 'Mechanical, electrical, and plumbing design',
    responsibleRole: 'Licensed or jurisdiction-qualified MEP professionals',
    requiredArtifacts: [
      'HVAC loads, equipment, distribution, ventilation, and condensate design',
      'electrical, low-voltage, lighting, and life-safety plans',
      'plumbing supply, waste, vent, fixture, and water-heating design'
    ],
    purpose:
      'Coordinate services with the architecture and confirm required systems are designed by qualified parties.'
  },
  {
    id: 'energy-compliance-package',
    title: 'Energy compliance package',
    responsibleRole: 'Energy rater or qualified energy-compliance professional',
    requiredArtifacts: [
      'jurisdiction-appropriate energy calculation or compliance report',
      'envelope, glazing, shading, air-sealing, and insulation specification',
      'HVAC efficiency and testing requirements'
    ],
    purpose: 'Set measurable envelope and systems performance for the glass-heavy pavilion concept.'
  },
  {
    id: 'jurisdictional-determination',
    title: 'Jurisdictional determination',
    responsibleRole: 'Authority having jurisdiction and project team',
    requiredArtifacts: [
      'zoning, plat, setback, and access determination',
      'permit-submittal requirements and adopted-code confirmation',
      'documented exceptions, conditions, and review comments'
    ],
    purpose:
      'Confirm the actual project path rather than treating general guidance as a permit decision.'
  }
] as const satisfies readonly ThresholdDwellingProfessionalReviewRequirement[];

const determinationScopeByRequirement: Record<
  ThresholdDwellingProfessionalReviewRequirementId,
  string
> = {
  'licensed-site-survey':
    'Establish the parcel boundary, easements, topographic datum, and site reference.',
  'coordinated-architectural-package':
    'Coordinate current plans, elevations, sections, schedules, glazing intent, and assembly details.',
  'structural-and-wind-design':
    'Establish foundation, load path, wind/bracing criteria, connections, and roof framing.',
  'mechanical-electrical-plumbing-design':
    'Coordinate HVAC, electrical, plumbing, ventilation, condensate, and equipment clearances.',
  'energy-compliance-package':
    'Establish the jurisdiction-appropriate energy compliance basis for the selected envelope and systems.',
  'jurisdictional-determination':
    'Confirm zoning, plat, setbacks, access, permit path, and authority conditions for the actual parcel.'
};

/**
 * The current register begins with no determination requested or issued. Future
 * clients attach a revision-specific external document and named issuer; they
 * may never infer a building permit from this data.
 */
export const THRESHOLD_DWELLING_PROFESSIONAL_DETERMINATION_REGISTER = {
  schemaVersion: 'workway.professional-review-packet.v1',
  projectId: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id,
  projectRevision: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.source.revision,
  determinations: THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.map((requirement) => ({
    id: `${requirement.id}-determination`,
    requirementId: requirement.id,
    status: 'notRequested' as const,
    scope: determinationScopeByRequirement[requirement.id],
    conditions: []
  })),
  constructionReady: false
} as const satisfies ThresholdDwellingProfessionalDeterminationRegister;

function statusForRequirement(
  requirementId: ThresholdDwellingProfessionalReviewRequirementId,
  evidence: readonly ThresholdDwellingEvidenceRecord[]
): ThresholdDwellingEvidenceStatus {
  const matchingEvidence = evidence.filter((record) => record.requirementId === requirementId);
  if (
    matchingEvidence.some(
      (record) => record.status === 'accepted' && Boolean(record.reviewedBy?.trim())
    )
  ) {
    return 'accepted';
  }
  if (matchingEvidence.length > 0) return 'submitted';
  return 'missing';
}

/**
 * Returns a transparent evidence register. It intentionally never returns
 * construction-ready: that determination belongs to the responsible
 * professionals and authority having jurisdiction.
 */
export function assessThresholdDwellingProfessionalReview(
  candidate: ThresholdDwellingDimensionCandidate,
  evidence: readonly ThresholdDwellingEvidenceRecord[] = []
): ThresholdDwellingProfessionalReviewAssessment {
  const requirements = THRESHOLD_DWELLING_PROFESSIONAL_REVIEW_REQUIREMENTS.map((requirement) => {
    const matchingEvidence = evidence.filter((record) => record.requirementId === requirement.id);
    return {
      ...requirement,
      status: statusForRequirement(requirement.id, evidence),
      evidence: [...matchingEvidence]
    };
  });
  const missingRequirementIds = requirements
    .filter((requirement) => requirement.status !== 'accepted')
    .map((requirement) => requirement.id);

  return {
    projectId: candidate.id,
    modelStatus: candidate.status,
    requirements,
    missingRequirementIds,
    canRequestProfessionalDetermination: missingRequirementIds.length === 0,
    constructionReady: false,
    allowedUses: [
      'visual walkthroughs',
      'rough program comparisons',
      'proposed-change previews',
      'decision capture'
    ]
  };
}
