/**
 * Masters — The philosophical and design influences behind CREATE SOMETHING.
 * Static content embedded in source. These are the thinkers whose principles
 * inform the Subtractive Triad and Canon Design System.
 */

import type { Master } from './types.js';

export const MASTERS: Master[] = [
  {
    slug: 'dieter-rams',
    name: 'Dieter Rams',
    discipline: 'Industrial Design',
    era: '1932–present',
    philosophy: '"Weniger, aber besser" — Less, but better. Good design is as little design as possible. Back to purity, back to simplicity.',
    principles: [
      'Good design is innovative',
      'Good design makes a product useful',
      'Good design is aesthetic',
      'Good design makes a product understandable',
      'Good design is unobtrusive',
      'Good design is honest',
      'Good design is long-lasting',
      'Good design is thorough down to the last detail',
      'Good design is environmentally friendly',
      'Good design is as little design as possible'
    ],
    influence: 'The second level of the Subtractive Triad — "Does this earn its existence?" Every artifact must justify its presence. Rams\'s ten principles are the direct ancestors of Canon\'s design philosophy.'
  },
  {
    slug: 'martin-heidegger',
    name: 'Martin Heidegger',
    discipline: 'Philosophy',
    era: '1889–1976',
    philosophy: 'Being and Time (Sein und Zeit). Understanding emerges through the hermeneutic circle — parts illuminate whole, whole gives meaning to parts. Tools recede into transparent use (Zuhandenheit) until they break down (Vorhandenheit).',
    principles: [
      'Zuhandenheit (ready-to-hand): Tools disappear in use — the hammer vanishes when hammering',
      'Vorhandenheit (present-at-hand): Breakdown reveals the tool — attention shifts from task to mechanism',
      'Hermeneutic circle: Understanding deepens through iteration between parts and whole',
      'Gelassenheit (releasement): Neither rejection nor submission to technology — full engagement without capture',
      'Gestell (enframing): Technology that fills every gap is not efficiency but invasion',
      'Dwelling: The authentic way of being in the world — technology should enable dwelling, not replace it'
    ],
    influence: 'The third level of the Subtractive Triad — "Does this serve the whole?" The hermeneutic circle principle structures how properties relate. Zuhandenheit guides tool design: tools should recede into transparent use.'
  },
  {
    slug: 'edward-tufte',
    name: 'Edward Tufte',
    discipline: 'Information Design',
    era: '1942–present',
    philosophy: 'Above all else show the data. Maximize the data-ink ratio. Erase non-data-ink. Erase redundant data-ink. Chartjunk does not represent data — it represents the designer\'s failure to respect the viewer.',
    principles: [
      'Above all else show the data',
      'Maximize the data-ink ratio',
      'Erase non-data-ink within reason',
      'Erase redundant data-ink within reason',
      'Revise and edit',
      'Graphical excellence is that which gives the viewer the greatest number of ideas in the shortest time with the least ink'
    ],
    influence: 'Data visualization philosophy in .space and .io. The principle that every pixel must earn its existence directly mirrors Rams\'s "less but better" applied to information. Tufte\'s work validates that subtraction reveals truth in data as in design.'
  },
  {
    slug: 'mies-van-der-rohe',
    name: 'Ludwig Mies van der Rohe',
    discipline: 'Architecture',
    era: '1886–1969',
    philosophy: '"Less is more." Architecture of restraint — reduce to essence. Clear structure, open space, honest materials. The Barcelona Pavilion demonstrated that minimal elements can achieve maximum expression.',
    principles: [
      'Less is more',
      'God is in the details',
      'Architecture is the will of an epoch translated into space',
      'I don\'t want to be interesting. I want to be good.',
      'Structure is the backbone of the whole and makes the design possible'
    ],
    influence: 'Canon\'s spatial philosophy — the conviction that emptiness is not absence but active design. The Glass Design System draws from Mies\'s use of transparency and honest materials.'
  },
  {
    slug: 'josef-muller-brockmann',
    name: 'Josef Müller-Brockmann',
    discipline: 'Graphic Design / Typography',
    era: '1914–1996',
    philosophy: 'The grid system is an attitude toward design — a striving for order, precision, and objectivity. Good design communicates universally through mathematical relationships.',
    principles: [
      'The grid system is an aid, not a guarantee',
      'Typography has one plain duty — to convey information in writing',
      'Order was always wishful thinking for me',
      'The fewer the differences in the size of illustrations, the more harmonious the design',
      'Constructive design is the socially responsible designer\'s answer to chaos'
    ],
    influence: 'Canon\'s typography scale and spacing system. The golden ratio spacing scale is a direct descendant of Müller-Brockmann\'s grid systems — mathematical relationships that create visual harmony without arbitrary decisions.'
  }
];
