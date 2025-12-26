/**
 * ControlNet Helpers
 * Architectural material presets and configuration utilities
 */

import type { ControlNetModel, MaterialPreset, RoomConfig } from './types.js';

/**
 * Architectural material presets for consistent rendering
 */
export const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  // Threshold-dwelling materials
  'threshold-dwelling': {
    name: 'Threshold Dwelling',
    prompt: `flat concrete ceiling, polished concrete floors throughout,
      exposed concrete walls, black steel frame and columns,
      floor-to-ceiling glass walls, cedar millwork and cabinets,
      flat roof, modern minimalist, Miesian architecture`
  },

  // Modern minimalist
  'modern-minimal': {
    name: 'Modern Minimal',
    prompt: `white walls, concrete floors, black steel frames,
      floor-to-ceiling windows, minimal furniture, clean lines`
  },

  // Warm contemporary
  'warm-contemporary': {
    name: 'Warm Contemporary',
    prompt: `warm wood tones, oak flooring, plaster walls,
      natural stone accents, brass fixtures, soft textures`
  },

  // Industrial loft
  'industrial': {
    name: 'Industrial',
    prompt: `exposed brick, concrete floors, steel beams,
      large industrial windows, Edison bulbs, reclaimed wood`
  },

  // Scandinavian
  'scandinavian': {
    name: 'Scandinavian',
    prompt: `light oak floors, white walls, natural light,
      minimal furniture, plants, cozy textiles, hygge atmosphere`
  }
};

/**
 * Lighting presets for different times of day
 */
export const LIGHTING_PRESETS: Record<string, string> = {
  'golden-hour': 'warm golden hour sunlight, long shadows, amber tones',
  'blue-hour': 'blue hour dusk, cool blue exterior, warm interior glow',
  'morning': 'soft morning light, diffused sunlight, fresh atmosphere',
  'midday': 'bright natural daylight, minimal shadows, clear visibility',
  'overcast': 'soft overcast light, even illumination, no harsh shadows',
  'night': 'warm interior lighting, night exterior, cozy atmosphere'
};

/**
 * Camera angle presets
 */
export const ANGLE_PRESETS: Record<string, string> = {
  'wide': 'wide angle view showing full room, architectural photography',
  'detail': 'close-up detail shot, focused composition',
  'corner': 'corner view, two walls visible, spatial depth',
  'entrance': 'view from entrance looking in, inviting perspective',
  'window': 'view toward window, backlit, interior-exterior connection'
};

/**
 * Model recommendations based on input type
 */
export function recommendModel(inputType: 'floor-plan' | 'section' | 'elevation' | 'sketch'): ControlNetModel {
  switch (inputType) {
    case 'floor-plan':
      return 'flux-canny-pro'; // Best for clean architectural lines
    case 'section':
      return 'flux-depth-pro'; // Good for understanding depth/height
    case 'elevation':
      return 'flux-canny-pro'; // Edge detection works well
    case 'sketch':
      return 'controlnet-scribble'; // Made for loose sketches
    default:
      return 'flux-canny-pro';
  }
}

/**
 * Build a complete prompt from components
 */
export function buildPrompt(options: {
  materials?: string | MaterialPreset;
  lighting?: string;
  angle?: string;
  room?: string;
  additionalDetails?: string;
}): string {
  const parts: string[] = [];

  // Add materials
  if (options.materials) {
    if (typeof options.materials === 'string') {
      const preset = MATERIAL_PRESETS[options.materials];
      parts.push(preset?.prompt || options.materials);
    } else {
      parts.push(options.materials.prompt);
    }
  }

  // Add room type
  if (options.room) {
    parts.push(`${options.room} interior`);
  }

  // Add lighting
  if (options.lighting) {
    const lightingPrompt = LIGHTING_PRESETS[options.lighting] || options.lighting;
    parts.push(lightingPrompt);
  }

  // Add camera angle
  if (options.angle) {
    const anglePrompt = ANGLE_PRESETS[options.angle] || options.angle;
    parts.push(anglePrompt);
  }

  // Add additional details
  if (options.additionalDetails) {
    parts.push(options.additionalDetails);
  }

  // Add quality descriptors
  parts.push('photorealistic, architectural photography, Dwell magazine style, sharp focus, 8K quality');

  return parts.join(', ');
}

/**
 * Threshold-dwelling room configurations
 * Crop regions based on floor plan coordinates
 */
export const THRESHOLD_DWELLING_ROOMS: RoomConfig[] = [
  {
    name: 'living',
    crop: [34, 0, 21, 13], // Living area in open zone
    angles: [
      { suffix: 'wide', promptAddition: 'wide angle view of living room' },
      { suffix: 'seating', promptAddition: 'seating area detail, lounge chairs' },
      { suffix: 'corner', promptAddition: 'glass corner, two walls of windows' }
    ]
  },
  {
    name: 'kitchen',
    crop: [12, 0, 22, 13], // Kitchen area
    angles: [
      { suffix: 'wide', promptAddition: 'full kitchen view, island visible' },
      { suffix: 'island', promptAddition: 'kitchen island detail, bar stools' },
      { suffix: 'sink', promptAddition: 'sink area, window with prairie view' }
    ]
  },
  {
    name: 'dining',
    crop: [24, 0, 20, 13], // Dining between kitchen and living
    angles: [
      { suffix: 'wide', promptAddition: 'dining room with table and chairs' },
      { suffix: 'table', promptAddition: 'dining table detail, place settings' },
      { suffix: 'toward-kitchen', promptAddition: 'view toward kitchen, open plan' }
    ]
  },
  {
    name: 'primary-bedroom',
    crop: [18, 20, 21, 22], // Primary suite
    angles: [
      { suffix: 'wide', promptAddition: 'primary bedroom, bed and windows' },
      { suffix: 'bed', promptAddition: 'bed detail, platform bed, linens' },
      { suffix: 'window', promptAddition: 'window seat area, garden view' }
    ]
  },
  {
    name: 'primary-bath',
    crop: [26, 28, 13, 14], // Primary bath area
    angles: [
      { suffix: 'wide', promptAddition: 'bathroom with tub and vanity' },
      { suffix: 'vanity', promptAddition: 'double vanity detail, mirrors' },
      { suffix: 'tub', promptAddition: 'freestanding tub by window' }
    ]
  },
  {
    name: 'daughter-bedroom',
    crop: [0, 20, 18, 22], // Daughter's room
    angles: [
      { suffix: 'wide', promptAddition: 'bedroom with desk area' },
      { suffix: 'desk', promptAddition: 'built-in desk and shelving' },
      { suffix: 'bed', promptAddition: 'bed area, cozy textiles' }
    ]
  },
  {
    name: 'inlaw-suite',
    crop: [39, 20, 26, 22], // In-law suite
    angles: [
      { suffix: 'wide', promptAddition: 'suite bedroom with sitting area' },
      { suffix: 'sitting', promptAddition: 'reading nook by window' },
      { suffix: 'entry', promptAddition: 'entry view into suite' }
    ]
  },
  {
    name: 'pantry',
    crop: [0, 4, 12, 9], // Pantry with sit-in
    angles: [
      { suffix: 'wide', promptAddition: 'walk-in pantry with shelving' },
      { suffix: 'sitin', promptAddition: 'cozy sit-in nook with bench' },
      { suffix: 'wine', promptAddition: 'wine storage detail' }
    ]
  },
  {
    name: 'entry',
    crop: [65, 13, 10, 14], // Covered entry
    angles: [
      { suffix: 'approach', promptAddition: 'approach view from outside' },
      { suffix: 'interior', promptAddition: 'entry vestibule interior' },
      { suffix: 'looking-out', promptAddition: 'view from entry to prairie' }
    ]
  }
];

/**
 * Get conditioning scale based on input quality
 */
export function getConditioningScale(inputType: 'clean-lines' | 'sketch' | 'photo'): number {
  switch (inputType) {
    case 'clean-lines':
      return 1.0; // Strong adherence to structure
    case 'sketch':
      return 0.7; // Allow more creative interpretation
    case 'photo':
      return 0.5; // Moderate guidance from reference
    default:
      return 0.8;
  }
}
