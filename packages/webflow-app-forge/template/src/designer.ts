/**
 * Thin helpers over the Designer API that encode review rules so the rest of
 * the App does not have to remember them.
 */

/**
 * Identify a section by the tag it carries, never by `element.type`.
 * A section created through `webflow.elementPresets.Section` reports
 * `type: 'Block'` with tag `section`; one added by hand in the Designer
 * reports `type: 'Section'`. Both are sections. `getTag()` agrees for both.
 */
export async function isSectionElement(el: AnyElement | null): Promise<boolean> {
  if (!el || !("getTag" in el) || typeof el.getTag !== "function") {
    return false;
  }
  const tag = await (el as { getTag: () => Promise<string | null> }).getTag();
  return tag === "section";
}

/** Read the tag of any tag-bearing element, or null when it has none. */
export function readTag(el: AnyElement | null): Promise<string | null> {
  if (!el || !("getTag" in el) || typeof el.getTag !== "function") {
    return Promise.resolve(null);
  }
  return (el as { getTag: () => Promise<string | null> }).getTag();
}

/**
 * Surface a result to the user through the Designer's own notification bar.
 * Never use alert(), confirm(), or prompt() in an extension.
 */
export function notify(type: "Info" | "Success" | "Warning" | "Error", message: string): void {
  void webflow.notify({ type, message });
}

/**
 * Run a Designer action and report failures through notify() instead of
 * letting an unhandled rejection surface as a console error the user never
 * sees. Review expects clear user-facing error handling.
 */
export async function runDesignerAction<T>(label: string, action: () => Promise<T>): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    notify("Error", `${label} failed: ${detail}`);
    return undefined;
  }
}
