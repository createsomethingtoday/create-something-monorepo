import React, { CSSProperties, KeyboardEvent, useEffect } from 'react';
import { tokens } from '../../styles/tokens';
import { Card } from '../surfaces/Card';
import { Inline, Stack, Text } from '../primitives';

export type DialogSize = 'sm' | 'md' | 'lg' | 'full';

export interface DialogProps {
  open?: boolean;
  title?: string;
  description?: string;
  body?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  size?: DialogSize;
  className?: string;
}

const maxWidthMap: Record<DialogSize, string> = {
  sm: '400px',
  md: '500px',
  lg: '700px',
  full: 'calc(100vw - 2rem)',
};

export const Dialog: React.FC<DialogProps> = ({
  open = true,
  title,
  description,
  body,
  primaryActionLabel,
  secondaryActionLabel,
  closeOnBackdrop = true,
  closeOnEscape = true,
  size = 'md',
  className = '',
}) => {
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape]);

  if (!open) {
    return null;
  }

  const backdropStyles: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.md,
    background: tokens.colors.overlay,
  };

  const shellStyles: CSSProperties = {
    width: '100%',
    maxWidth: maxWidthMap[size],
    maxHeight: 'calc(100vh - 2rem)',
    overflow: 'auto',
  };

  const closeButtonStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: '6px',
    border: 'none',
    borderRadius: tokens.radii.md,
    background: 'transparent',
    color: tokens.colors.fgMuted,
    cursor: closeOnBackdrop || closeOnEscape ? 'pointer' : 'default',
  };

  const buttonStyles = (primary: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40px',
    padding: '0.625rem 1rem',
    borderRadius: tokens.radii.md,
    border: `1px solid ${primary ? tokens.colors.fgPrimary : tokens.colors.borderDefault}`,
    background: primary ? tokens.colors.fgPrimary : 'transparent',
    color: primary ? tokens.colors.bgPure : tokens.colors.fgPrimary,
    fontSize: tokens.typography.fontSize.bodySm,
    fontWeight: tokens.typography.fontWeight.medium,
  });

  const dialogCss = `
    .canon-dialog-close:hover {
      color: ${tokens.colors.fgPrimary};
      background: ${tokens.colors.hover};
    }
    .canon-dialog-close:focus-visible,
    .canon-dialog-action:focus-visible {
      outline: 2px solid ${tokens.colors.focus};
      outline-offset: 2px;
    }
  `;

  const handleBackdropClick = () => {
    if (!closeOnBackdrop) return;
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
    }
  };

  return (
    <div style={backdropStyles} onClick={handleBackdropClick} role="presentation">
      <style>{dialogCss}</style>
      <div style={shellStyles} onKeyDown={handleDialogKeyDown}>
        <Card variant="glass" radius="lg" padding="lg" className={className}>
          <Stack gap="md">
            <Inline justify="space-between" align="center" wrap="nowrap">
              <Stack gap="xs" style={{ flex: 1 }}>
                {title ? (
                  <Text as="h2" size="h3" weight="semibold" tone="primary">
                    {title}
                  </Text>
                ) : null}
                {description ? (
                  <Text as="p" size="body" tone="secondary">
                    {description}
                  </Text>
                ) : null}
              </Stack>

              <button type="button" aria-label="Close dialog" className="canon-dialog-close" style={closeButtonStyles}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Inline>

            {body ? (
              <Text as="div" size="body" tone="secondary" style={{ lineHeight: tokens.typography.lineHeight.relaxed }}>
                {body}
              </Text>
            ) : null}

            {primaryActionLabel || secondaryActionLabel ? (
              <Inline justify="flex-end">
                {secondaryActionLabel ? (
                  <button type="button" className="canon-dialog-action" style={buttonStyles(false)}>
                    {secondaryActionLabel}
                  </button>
                ) : null}
                {primaryActionLabel ? (
                  <button type="button" className="canon-dialog-action" style={buttonStyles(true)}>
                    {primaryActionLabel}
                  </button>
                ) : null}
              </Inline>
            ) : null}
          </Stack>
        </Card>
      </div>
    </div>
  );
};

export default Dialog;
