import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  type ThresholdDwellingDimensionCandidate,
  type ThresholdDwellingPlanOpening
} from './dimensioned-project.js';

/**
 * Design-intent glazing policy for the Threshold Dwelling candidate.
 *
 * This records why the client chose the glass and what must still be decided;
 * it is not a window schedule, solar study, structural design, code analysis,
 * energy model, product selection, or construction authorization.
 */
export type ThresholdDwellingPlanDatumFacade = 'north' | 'east' | 'south' | 'west';

export interface ThresholdDwellingGlazingFacadeStrategy {
  planDatumFacade: ThresholdDwellingPlanDatumFacade;
  openingIds: readonly ThresholdDwellingPlanOpening['id'][];
  intent: string;
  planOpeningWidthIn: number;
  actualCompassOrientation: 'unmapped';
  requiredDeterminations: readonly string[];
}

export interface ThresholdDwellingGlazingPanelIntent {
  openingId: ThresholdDwellingPlanOpening['id'];
  planDatumFacade: ThresholdDwellingPlanDatumFacade;
  role: 'public-view' | 'sleeping-suite' | 'privacy-sensitive' | 'service-daylight';
  floorToCeilingVisualIntent: 'preferred' | 'selective' | 'not-specified';
  operation: 'not-specified';
  egress: 'professional-determination-required' | 'not-applicable';
  safetyGlazing: 'professional-determination-required';
  privacy: 'professional-determination-required';
}

export interface ThresholdDwellingGlazingStrategy {
  schemaVersion: 'workway.glazing-strategy.v1';
  projectId: ThresholdDwellingDimensionCandidate['id'];
  projectRevision: ThresholdDwellingDimensionCandidate['source']['revision'];
  status: 'candidate-design-intent';
  ownerIntent: string;
  siteOrientation: {
    status: 'unmapped';
    statement: string;
  };
  facadeStrategies: readonly ThresholdDwellingGlazingFacadeStrategy[];
  panelIntents: readonly ThresholdDwellingGlazingPanelIntent[];
  constructionReady: false;
}

const windowWidth = (id: ThresholdDwellingPlanOpening['id']): number => {
  const opening = THRESHOLD_DWELLING_DIMENSION_CANDIDATE.windows.find((item) => item.id === id);
  if (!opening) throw new Error(`Missing Threshold Dwelling glazing opening: ${id}`);
  return opening.planOpeningWidthIn;
};

const totalWidth = (ids: readonly ThresholdDwellingPlanOpening['id'][]): number =>
  ids.reduce((sum, id) => sum + windowWidth(id), 0);

const publicFacadeOpeningIds = [
  'window-kitchen',
  'window-living-dining',
  'window-open-zone'
] as const;

const sleepingFacadeOpeningIds = [
  'window-daughter-suite',
  'window-primary-bedroom',
  'window-primary-bath',
  'window-inlaw-suite'
] as const;

export const THRESHOLD_DWELLING_GLAZING_STRATEGY = {
  schemaVersion: 'workway.glazing-strategy.v1',
  projectId: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id,
  projectRevision: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.source.revision,
  status: 'candidate-design-intent',
  ownerIntent:
    'Maximize useful floor-to-ceiling glazing and the lived connection to the landscape without converting unresolved structural, safety, solar, privacy, or weather-protection questions into false precision.',
  siteOrientation: {
    status: 'unmapped',
    statement:
      'Plan north is a drawing datum only. No facade is assigned an actual compass orientation until the design is tied to a surveyed site plan.'
  },
  facadeStrategies: [
    {
      planDatumFacade: 'north',
      openingIds: publicFacadeOpeningIds,
      intent:
        'Treat the 43 ft public open-room edge as the primary view facade. The three plan openings total 31 ft and are the preferred floor-to-ceiling visual zone, while the remaining bays remain available for engineered structure, services, and facade coordination.',
      planOpeningWidthIn: totalWidth(publicFacadeOpeningIds),
      actualCompassOrientation: 'unmapped',
      requiredDeterminations: [
        'surveyed compass orientation and obstruction context',
        'facade-specific solar and shade study',
        'engineered support and lateral design',
        'energy model, glazing performance, and room-by-room HVAC loads',
        'tested water-management and installation details'
      ]
    },
    {
      planDatumFacade: 'south',
      openingIds: sleepingFacadeOpeningIds,
      intent:
        'Provide selective landscape connection to the sleeping-suite side. Preserve a dedicated operable exterior egress solution for each sleeping room and use layered privacy; floor-to-ceiling appearance is preferred only where those determinations support it.',
      planOpeningWidthIn: totalWidth(sleepingFacadeOpeningIds),
      actualCompassOrientation: 'unmapped',
      requiredDeterminations: [
        'room-by-room window-to-room mapping',
        'operable emergency escape/rescue or alternate egress determination',
        'privacy, sightline, and exterior-screen strategy',
        'hazardous-glazing and fall-protection determination',
        'solar, shade, and energy-performance coordination'
      ]
    },
    {
      planDatumFacade: 'east',
      openingIds: ['window-living-east'],
      intent:
        'Use the living-side opening as a selective side-light and cross-view, coordinated with arrival, entry privacy, and the east projection rather than as an unbroken glass wall.',
      planOpeningWidthIn: windowWidth('window-living-east'),
      actualCompassOrientation: 'unmapped',
      requiredDeterminations: [
        'entry/arrival privacy',
        'solar and glare response after site orientation is confirmed',
        'engineered facade support and water-management details'
      ]
    },
    {
      planDatumFacade: 'west',
      openingIds: ['window-west-hall'],
      intent:
        'Keep the hall opening selective until the actual site, privacy, and heat/glare context are known.',
      planOpeningWidthIn: windowWidth('window-west-hall'),
      actualCompassOrientation: 'unmapped',
      requiredDeterminations: [
        'privacy and exterior-screen strategy',
        'solar and glare response after site orientation is confirmed',
        'safety glazing and weather-protection details'
      ]
    }
  ],
  panelIntents: [
    ...publicFacadeOpeningIds.map((openingId) => ({
      openingId,
      planDatumFacade: 'north' as const,
      role: 'public-view' as const,
      floorToCeilingVisualIntent: 'preferred' as const,
      operation: 'not-specified' as const,
      egress: 'not-applicable' as const,
      safetyGlazing: 'professional-determination-required' as const,
      privacy: 'professional-determination-required' as const
    })),
    ...sleepingFacadeOpeningIds.map((openingId) => ({
      openingId,
      planDatumFacade: 'south' as const,
      role:
        openingId === 'window-primary-bath'
          ? ('privacy-sensitive' as const)
          : ('sleeping-suite' as const),
      floorToCeilingVisualIntent: 'selective' as const,
      operation: 'not-specified' as const,
      egress:
        openingId === 'window-primary-bath'
          ? ('not-applicable' as const)
          : ('professional-determination-required' as const),
      safetyGlazing: 'professional-determination-required' as const,
      privacy: 'professional-determination-required' as const
    })),
    {
      openingId: 'window-living-east',
      planDatumFacade: 'east',
      role: 'public-view',
      floorToCeilingVisualIntent: 'selective',
      operation: 'not-specified',
      egress: 'not-applicable',
      safetyGlazing: 'professional-determination-required',
      privacy: 'professional-determination-required'
    },
    {
      openingId: 'window-west-hall',
      planDatumFacade: 'west',
      role: 'service-daylight',
      floorToCeilingVisualIntent: 'not-specified',
      operation: 'not-specified',
      egress: 'not-applicable',
      safetyGlazing: 'professional-determination-required',
      privacy: 'professional-determination-required'
    }
  ],
  constructionReady: false
} as const satisfies ThresholdDwellingGlazingStrategy;
