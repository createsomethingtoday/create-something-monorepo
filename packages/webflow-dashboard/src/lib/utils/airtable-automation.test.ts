import { describe, expect, it } from 'vitest';
import {
  extractAirtableAutomationChanges,
  wouldTriggerAirtableAutomation
} from './airtable-automation';

describe('extractAirtableAutomationChanges', () => {
  it('keeps only the historical checklist payload fields', () => {
    expect(
      extractAirtableAutomationChanges({
        'ℹ️Description (Short)': { from: 'Before', to: 'After' },
        'ℹ️Description (Long).html': { from: 'Old', to: 'New' },
        '🔗Website URL': { from: 'https://before.test', to: 'https://after.test' },
        fld43LxLHMZb2yF7F: {
          added: [{ url: 'https://example.com/thumb.webp' }],
          removed: 0
        },
        fldneaPyoRXBAVtS1: {
          added: [{ url: 'https://example.com/carousel.webp' }],
          removed: 0
        }
      })
    ).toEqual({
      'ℹ️Description (Short)': { from: 'Before', to: 'After' },
      'ℹ️Description (Long).html': { from: 'Old', to: 'New' },
      fld43LxLHMZb2yF7F: {
        added: [{ url: 'https://example.com/thumb.webp' }],
        removed: 0
      },
      fldneaPyoRXBAVtS1: {
        added: [{ url: 'https://example.com/carousel.webp' }],
        removed: 0
      }
    });
  });
});

describe('wouldTriggerAirtableAutomation', () => {
  it('triggers for short description changes on non-upcoming assets', () => {
    expect(
      wouldTriggerAirtableAutomation('Published', {
        'ℹ️Description (Short)': { from: 'Before', to: 'After' }
      })
    ).toBe(true);
  });

  it('triggers for newly added primary thumbnails', () => {
    expect(
      wouldTriggerAirtableAutomation('Published', {
        fld43LxLHMZb2yF7F: {
          added: [{ url: 'https://example.com/thumb.webp' }],
          removed: 0
        }
      })
    ).toBe(true);
  });

  it('triggers for newly added secondary thumbnails', () => {
    expect(
      wouldTriggerAirtableAutomation('3️⃣🚀Published', {
        fldzKxNCXcgCnEwxu: {
          added: [{ url: 'https://example.com/secondary.webp' }],
          removed: 0
        }
      })
    ).toBe(true);
  });

  it('does not trigger for non-whitelisted field changes', () => {
    expect(
      wouldTriggerAirtableAutomation('Published', {
        'ℹ️Description (Long).html': { from: 'Before', to: 'After' },
        '🔗Website URL': { from: 'https://before.test', to: 'https://after.test' }
      })
    ).toBe(false);
  });

  it('does not trigger for removal-only image changes', () => {
    expect(
      wouldTriggerAirtableAutomation('Published', {
        fld43LxLHMZb2yF7F: {
          added: [],
          removed: 1
        }
      })
    ).toBe(false);
  });

  it('does not trigger for carousel-only changes', () => {
    expect(
      wouldTriggerAirtableAutomation('Published', {
        fldneaPyoRXBAVtS1: {
          added: [{ url: 'https://example.com/carousel.webp' }],
          removed: 0
        }
      })
    ).toBe(false);
  });

  it('does not trigger for upcoming assets even when a tracked field changed', () => {
    expect(
      wouldTriggerAirtableAutomation('1️⃣🆕Upcoming', {
        'ℹ️Description (Short)': { from: 'Before', to: 'After' }
      })
    ).toBe(false);
  });

  it('keeps legacy string changes eligible outside upcoming status', () => {
    expect(wouldTriggerAirtableAutomation('Published', 'Rollback to version 2')).toBe(true);
    expect(wouldTriggerAirtableAutomation('Upcoming', 'Rollback to version 2')).toBe(false);
  });

  it('still triggers when short description changes alongside ignored fields', () => {
    expect(
      wouldTriggerAirtableAutomation('Published', {
        'ℹ️Description (Short)': { from: 'Before', to: 'After' },
        '🔗Website URL': { from: 'https://before.test', to: 'https://after.test' }
      })
    ).toBe(true);
  });
});
