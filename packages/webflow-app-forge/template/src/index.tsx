import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isSectionElement, notify, readTag, runDesignerAction } from "./designer";
import { denyConsent, getConsent, grantConsent, onConsentChange } from "./consent";

/**
 * __APP_NAME__
 *
 * This starting point is shaped by what Marketplace review checks:
 * - It changes nothing in the site until the user clicks.
 * - It reads the selection through Designer APIs and identifies sections by tag.
 * - It reports through webflow.notify, never alert().
 * - It asks before any analytics would run (and ships none).
 * Replace the sample action with your App's real work and keep those four.
 */

type Selection = {
  type: string;
  tag: string | null;
  isSection: boolean;
};

function App() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(getConsent());

  useEffect(() => {
    // Read-only on load. Observing the selection is not a site change.
    const describe = async (el: AnyElement | null) => {
      if (!el) {
        setSelection(null);
        return;
      }
      const [tag, isSection] = await Promise.all([readTag(el), isSectionElement(el)]);
      setSelection({ type: el.type, tag, isSection });
    };

    void webflow.setExtensionSize("default");
    void runDesignerAction("Reading selection", async () => describe(await webflow.getSelectedElement()));
    const unsubscribe = webflow.subscribe("selectedelement", (el) => {
      void describe(el);
    });
    const stopConsent = onConsentChange(setConsent);
    return () => {
      unsubscribe();
      stopConsent();
    };
  }, []);

  // The sample action: the ONLY code path that changes the site, and it runs
  // on a click. Swap in your App's real work here.
  const applyToSelection = useCallback(async () => {
    setBusy(true);
    await runDesignerAction("Updating selection", async () => {
      const el = await webflow.getSelectedElement();
      if (!el) {
        notify("Warning", "Select an element first.");
        return;
      }
      if (el.textContent) {
        await el.setTextContent("Updated by __APP_NAME__");
        notify("Success", "Text updated. Publish the site to make it live.");
      } else {
        notify("Info", "Select a text element to update its content.");
      }
    });
    setBusy(false);
  }, []);

  return (
    <>
      <h1>__APP_NAME__</h1>
      <p>Select an element in the Designer, then choose an action.</p>

      <section className="panel" aria-live="polite">
        <span className="label">Selected element</span>
        {selection ? (
          <>
            <span className="value">
              type {selection.type} · tag {selection.tag ?? "none"}
              {selection.isSection ? " · section" : ""}
            </span>
          </>
        ) : (
          <span className="muted">Nothing selected</span>
        )}
      </section>

      <div className="actions">
        <button type="button" className="primary" onClick={applyToSelection} disabled={busy || !selection}>
          Update selected text
        </button>
      </div>

      {consent === "unknown" ? (
        <section className="panel" aria-label="Usage data">
          <span className="label">Usage data</span>
          <p>
            May this App collect anonymous usage data to improve it? Nothing is sent until you agree. You can change
            this later.
          </p>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => grantConsent()}>
              Allow
            </button>
            <button type="button" className="secondary" onClick={() => denyConsent()}>
              No thanks
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Could not find element with id "root"');
}
createRoot(rootEl).render(<App />);
