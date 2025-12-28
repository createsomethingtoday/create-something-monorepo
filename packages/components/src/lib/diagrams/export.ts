/**
 * Client-side diagram export utilities
 * Converts SVG diagrams to PNG using canvas
 */

export interface ExportOptions {
  scale?: number; // Default 2 for retina
  format?: 'png' | 'svg';
  filename?: string;
  backgroundColor?: string;
}

/**
 * Export an SVG element to PNG
 */
export async function exportToPng(
  svgElement: SVGElement,
  options: ExportOptions = {}
): Promise<Blob> {
  const { scale = 2, backgroundColor = '#000000' } = options;

  // Get SVG dimensions
  const width = svgElement.getAttribute('width');
  const height = svgElement.getAttribute('height');

  if (!width || !height) {
    throw new Error('SVG must have explicit width and height attributes');
  }

  const w = parseInt(width, 10);
  const h = parseInt(height, 10);

  // Clone and serialize SVG
  const clone = svgElement.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Inline computed styles
  inlineStyles(clone);

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw SVG
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };

    img.src = url;
  });
}

/**
 * Export SVG element as SVG file
 */
export function exportToSvg(svgElement: SVGElement): Blob {
  const clone = svgElement.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  inlineStyles(clone);

  const svgData = new XMLSerializer().serializeToString(clone);
  return new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download a diagram
 */
export async function downloadDiagram(
  svgElement: SVGElement,
  options: ExportOptions = {}
): Promise<void> {
  const { format = 'png', filename = 'diagram' } = options;

  if (format === 'svg') {
    const blob = exportToSvg(svgElement);
    downloadBlob(blob, `${filename}.svg`);
  } else {
    const blob = await exportToPng(svgElement, options);
    downloadBlob(blob, `${filename}.png`);
  }
}

/**
 * Inline computed styles into SVG elements
 * Required for proper rendering when exporting
 */
function inlineStyles(element: Element): void {
  const computedStyles = window.getComputedStyle(element);
  const styleProps = [
    'fill',
    'stroke',
    'stroke-width',
    'font-family',
    'font-size',
    'font-weight',
    'opacity',
    'text-anchor',
    'dominant-baseline',
  ];

  styleProps.forEach((prop) => {
    const value = computedStyles.getPropertyValue(prop);
    if (value) {
      (element as SVGElement).style.setProperty(prop, value);
    }
  });

  // Recurse into children
  Array.from(element.children).forEach((child) => {
    inlineStyles(child);
  });
}

/**
 * Copy diagram to clipboard as PNG
 */
export async function copyToClipboard(
  svgElement: SVGElement,
  options: ExportOptions = {}
): Promise<void> {
  const blob = await exportToPng(svgElement, options);

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
  } catch (err) {
    throw new Error('Failed to copy to clipboard. Browser may not support clipboard API.');
  }
}
