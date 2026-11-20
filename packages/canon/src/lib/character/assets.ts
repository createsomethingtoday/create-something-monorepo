/** Approved export metadata, not installed URLs or permission to alter the artwork. */
export const CANON_CHARACTER_ASSET_METADATA = {
  identity: 'canon-felt-cuboid-v1',
  head: {
    revision: 'r42',
    filename: 'head-r42.webp',
    width: 264,
    height: 264,
    background: 'transparent',
    displaySize: 96,
    // Crop coordinates refer to the original artwork canvas, not encoded WebP pixels.
    frame: { sourceWidth: 1254, sourceHeight: 1254, top: 131, center: 622.5, extent: 912 }
  },
  body: {
    revision: 'r41',
    filename: 'body-r41.webp',
    width: 783,
    height: 856,
    background: 'black'
  },
  gestures: {
    revision: 'r45',
    filename: 'gestures-r45.webp',
    width: 1200,
    height: 800,
    background: 'black',
    columns: 3,
    rows: 2,
    maximumCellDisplaySize: 200,
    cells: ['welcome', 'attention', 'focus', 'review', 'pause', 'handback']
  }
} as const;
