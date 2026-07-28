import React from 'react';

export type UiIconName =
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'diamond'
  | 'external-link'
  | 'info'
  | 'maximize-2'
  | 'message-square-plus'
  | 'minimize-2'
  | 'monitor'
  | 'refresh-cw'
  | 'rotate-ccw'
  | 'smartphone'
  | 'sparkles'
  | 'square'
  | 'star'
  | 'tablet'
  | 'x';

export interface UiIconProps {
  name: UiIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const ICON_PATHS: Record<UiIconName, React.ReactNode> = {
  'arrow-down': (
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  diamond: <path d="m12 3 9 9-9 9-9-9 9-9Z" />,
  'external-link': (
    <>
      <path d="M15 3h6v6" />
      <path d="m10 14 11-11" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  'maximize-2': (
    <>
      <path d="M15 3h6v6" />
      <path d="m21 3-7 7" />
      <path d="M9 21H3v-6" />
      <path d="m3 21 7-7" />
    </>
  ),
  // Ink stays inside the 3–21 grid the rest of the set uses, so it reads level
  // beside maximize-2 and x rather than breaking the corner like a pen glyph.
  'message-square-plus': (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 7v6" />
      <path d="M9 10h6" />
    </>
  ),
  'minimize-2': (
    <>
      <path d="M8 3v5H3" />
      <path d="m3 8 5-5" />
      <path d="M16 21v-5h5" />
      <path d="m21 16-5 5" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  'refresh-cw': (
    <>
      <path d="M21 12a9 9 0 0 0-15.2-6.5L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 15.2 6.5L21 16" />
      <path d="M21 21v-5h-5" />
    </>
  ),
  'rotate-ccw': (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  smartphone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3-1.4 4.2a2 2 0 0 1-1.3 1.3L5 10l4.3 1.5a2 2 0 0 1 1.3 1.3L12 17l1.4-4.2a2 2 0 0 1 1.3-1.3L19 10l-4.3-1.5a2 2 0 0 1-1.3-1.3L12 3Z" />
      <path d="M5 3v3" />
      <path d="M3.5 4.5h3" />
      <path d="M19 17v4" />
      <path d="M17 19h4" />
    </>
  ),
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  // Filled stop glyph: sits inside the stroke set, so it overrides fill/stroke locally.
  square: <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />,
  tablet: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  x: (
    <>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </>
  ),
};

export const UiIcon: React.FC<UiIconProps> = ({
  name,
  size = 16,
  strokeWidth = 2,
  className,
}) => (
  <svg
    className={className}
    data-ui-icon={name}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {ICON_PATHS[name]}
  </svg>
);

export default UiIcon;
