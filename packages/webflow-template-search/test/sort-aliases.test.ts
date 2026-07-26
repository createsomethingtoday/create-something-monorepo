import { describe, expect, it } from 'vitest';

import { getClientScript } from '../src/client-script.js';
import { normalizeSort } from '../src/utils.js';

describe('Best Sellers sort aliases', () => {
  it.each(['best_selling', 'best-selling', 'best_sellers', 'best-sellers'])(
    'normalizes %s at the worker boundary',
    (value) => {
      expect(normalizeSort(value)).toBe('best_selling');
    },
  );

  it.each(['best_selling', 'best-selling', 'best_sellers', 'best-sellers'])(
    'ships %s in the legacy client alias table',
    (value) => {
      expect(getClientScript()).toContain(`"${value}":"best_selling"`);
    },
  );
});
