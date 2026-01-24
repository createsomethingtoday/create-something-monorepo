/**
 * AI-Native Artifact Schema
 * 
 * Structured format that agents can patch efficiently.
 * Renders to HTML/CSS for preview.
 */

// ============ SCHEMA TYPES ============

export interface ArtifactV2 {
  id: string;
  name: string;
  version: number;
  type: ComponentType;
  content: ContentBlock;
  style: StyleBlock;
  createdAt: string;
  updatedAt: string;
}

export type ComponentType = 'card' | 'hero' | 'button' | 'badge' | 'section';

export interface IconDef {
  name: string;
  library?: 'lucide' | 'heroicons' | 'phosphor' | 'custom';
  svg?: string; // For custom icons, inline SVG
}

export interface ContentBlock {
  icon?: string | IconDef; // String = emoji, IconDef = icon library
  title?: string;
  subtitle?: string;
  body?: string;
  badge?: string;
  cta?: { label: string; href?: string };
  items?: string[];
}

export interface StyleBlock {
  theme: Theme;
  accent: string;        // Hex color
  radius: RadiusToken;
  padding: SpaceToken;
  animation: AnimationType;
  textSize?: TextSizeToken;
  maxWidth?: string;
}

export type Theme = 'glass-dark' | 'glass-light' | 'solid-dark' | 'solid-light';
export type RadiusToken = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
export type SpaceToken = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AnimationType = 'none' | 'float' | 'pulse' | 'glow' | 'shimmer';
export type TextSizeToken = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

// ============ DEFAULTS ============

export const defaultStyle: StyleBlock = {
  theme: 'glass-dark',
  accent: '#6366f1',
  radius: '2xl',
  padding: 'xl',
  animation: 'float',
  textSize: 'base',
  maxWidth: '440px',
};

export const defaultContent: ContentBlock = {
  icon: '✨',
  title: 'Untitled',
  body: 'Start editing...',
};

// ============ TOKEN MAPS ============

export const radiusMap: Record<RadiusToken, string> = {
  'none': '0',
  'sm': '8px',
  'md': '12px',
  'lg': '16px',
  'xl': '24px',
  '2xl': '32px',
  '3xl': '40px',
  'full': '9999px',
};

export const paddingMap: Record<SpaceToken, string> = {
  'none': '0',
  'sm': '16px',
  'md': '24px',
  'lg': '32px',
  'xl': '44px',
  '2xl': '56px',
};

export const textSizeMap: Record<TextSizeToken, { title: string; body: string }> = {
  'sm': { title: '20px', body: '14px' },
  'base': { title: '28px', body: '15px' },
  'lg': { title: '32px', body: '16px' },
  'xl': { title: '40px', body: '18px' },
  '2xl': { title: '48px', body: '20px' },
};

// ============ RENDER ENGINE ============

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getThemeStyles(theme: Theme, accent: string): string {
  const accentLight = hexToRgba(accent, 0.15);
  const accentMedium = hexToRgba(accent, 0.3);
  const accentStrong = hexToRgba(accent, 0.5);
  
  switch (theme) {
    case 'glass-dark':
      return `
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid ${accentMedium};
        color: white;
      `;
    case 'glass-light':
      return `
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(0, 0, 0, 0.1);
        color: #1a1a2e;
      `;
    case 'solid-dark':
      return `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid ${accentMedium};
        color: white;
      `;
    case 'solid-light':
      return `
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.1);
        color: #1a1a2e;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      `;
  }
}

function getAnimationStyles(animation: AnimationType, accent: string): string {
  switch (animation) {
    case 'float':
      return `animation: artifact-float 6s ease-in-out infinite;`;
    case 'pulse':
      return `animation: artifact-pulse 3s ease-in-out infinite;`;
    case 'glow':
      return `animation: artifact-glow 4s ease-in-out infinite;`;
    case 'shimmer':
      return `animation: artifact-shimmer 3s linear infinite;`;
    default:
      return '';
  }
}

function getKeyframes(animation: AnimationType, accent: string): string {
  const glowColor = hexToRgba(accent, 0.4);
  
  const keyframes: Record<AnimationType, string> = {
    'none': '',
    'float': `
      @keyframes artifact-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
    `,
    'pulse': `
      @keyframes artifact-pulse {
        0%, 100% { box-shadow: 0 8px 24px ${hexToRgba(accent, 0.25)}; }
        50% { box-shadow: 0 8px 40px ${hexToRgba(accent, 0.45)}; }
      }
    `,
    'glow': `
      @keyframes artifact-glow {
        0%, 100% { border-color: ${hexToRgba(accent, 0.3)}; }
        50% { border-color: ${hexToRgba(accent, 0.6)}; }
      }
    `,
    'shimmer': `
      @keyframes artifact-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `,
  };
  
  return keyframes[animation] || '';
}

export function renderArtifact(artifact: ArtifactV2): { html: string; css: string } {
  const { content, style } = artifact;
  const radius = radiusMap[style.radius];
  const padding = paddingMap[style.padding];
  const textSize = textSizeMap[style.textSize || 'base'];
  
  // Build CSS
  const css = `
    ${getKeyframes(style.animation, style.accent)}
    
    .artifact-card {
      ${getThemeStyles(style.theme, style.accent)}
      border-radius: ${radius};
      padding: ${padding};
      font-family: system-ui, -apple-system, sans-serif;
      max-width: ${style.maxWidth || '440px'};
      position: relative;
      ${getAnimationStyles(style.animation, style.accent)}
    }
    
    .artifact-card::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: ${radius};
      padding: 1px;
      background: linear-gradient(135deg, ${hexToRgba(style.accent, 0.5)}, transparent 40%, transparent 60%, ${hexToRgba(style.accent, 0.3)});
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }
    
    .artifact-icon {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, ${style.accent}, ${adjustHue(style.accent, 30)});
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px ${hexToRgba(style.accent, 0.35)};
    }
    
    .artifact-title {
      margin: 0 0 12px;
      font-size: ${textSize.title};
      font-weight: 700;
      letter-spacing: -0.025em;
      background: linear-gradient(135deg, currentColor 0%, ${style.accent} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .artifact-subtitle {
      margin: 0 0 16px;
      font-size: calc(${textSize.body} * 1.1);
      opacity: 0.7;
      font-weight: 500;
    }
    
    .artifact-body {
      margin: 0;
      opacity: 0.6;
      line-height: 1.8;
      font-size: ${textSize.body};
    }
    
    .artifact-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: ${hexToRgba(style.accent, 0.12)};
      border: 1px solid ${hexToRgba(style.accent, 0.2)};
      color: ${style.accent};
      padding: 10px 18px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 24px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    
    .artifact-badge::before {
      content: "";
      width: 6px;
      height: 6px;
      background: ${style.accent};
      border-radius: 50%;
      box-shadow: 0 0 8px ${style.accent};
    }
    
    .artifact-cta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: ${style.accent};
      color: white;
      padding: 14px 28px;
      border-radius: ${radiusMap['lg']};
      font-size: 15px;
      font-weight: 600;
      margin-top: 28px;
      text-decoration: none;
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
    }
    
    .artifact-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px ${hexToRgba(style.accent, 0.4)};
    }
    
    .artifact-items {
      list-style: none;
      padding: 0;
      margin: 16px 0 0;
    }
    
    .artifact-items li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      opacity: 0.7;
    }
    
    .artifact-items li::before {
      content: "→";
      position: absolute;
      left: 0;
      color: ${style.accent};
    }
  `;
  
  // Build HTML
  let html = `<div class="artifact-card">`;
  
  if (content.icon) {
    html += `<div class="artifact-icon">${content.icon}</div>`;
  }
  
  if (content.title) {
    html += `<h2 class="artifact-title">${content.title}</h2>`;
  }
  
  if (content.subtitle) {
    html += `<p class="artifact-subtitle">${content.subtitle}</p>`;
  }
  
  if (content.body) {
    html += `<p class="artifact-body">${content.body}</p>`;
  }
  
  if (content.items && content.items.length > 0) {
    html += `<ul class="artifact-items">`;
    for (const item of content.items) {
      html += `<li>${item}</li>`;
    }
    html += `</ul>`;
  }
  
  if (content.badge) {
    html += `<span class="artifact-badge">${content.badge}</span>`;
  }
  
  if (content.cta) {
    if (content.cta.href) {
      html += `<a href="${content.cta.href}" class="artifact-cta">${content.cta.label}</a>`;
    } else {
      html += `<button class="artifact-cta">${content.cta.label}</button>`;
    }
  }
  
  html += `</div>`;
  
  return { html, css };
}

// Helper to shift hue for gradient
function adjustHue(hex: string, degrees: number): string {
  // Simple approximation - shift toward purple/pink
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Rotate toward next color
  const newR = Math.min(255, r + Math.floor(degrees * 2));
  const newB = Math.min(255, b + Math.floor(degrees * 1.5));
  
  return `#${newR.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// ============ PATCH OPERATIONS ============

export interface PatchOperation {
  op: 'set' | 'delete';
  path: string;
  value?: unknown;
}

export function applyPatch(artifact: ArtifactV2, patches: PatchOperation[]): ArtifactV2 {
  const result = JSON.parse(JSON.stringify(artifact)) as ArtifactV2;
  
  for (const patch of patches) {
    const parts = patch.path.split('.');
    let target: any = result;
    
    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
      if (target === undefined) break;
    }
    
    const lastKey = parts[parts.length - 1];
    
    if (patch.op === 'set' && target) {
      target[lastKey] = patch.value;
    } else if (patch.op === 'delete' && target) {
      delete target[lastKey];
    }
  }
  
  result.version++;
  result.updatedAt = new Date().toISOString();
  
  return result;
}

// Convenience: accept simple {set: {...}} format
export function applySimplePatch(artifact: ArtifactV2, patch: { set?: Record<string, unknown>; delete?: string[] }): ArtifactV2 {
  const ops: PatchOperation[] = [];
  
  if (patch.set) {
    for (const [path, value] of Object.entries(patch.set)) {
      ops.push({ op: 'set', path, value });
    }
  }
  
  if (patch.delete) {
    for (const path of patch.delete) {
      ops.push({ op: 'delete', path });
    }
  }
  
  return applyPatch(artifact, ops);
}
