import { describe, it, expect, vi } from 'vitest';
import {
  componentContainsComponentInstance,
  readComponentMetadata
} from '../src/component-metadata';

describe('readComponentMetadata', () => {
  it('reads readOnly, codeComponent, and library info from a 2.2 library component', () => {
    const meta = readComponentMetadata({
      readOnly: true,
      codeComponent: false,
      library: { id: 'lib_123', name: 'Relume' }
    });

    expect(meta).toEqual({
      readOnly: true,
      codeComponent: false,
      library: { id: 'lib_123', name: 'Relume' }
    });
  });

  it('reports a site-authored code component with no library', () => {
    expect(readComponentMetadata({ readOnly: false, codeComponent: true, library: null })).toEqual({
      readOnly: false,
      codeComponent: true,
      library: null
    });
  });

  it('keeps a null library name as null rather than dropping the library', () => {
    expect(readComponentMetadata({ readOnly: true, codeComponent: true, library: { id: 'lib_9', name: null } }).library)
      .toEqual({ id: 'lib_9', name: null });
  });

  it('returns nulls on older runtimes that do not expose the fields', () => {
    expect(readComponentMetadata({ id: 'c1' })).toEqual({ readOnly: null, codeComponent: null, library: null });
  });

  it('never throws on hostile or non-object input', () => {
    const throwing = {};
    Object.defineProperty(throwing, 'readOnly', {
      get() {
        throw new Error('boom');
      }
    });

    expect(() => readComponentMetadata(throwing)).not.toThrow();
    expect(readComponentMetadata(throwing).readOnly).toBeNull();
    expect(readComponentMetadata(null)).toEqual({ readOnly: null, codeComponent: null, library: null });
    expect(readComponentMetadata(undefined)).toEqual({ readOnly: null, codeComponent: null, library: null });
    expect(readComponentMetadata({ readOnly: 'yes', codeComponent: 1, library: 'Relume' })).toEqual({
      readOnly: null,
      codeComponent: null,
      library: null
    });
  });
});

describe('componentContainsComponentInstance', () => {
  it('skips read-only components without calling getRootElement (it rejects for library components)', async () => {
    const getRootElement = vi.fn().mockRejectedValue(new Error('Component is read-only'));

    await expect(componentContainsComponentInstance({ readOnly: true, getRootElement })).resolves.toBe(false);
    expect(getRootElement).not.toHaveBeenCalled();
  });

  it('finds a nested component instance in an editable component tree', async () => {
    const instance = { type: 'ComponentInstance' };
    const wrapper = { type: 'Block', children: true, getChildren: async () => [instance] };
    const component = { readOnly: false, getRootElement: async () => wrapper };

    await expect(componentContainsComponentInstance(component)).resolves.toBe(true);
  });

  it('returns false for an editable tree without instances and for an empty root', async () => {
    const leaf = { type: 'Block', children: true, getChildren: async () => [] };
    await expect(componentContainsComponentInstance({ getRootElement: async () => leaf })).resolves.toBe(false);
    await expect(componentContainsComponentInstance({ getRootElement: async () => null })).resolves.toBe(false);
  });
});
