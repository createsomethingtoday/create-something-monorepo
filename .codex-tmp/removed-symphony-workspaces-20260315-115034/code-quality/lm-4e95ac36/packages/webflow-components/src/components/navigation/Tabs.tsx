import React, { CSSProperties, KeyboardEvent, useId, useMemo, useState } from 'react';
import { tokens } from '../../styles/tokens';

export interface TabItem {
  id: string;
  label: string;
  content?: string;
  disabled?: boolean;
}

export type TabsVariant = 'default' | 'pills' | 'underline';
export type TabsSize = 'sm' | 'md' | 'lg';

export interface TabsProps {
  tabs?: string;
  activeTab?: string;
  variant?: TabsVariant;
  size?: TabsSize;
  className?: string;
}

const defaultTabs: TabItem[] = [
  { id: 'overview', label: 'Overview', content: 'A reusable Canon tabs primitive for Webflow.' },
  { id: 'details', label: 'Details', content: 'Switch between panels with keyboard and pointer interaction.' },
  { id: 'notes', label: 'Notes', content: 'Use JSON input to define labels, ids, and panel content.' },
];

function parseTabs(tabs?: string): TabItem[] {
  if (!tabs) return defaultTabs;

  try {
    const parsed = JSON.parse(tabs) as TabItem[];
    return parsed.length > 0 ? parsed : defaultTabs;
  } catch {
    return defaultTabs;
  }
}

const sizeStyles: Record<TabsSize, { padding: string; fontSize: string }> = {
  sm: { padding: '0.5rem 0.75rem', fontSize: tokens.typography.fontSize.bodySm },
  md: { padding: '0.75rem 1rem', fontSize: tokens.typography.fontSize.body },
  lg: { padding: '1rem 1.25rem', fontSize: tokens.typography.fontSize.bodyLg },
};

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const instanceId = useId();
  const parsedTabs = useMemo(() => parseTabs(tabs), [tabs]);
  const enabledTabs = parsedTabs.filter((tab) => !tab.disabled);
  const [internalActiveTab, setInternalActiveTab] = useState(
    activeTab || enabledTabs[0]?.id || parsedTabs[0]?.id || ''
  );

  const currentActiveTab = activeTab || internalActiveTab;
  const activePanel = parsedTabs.find((tab) => tab.id === currentActiveTab) || parsedTabs[0];
  const tabSize = sizeStyles[size];

  const listStyles: CSSProperties = {
    display: 'flex',
    gap: variant === 'underline' ? tokens.spacing.md : '4px',
    borderBottom: variant === 'default' ? `1px solid ${tokens.colors.borderDefault}` : 'none',
    background: variant === 'pills' ? tokens.colors.bgSubtle : 'transparent',
    padding: variant === 'pills' ? '4px' : 0,
    borderRadius: variant === 'pills' ? tokens.radii.md : undefined,
    width: variant === 'pills' ? 'fit-content' : undefined,
  };

  const panelStyles: CSSProperties = {
    padding: `${tokens.spacing.md} 0`,
    color: tokens.colors.fgSecondary,
    fontSize: tokens.typography.fontSize.body,
    lineHeight: tokens.typography.lineHeight.relaxed,
  };

  const getTabStyles = (isActive: boolean): CSSProperties => ({
    position: 'relative',
    background: variant === 'pills' && isActive ? tokens.colors.fgPrimary : 'transparent',
    color:
      variant === 'pills' && isActive ? tokens.colors.bgPure : isActive ? tokens.colors.fgPrimary : tokens.colors.fgMuted,
    border: 'none',
    borderRadius: variant === 'pills' ? tokens.radii.sm : undefined,
    padding: variant === 'underline' ? `${tabSize.padding} 0` : tabSize.padding,
    fontSize: tabSize.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
    cursor: 'pointer',
    transition: `all ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
    whiteSpace: 'nowrap',
    boxShadow: variant === 'pills' && isActive ? tokens.shadows.sm : undefined,
  });

  const tabsCss = `
    .canon-tabs-button:hover:not(:disabled) {
      color: ${tokens.colors.fgPrimary};
    }
    .canon-tabs-button:focus-visible {
      outline: 2px solid ${tokens.colors.focus};
      outline-offset: -2px;
      border-radius: ${tokens.radii.sm};
    }
    .canon-tabs-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .canon-tabs-button[data-variant="default"][data-active="true"]::after,
    .canon-tabs-button[data-variant="underline"][data-active="true"]::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: ${tokens.colors.fgPrimary};
    }
  `;

  const selectTab = (tabId: string) => {
    const candidate = parsedTabs.find((tab) => tab.id === tabId);
    if (!candidate || candidate.disabled) return;
    setInternalActiveTab(tabId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = enabledTabs.findIndex((tab) => tab.id === currentActiveTab);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = enabledTabs.length - 1;
        break;
      default:
        return;
    }

    const nextTab = enabledTabs[nextIndex];
    if (!nextTab) return;
    selectTab(nextTab.id);
    requestAnimationFrame(() => {
      const nextButton = document.getElementById(`${instanceId}-tab-${nextTab.id}`);
      nextButton?.focus();
    });
  };

  return (
    <div className={className}>
      <style>{tabsCss}</style>

      <div role="tablist" aria-orientation="horizontal" style={listStyles} onKeyDown={handleKeyDown}>
        {parsedTabs.map((tab) => {
          const isActive = currentActiveTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`${instanceId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${instanceId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              className="canon-tabs-button"
              data-active={isActive}
              data-variant={variant}
              style={getTabStyles(isActive)}
              onClick={() => selectTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activePanel ? (
        <div
          id={`${instanceId}-panel-${activePanel.id}`}
          role="tabpanel"
          aria-labelledby={`${instanceId}-tab-${activePanel.id}`}
          tabIndex={0}
          style={panelStyles}
        >
          {activePanel.content || ''}
        </div>
      ) : null}
    </div>
  );
};

export default Tabs;
