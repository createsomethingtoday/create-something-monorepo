import type { Snippet } from 'svelte';

/** The r42 head is accepted at 96px only. All smaller identity sizes use text. */
export type CanonCompanionSize = 24 | 32 | 48 | 64 | 96;

export interface CanonCompanionProps {
  size?: CanonCompanionSize;
  /** Consumer-served URL of the approved r42 head. Missing or failed art uses text. */
  headSrc?: string;
}
/** Consumer-served responsive sources with one shared, uncropped composition ratio. */
export interface CanonTaskArt {
  readonly src: string;
  readonly mobileSrc: string;
  readonly mediumSrc: string;
  readonly width: number;
  readonly height: number;
}

export interface CanonTaskOpeningProps {
  art: CanonTaskArt;
  scene: string;
  caption: string;
  children: Snippet;
}
