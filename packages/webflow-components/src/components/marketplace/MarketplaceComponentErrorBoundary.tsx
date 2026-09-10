import React, { ErrorInfo, ReactNode, useEffect } from 'react';
import { MarketplaceAnalyticsData, trackMarketplaceComponentError } from './analytics';

interface MarketplaceComponentErrorBoundaryProps {
  component: string;
  enabled?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

interface MarketplaceComponentErrorBoundaryState {
  hasError: boolean;
}

const activeComponents = new Set<string>();
const recentErrorKeys = new Map<string, number>();
let removeGlobalListeners: (() => void) | null = null;

function compactGlobalErrorDetails(detail: MarketplaceAnalyticsData): MarketplaceAnalyticsData {
  return Object.fromEntries(
    Object.entries(detail).filter(([, value]) => value !== '' && value !== undefined),
  ) as MarketplaceAnalyticsData;
}

function activeComponentLabel(): string {
  const components = [...activeComponents].sort();
  if (components.length === 0) return 'TemplateMarketplaceCodeComponents';
  if (components.length === 1) return components[0];
  return components.join('+');
}

function shouldTrackError(key: string): boolean {
  const now = Date.now();
  recentErrorKeys.forEach((timestamp, cachedKey) => {
    if (now - timestamp > 10_000) recentErrorKeys.delete(cachedKey);
  });

  const lastSeen = recentErrorKeys.get(key);
  if (lastSeen && now - lastSeen < 2_000) return false;
  recentErrorKeys.set(key, now);
  return true;
}

function installGlobalErrorTracking(enabled: boolean): void {
  if (!enabled || typeof window === 'undefined' || removeGlobalListeners) return;

  const trackGlobalError = (error: unknown, detail: MarketplaceAnalyticsData) => {
    const component = activeComponentLabel();
    const key = [
      component,
      detail.error_source,
      detail.error_filename,
      detail.error_lineno,
      error instanceof Error ? error.message : String(error),
    ].join('|');

    if (!shouldTrackError(key)) return;
    trackMarketplaceComponentError(component, error, {
      active_components: [...activeComponents].sort().join(','),
      ...compactGlobalErrorDetails(detail),
    });
  };

  const onError = (event: ErrorEvent) => {
    trackGlobalError(event.error || event.message, {
      error_source: 'window_error',
      error_filename: event.filename || null,
      error_lineno: event.lineno || null,
      error_colno: event.colno || null,
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    trackGlobalError(event.reason || 'Unhandled promise rejection', {
      error_source: 'unhandledrejection',
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  removeGlobalListeners = () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    removeGlobalListeners = null;
  };
}

export function useMarketplaceComponentErrorTracking(component: string, enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    activeComponents.add(component);
    installGlobalErrorTracking(enabled);

    return () => {
      activeComponents.delete(component);
      if (activeComponents.size === 0) removeGlobalListeners?.();
    };
  }, [component, enabled]);
}

export class MarketplaceComponentErrorBoundary extends React.Component<
  MarketplaceComponentErrorBoundaryProps,
  MarketplaceComponentErrorBoundaryState
> {
  state: MarketplaceComponentErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MarketplaceComponentErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    trackMarketplaceComponentError(
      this.props.component,
      error,
      {
        error_source: 'react_error_boundary',
        error_component_stack: info.componentStack?.slice(0, 300) || null,
      },
      this.props.enabled,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            border: '1px solid #dedede',
            borderRadius: '4px',
            color: '#5f5f5f',
            background: '#fafafa',
            fontSize: '13px',
            lineHeight: 1.4,
          }}
        >
          <span>Something went wrong.</span>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '4px 10px',
              border: '1px solid #d8d8d8',
              borderRadius: '4px',
              color: '#080808',
              background: '#fff',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
