// Component metadata collection for the Designer extension.
//
// Designer API typings 2.2 widened webflow.getAllComponents() to AnyComponent
// (Component | CodeComponent | ReadOnlyCodeComponent) and added readOnly,
// codeComponent, and library. Older Designer runtimes omit these fields, so
// every read is feature-detected and degrades to null ("not reported").

export interface ComponentLibraryMetadata {
  id: string | null;
  name: string | null;
}

export interface ComponentMetadata {
  readOnly: boolean | null;
  codeComponent: boolean | null;
  library: ComponentLibraryMetadata | null;
}

function readField(source: unknown, key: string): unknown {
  if (!source || typeof source !== 'object') return undefined;
  try {
    return (source as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readComponentMetadata(component: unknown): ComponentMetadata {
  const library = readField(component, 'library');
  let libraryMetadata: ComponentLibraryMetadata | null = null;
  if (library && typeof library === 'object') {
    libraryMetadata = {
      id: asString(readField(library, 'id')),
      name: asString(readField(library, 'name'))
    };
  }

  return {
    readOnly: asBoolean(readField(component, 'readOnly')),
    codeComponent: asBoolean(readField(component, 'codeComponent')),
    library: libraryMetadata
  };
}

// Structural subset of the Designer element/component API this walk reads.
interface NestingElementLike {
  type?: string;
  children?: unknown;
  getChildren?: () => Promise<NestingElementLike[]>;
}

interface NestingComponentLike {
  readOnly?: boolean;
  getRootElement(): Promise<NestingElementLike | null>;
}

// Breadth-first walk of a component's element tree looking for a nested
// component instance. Depth-capped: nesting evidence is always near the root,
// and unbounded canvas traversal is expensive in the Designer.
//
// Read-only components (library components, read-only code components) are
// skipped: their getRootElement() rejects because the implementation is not
// exposed, so there is no tree to inspect.
export async function componentContainsComponentInstance(
  component: NestingComponentLike,
  maxDepth = 4
): Promise<boolean> {
  if (readComponentMetadata(component).readOnly === true) return false;

  const root = await component.getRootElement();
  if (!root) return false;

  let frontier: NestingElementLike[] = [root];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: NestingElementLike[] = [];
    for (const element of frontier) {
      if (element.type === 'ComponentInstance') return true;
      if ('children' in element && element.children && typeof element.getChildren === 'function') {
        next.push(...(await element.getChildren()));
      }
    }
    frontier = next;
  }
  return false;
}
