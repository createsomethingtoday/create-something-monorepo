export type NpgLocationReviewStatus = 'approved' | 'review_required';

export interface NpgLocationRecord {
  id: string;
  name: string;
  aliases: readonly string[];
  street: string;
  city: string;
  state: string;
  postalCode?: string;
  building?: string;
  floor?: string;
  suite?: string;
  office?: string;
  facilityLabel: 'Regus or HQ';
  status: NpgLocationReviewStatus;
  reviewReason?: string;
  sourceVersion: string;
}

export interface CallerSafeNpgLocation {
  id: string;
  name: string;
  addressLines: string[];
  building?: string;
  floor?: string;
  suite?: string;
  office?: string;
  facilityLabel: 'Regus or HQ';
  arrivalNote: string;
  sourceVersion: string;
}

export type NpgLocationLookupResult =
  | { status: 'matched'; location: CallerSafeNpgLocation }
  | { status: 'review_required'; matches: string[]; message: string }
  | { status: 'ambiguous'; matches: string[]; message: string }
  | { status: 'not_found'; message: string };

const SOURCE_VERSION = 'client-directory-2026-07-29';

/**
 * Caller-safe projection of the client-provided directory. Protected provider
 * contacts and shared-office account identifiers do not belong in this module.
 */
export const npgLocationDirectory: readonly NpgLocationRecord[] = [
  {
    id: 'berlin-ct',
    name: 'NPG Berlin, CT',
    aliases: ['Berlin Connecticut', 'East Berlin Connecticut', 'East Berlin CT'],
    street: '1224 Mill Street',
    city: 'East Berlin',
    state: 'CT',
    postalCode: '06023',
    office: '212',
    facilityLabel: 'Regus or HQ',
    status: 'approved',
    sourceVersion: SOURCE_VERSION
  },
  {
    id: 'st-louis-mo',
    name: 'NPG St. Louis, MO',
    aliases: ['Saint Louis Missouri', 'St Louis Missouri', 'St Louis MO'],
    street: '2055 Craigshire Road',
    city: 'St. Louis',
    state: 'MO',
    postalCode: '63146',
    suite: '410',
    office: '406',
    facilityLabel: 'Regus or HQ',
    status: 'approved',
    sourceVersion: SOURCE_VERSION
  },
  {
    id: 'indianapolis-in',
    name: 'NPG Indianapolis, IN',
    aliases: ['Indianapolis Indiana', 'Indianapolis IN'],
    street: '9462 Counselors Row',
    city: 'Indianapolis',
    state: 'IN',
    postalCode: '46240',
    suite: '200',
    office: '239',
    facilityLabel: 'Regus or HQ',
    status: 'approved',
    sourceVersion: SOURCE_VERSION
  },
  {
    id: 'cleveland-oh',
    name: 'NPG Cleveland, OH',
    aliases: ['Cleveland Ohio', 'Cleveland OH'],
    street: '600 Superior Avenue East',
    city: 'Cleveland',
    state: 'OH',
    postalCode: '44114',
    building: 'Fifth Third Building',
    suite: '1300',
    office: '37',
    facilityLabel: 'Regus or HQ',
    status: 'approved',
    sourceVersion: SOURCE_VERSION
  },
  {
    id: 'new-york-ny',
    name: 'NPG New York, NY',
    aliases: ['New York City New York', 'New York NY', 'NYC'],
    street: '14 Wall Street',
    city: 'New York City',
    state: 'NY',
    postalCode: '10005',
    floor: '20th',
    office: '2060',
    facilityLabel: 'Regus or HQ',
    status: 'approved',
    sourceVersion: SOURCE_VERSION
  },
  {
    id: 'birmingham-al',
    name: 'NPG Birmingham, AL',
    aliases: ['Birmingham Alabama', 'Birmingham AL'],
    street: '2700 Corporate Drive',
    city: 'Birmingham',
    state: 'AL',
    postalCode: '35242',
    suite: '200',
    office: '252',
    facilityLabel: 'Regus or HQ',
    status: 'approved',
    sourceVersion: SOURCE_VERSION
  },
  {
    id: 'portland-me',
    name: 'NPG Portland, ME',
    aliases: ['Portland Maine', 'Portland ME'],
    street: '41 Hutchins Drive',
    city: 'Portland',
    state: 'ME',
    postalCode: '04102',
    building: 'Building 3',
    floor: '1st and 2nd',
    office: 'MR-G03',
    facilityLabel: 'Regus or HQ',
    status: 'review_required',
    reviewReason: 'The client directory lists two floors and needs one approved arrival path.',
    sourceVersion: SOURCE_VERSION
  },
  {
    id: 'memphis-tn',
    name: 'NPG Memphis, TN',
    aliases: ['Memphis Tennessee', 'Memphis TN'],
    street: '1661 International Drive',
    city: 'Memphis',
    state: 'TN',
    suite: '400',
    office: '474',
    facilityLabel: 'Regus or HQ',
    status: 'review_required',
    reviewReason: 'The client directory entry does not include a ZIP code.',
    sourceVersion: SOURCE_VERSION
  }
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bst\.?\b/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function searchableText(location: NpgLocationRecord): string {
  return normalize(
    [
      location.name,
      ...location.aliases,
      location.street,
      location.city,
      location.state,
      location.postalCode ?? ''
    ].join(' ')
  );
}

function toCallerSafeLocation(location: NpgLocationRecord): CallerSafeNpgLocation {
  const cityLine = `${location.city}, ${[location.state, location.postalCode].filter(Boolean).join(' ')}`;
  return {
    id: location.id,
    name: location.name,
    addressLines: [location.street, cityLine],
    ...(location.building ? { building: location.building } : {}),
    ...(location.floor ? { floor: location.floor } : {}),
    ...(location.suite ? { suite: location.suite } : {}),
    ...(location.office ? { office: location.office } : {}),
    facilityLabel: location.facilityLabel,
    arrivalNote:
      'Look for Regus or HQ signage. Tell reception the appointment is with The Nurse Practitioner Group, or NPG—not Loyal Source.',
    sourceVersion: location.sourceVersion
  };
}

export function findNpgLocation(
  query: string,
  directory: readonly NpgLocationRecord[] = npgLocationDirectory
): NpgLocationLookupResult {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return {
      status: 'not_found',
      message: 'Enter the city and state or the complete address from the appointment paperwork.'
    };
  }

  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 1);
  const matches = directory.filter((location) => {
    const haystack = searchableText(location);
    return queryTokens.every((token) => haystack.includes(token));
  });

  if (matches.length === 0) {
    return {
      status: 'not_found',
      message:
        'No approved location matches that information. An NPG representative must confirm the appointment site.'
    };
  }

  if (matches.length > 1) {
    return {
      status: 'ambiguous',
      matches: matches.map((location) => location.name),
      message:
        'More than one location could match. Add the city and state or ask an NPG representative to confirm the site.'
    };
  }

  const [location] = matches;
  if (location.status === 'review_required') {
    return {
      status: 'review_required',
      matches: [location.name],
      message: `${location.reviewReason ?? 'This record needs review'} An NPG representative must confirm the location before directions are given.`
    };
  }

  return { status: 'matched', location: toCallerSafeLocation(location) };
}
