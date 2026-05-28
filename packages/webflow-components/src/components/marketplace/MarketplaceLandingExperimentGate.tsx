import React, { useEffect } from 'react';
import {
  MarketplaceExperimentState,
  MarketplaceExperimentVariant,
  initTemplateMarketplacePageAnalytics,
  trackMarketplaceEvent,
  trackOptimizelyEvent,
} from './analytics';

type ExperimentMode = 'optimizely' | 'local_traffic_split' | 'force_control' | 'force_treatment';

interface ExperimentApi {
  showControl: (source?: string) => void;
  showTreatment: (source?: string) => void;
  setVariant: (variant: MarketplaceExperimentVariant, source?: string) => void;
  getState: () => MarketplaceExperimentState | null;
}

declare global {
  interface Window {
    __templateMarketplaceLandingExperimentPending?: {
      variant?: unknown;
      source?: string;
    };
    TemplateMarketplaceLandingExperiment?: ExperimentApi;
  }
}

export interface MarketplaceLandingExperimentGateProps {
  /** Stable experiment key used in analytics payloads and storage. */
  experimentKey?: string;
  /** Assignment mode. Optimizely mode waits for Optimizely variation code to call showTreatment/showControl. */
  mode?: ExperimentMode;
  /** Percentage assigned to treatment in local traffic split mode. */
  trafficPercent?: number;
  /** URL query parameter for QA overrides. Use "control" or "treatment". */
  queryParam?: string;
  /** Local storage key for sticky local traffic split assignments. */
  storageKey?: string;
  /** Selector for the current/native control experience. */
  controlSelector?: string;
  /** Selector for the Code Component treatment experience. */
  treatmentSelector?: string;
  /** Delay before tracking default control exposure in Optimizely mode. */
  optimizelyWaitMs?: number;
  /** Optimizely custom event API name for exposure metrics. */
  optimizelyExposureEvent?: string;
  /** Track Optimizely exposure events through window.optimizely.push. */
  enableOptimizelyTracking?: boolean;
  /** Initialize the marketplace page view when the page script does not already own it. */
  initPageAnalytics?: boolean;
  /** Track exposure and forwarded interaction events through wf_analytics and Amplitude/Segment. */
  enableAnalytics?: boolean;
  /** Emit console logs for assignment debugging. */
  debug?: boolean;
}

const DEFAULT_EXPERIMENT_KEY = 'templates_landing_code_components';
const DEFAULT_STORAGE_KEY = 'wf_template_marketplace_landing_variant';
const VARIANT_EVENT_NAME = 'templateMarketplaceLandingExperimentVariant';

function clampPercent(value: number | undefined): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.min(Math.max(Math.round(numeric), 0), 100);
}

function normalizeVariant(value: unknown): MarketplaceExperimentVariant | null {
  return value === 'control' || value === 'treatment' ? value : null;
}

function readUrlVariant(queryParam: string): MarketplaceExperimentVariant | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeVariant(new URL(window.location.href).searchParams.get(queryParam));
  } catch {
    return null;
  }
}

function readStoredVariant(storageKey: string): MarketplaceExperimentVariant | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeVariant(window.localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function writeStoredVariant(storageKey: string, variant: MarketplaceExperimentVariant): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, variant);
  } catch {
    // Storage can be unavailable in privacy modes. The assignment still works for this page view.
  }
}

function chooseLocalVariant(trafficPercent: number): MarketplaceExperimentVariant {
  if (trafficPercent <= 0) return 'control';
  if (trafficPercent >= 100) return 'treatment';
  return Math.random() * 100 < trafficPercent ? 'treatment' : 'control';
}

function setElementVisibility(selector: string, visible: boolean): void {
  if (typeof document === 'undefined' || !selector.trim()) return;
  try {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.style.display = visible ? '' : 'none';
      element.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });
  } catch {
    // Invalid optional selectors should not break assignment.
  }
}

function setDocumentVariant(variant: MarketplaceExperimentVariant, experimentKey: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-template-marketplace-landing-variant', variant);
  document.documentElement.setAttribute(`data-${experimentKey}-variant`, variant);
  document.body?.setAttribute('data-template-marketplace-landing-variant', variant);
}

function gateStyles(controlSelector: string, treatmentSelector: string): string {
  return `
html:not([data-template-marketplace-landing-variant="treatment"]) ${treatmentSelector} {
  display: none !important;
}

html[data-template-marketplace-landing-variant="treatment"] ${controlSelector} {
  display: none !important;
}
`;
}

export const MarketplaceLandingExperimentGate: React.FC<MarketplaceLandingExperimentGateProps> = ({
  experimentKey = DEFAULT_EXPERIMENT_KEY,
  mode = 'optimizely',
  trafficPercent = 50,
  queryParam = 'tm_landing_variant',
  storageKey = DEFAULT_STORAGE_KEY,
  controlSelector = '[data-marketplace-landing-experiment="control"]',
  treatmentSelector = '[data-marketplace-landing-experiment="treatment"]',
  optimizelyWaitMs = 500,
  optimizelyExposureEvent = 'template_marketplace_landing_code_components_exposed',
  enableOptimizelyTracking = true,
  initPageAnalytics = false,
  enableAnalytics = true,
  debug = false,
}) => {
  useEffect(() => {
    const treatmentPercent = clampPercent(trafficPercent);
    let currentState: MarketplaceExperimentState | null = null;
    let exposureTracked = false;
    let exposureTimer: number | undefined;

    const log = (...args: unknown[]) => {
      if (debug) console.log('[MarketplaceLandingExperimentGate]', ...args);
    };

    const trackExposure = (state: MarketplaceExperimentState) => {
      if (exposureTracked) return;
      exposureTracked = true;

      initTemplateMarketplacePageAnalytics(
        {
          experiment_key: state.key,
          experiment_variant: state.variant,
          experiment_assignment_source: state.source,
        },
        initPageAnalytics,
      );

      trackMarketplaceEvent(
        'Marketplace Landing Experiment - Exposure',
        {
          experiment_key: state.key,
          experiment_variant: state.variant,
          experiment_assignment_source: state.source,
          traffic_percent: treatmentPercent,
        },
        enableAnalytics,
      );

      trackOptimizelyEvent(
        optimizelyExposureEvent,
        {
          experiment_key: state.key,
          experiment_variant: state.variant,
          assignment_source: state.source,
          traffic_percent: treatmentPercent,
        },
        enableOptimizelyTracking,
      );
    };

    const applyVariant = (
      variant: MarketplaceExperimentVariant,
      source = 'manual',
      options: { persist?: boolean; track?: boolean } = {},
    ) => {
      const state: MarketplaceExperimentState = { key: experimentKey, variant, source };
      currentState = state;
      window.__templateMarketplaceLandingExperiment = state;
      setDocumentVariant(variant, experimentKey);
      setElementVisibility(treatmentSelector, variant === 'treatment');
      setElementVisibility(controlSelector, variant === 'control');
      if (options.persist) writeStoredVariant(storageKey, variant);
      if (options.track !== false) trackExposure(state);
      log('variant applied', state);
    };

    window.TemplateMarketplaceLandingExperiment = {
      showControl: (source = 'optimizely') => applyVariant('control', source, { track: true }),
      showTreatment: (source = 'optimizely') => applyVariant('treatment', source, { track: true }),
      setVariant: (variant, source = 'manual') => applyVariant(variant, source, { track: true }),
      getState: () => currentState,
    };

    const handleExternalVariant = (event: Event) => {
      const detail = (event as CustomEvent<{ variant?: unknown; source?: string }>).detail || {};
      const variant = normalizeVariant(detail.variant);
      if (!variant) return;
      applyVariant(variant, detail.source || 'external_event', { track: true });
    };

    window.addEventListener(VARIANT_EVENT_NAME, handleExternalVariant);

    const urlVariant = readUrlVariant(queryParam);
    const pendingVariant = normalizeVariant(window.__templateMarketplaceLandingExperimentPending?.variant);
    const pendingSource = window.__templateMarketplaceLandingExperimentPending?.source;

    if (mode === 'force_control') {
      applyVariant('control', 'forced', { persist: false, track: true });
    } else if (mode === 'force_treatment') {
      applyVariant('treatment', 'forced', { persist: false, track: true });
    } else if (urlVariant) {
      applyVariant(urlVariant, 'url_override', { persist: true, track: true });
    } else if (mode === 'optimizely' && pendingVariant) {
      applyVariant(pendingVariant, pendingSource || 'optimizely_pending', { track: true });
    } else if (mode === 'local_traffic_split') {
      const storedVariant = readStoredVariant(storageKey);
      const variant = storedVariant || chooseLocalVariant(treatmentPercent);
      applyVariant(variant, storedVariant ? 'local_storage' : 'local_traffic_split', {
        persist: true,
        track: true,
      });
    } else {
      applyVariant('control', 'optimizely_default_control', { track: false });
      exposureTimer = window.setTimeout(() => {
        if (currentState) trackExposure(currentState);
      }, Math.max(0, optimizelyWaitMs));
    }

    return () => {
      window.removeEventListener(VARIANT_EVENT_NAME, handleExternalVariant);
      if (exposureTimer) window.clearTimeout(exposureTimer);
    };
  }, [
    controlSelector,
    debug,
    enableAnalytics,
    enableOptimizelyTracking,
    experimentKey,
    initPageAnalytics,
    mode,
    optimizelyExposureEvent,
    optimizelyWaitMs,
    queryParam,
    storageKey,
    trafficPercent,
    treatmentSelector,
  ]);

  return (
    <div hidden data-marketplace-component="landing-experiment-gate">
      <style>{gateStyles(controlSelector, treatmentSelector)}</style>
    </div>
  );
};

export default MarketplaceLandingExperimentGate;
