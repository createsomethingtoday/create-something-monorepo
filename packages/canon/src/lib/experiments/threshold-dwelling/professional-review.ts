import type { ThresholdDwellingDimensionCandidate } from './dimensioned-project.js';

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

export interface ThresholdDwellingProfessionalReviewRequirementAssessment
  extends ThresholdDwellingProfessionalReviewRequirement {
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
    purpose: 'Establish the parcel, setbacks, access, grades, and site reference for every downstream drawing.'
  },
  {
    id: 'coordinated-architectural-package',
    title: 'Coordinated architectural package',
    responsibleRole: 'Architect or qualified residential design professional',
    requiredArtifacts: [
      'dimensioned plans, sections, and elevations',
      'wall, door, window, fixture, finish, and accessibility/clearance schedules',
      'site/threshold and weather-protection details'
    ],
    purpose: 'Resolve real assemblies, room use, egress/clearance intent, and coordination across drawings.'
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
    purpose: 'Establish the load path, wind resistance, foundation approach, and connection details.'
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
    purpose: 'Coordinate services with the architecture and confirm required systems are designed by qualified parties.'
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
    purpose: 'Confirm the actual project path rather than treating general guidance as a permit decision.'
  }
] as const satisfies readonly ThresholdDwellingProfessionalReviewRequirement[];

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
