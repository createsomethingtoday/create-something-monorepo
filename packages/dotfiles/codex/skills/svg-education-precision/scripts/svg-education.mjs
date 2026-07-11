#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export function validateSpec(spec) {
  const errors = [];
  const warnings = [];
  const canvas = spec?.canvas;

  if (!canvas || !isPositiveNumber(canvas.width) || !isPositiveNumber(canvas.height)) {
    errors.push({
      code: 'INVALID_CANVAS',
      elementIds: [],
      message: 'Canvas width and height must be finite positive numbers.'
    });
    return { ok: false, errors, warnings };
  }

  const elements = Array.isArray(spec.elements) ? spec.elements : [];
  const idCounts = new Map();
  for (const element of elements) {
    if (typeof element?.id !== 'string' || element.id.length === 0) {
      errors.push({
        code: 'INVALID_ELEMENT_ID',
        elementIds: [],
        message: 'Every element must have a non-empty string ID.'
      });
      continue;
    }
    idCounts.set(element.id, (idCounts.get(element.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push({
        code: 'DUPLICATE_ID',
        elementIds: [id],
        message: `Element ID ${id} is used ${count} times.`
      });
    }
  }

  for (const element of elements) {
    if (!elementBounds(element)) {
      errors.push({
        code: 'INVALID_ELEMENT_BOUNDS',
        elementIds: element?.id ? [String(element.id)] : [],
        message: `Element ${element?.id ?? '<missing-id>'} has missing or non-finite geometry.`
      });
    }
  }

  const knownIds = new Set(idCounts.keys());
  const elementsById = new Map(elements.map((element) => [String(element.id), element]));
  for (const element of elements) {
    const references = [...(element.contains ?? []), ...(element.allowOverlapWith ?? [])];
    for (const reference of references) {
      if (!knownIds.has(String(reference))) {
        errors.push({
          code: 'UNKNOWN_RELATIONSHIP_TARGET',
          elementIds: [String(element.id), String(reference)],
          message: `Element ${element.id} references unknown relationship target ${reference}.`
        });
      }
    }
  }

  for (const element of elements) {
    for (const containedId of element.contains ?? []) {
      const contained = elementsById.get(String(containedId));
      const ownerBounds = elementBounds(element);
      const containedBounds = elementBounds(contained);
      if (!contained || !ownerBounds || !containedBounds) continue;
      if (!boxContains(ownerBounds, containedBounds)) {
        errors.push({
          code: 'INVALID_CONTAINMENT',
          elementIds: [String(element.id), String(containedId)],
          message: `Element ${containedId} is not fully contained by ${element.id}.`
        });
      }
    }
  }

  for (const element of elements) {
    const bounds = elementBounds(element);
    if (!bounds) continue;

    if (
      bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.width > canvas.width ||
      bounds.y + bounds.height > canvas.height
    ) {
      errors.push({
        code: 'ELEMENT_OUT_OF_BOUNDS',
        elementIds: [String(element.id)],
        message: `Element ${element.id} extends outside canvas 0 0 ${formatNumber(canvas.width)} ${formatNumber(canvas.height)}.`
      });
    }

    if (element.type === 'text') {
      const lines = Array.isArray(element.lines) ? element.lines : [element.text ?? ''];
      const fontSize = Number(element.fontSize ?? 16);
      lines.forEach((line, index) => {
        if (estimateTextWidth(String(line), fontSize) > Number(element.width)) {
          errors.push({
            code: 'TEXT_OVERFLOW',
            elementIds: [String(element.id)],
            message: `Text ${element.id} line ${index + 1} exceeds its declared width of ${formatNumber(element.width)}.`
          });
        }
      });
    }
  }

  const boundedElements = elements
    .map((element) => ({ element, bounds: elementBounds(element) }))
    .filter(({ element, bounds }) => bounds && element.type !== 'connector');

  for (let firstIndex = 0; firstIndex < boundedElements.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < boundedElements.length; secondIndex += 1) {
      const first = boundedElements[firstIndex];
      const second = boundedElements[secondIndex];
      if (!boxesOverlap(first.bounds, second.bounds)) continue;
      if (hasExplicitRelationship(first.element, second.element)) continue;

      errors.push({
        code: 'ELEMENT_COLLISION',
        elementIds: [String(first.element.id), String(second.element.id)],
        message: `Elements ${first.element.id} and ${second.element.id} overlap without an explicit relationship.`
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function buildSvg(spec) {
  const report = validateSpec(spec);
  if (!report.ok) {
    throw new SpecValidationError(report);
  }

  const { width, height, background = '#ffffff' } = spec.canvas;
  const title = spec.metadata?.title ?? 'Educational visual';
  const description = spec.metadata?.description ?? title;
  const body = (spec.elements ?? []).map(renderElement).join('\n');
  const markerDefinitions = (spec.elements ?? [])
    .filter((element) => element.type === 'connector' && element.markerEnd)
    .map(renderMarker)
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width)}" height="${formatNumber(height)}" viewBox="0 0 ${formatNumber(width)} ${formatNumber(height)}" style="max-width:100%;height:auto" role="img" aria-labelledby="svg-title svg-desc">`,
    `  <title id="svg-title">${escapeXml(title)}</title>`,
    `  <desc id="svg-desc">${escapeXml(description)}</desc>`,
    '  <defs>',
    markerDefinitions,
    '  </defs>',
    `  <rect width="${formatNumber(width)}" height="${formatNumber(height)}" fill="${escapeXml(background)}"/>`,
    body,
    '</svg>',
    ''
  ].join('\n');
}

class SpecValidationError extends Error {
  constructor(report) {
    super('SVG education specification failed validation.');
    this.report = report;
  }
}

function elementBounds(element) {
  if (element?.type === 'rect' || element?.type === 'text') {
    if (
      !isFiniteNumber(element.x) ||
      !isFiniteNumber(element.y) ||
      !isPositiveNumber(element.width) ||
      !isPositiveNumber(element.height)
    ) {
      return null;
    }

    return {
      x: Number(element.x),
      y: Number(element.y),
      width: Number(element.width),
      height: Number(element.height)
    };
  }

  if (element?.type === 'connector') {
    if (
      !isFiniteNumber(element.x1) ||
      !isFiniteNumber(element.y1) ||
      !isFiniteNumber(element.x2) ||
      !isFiniteNumber(element.y2)
    ) {
      return null;
    }
    const halfStroke = Number(element.strokeWidth ?? 2) / 2;
    return {
      x: Math.min(Number(element.x1), Number(element.x2)) - halfStroke,
      y: Math.min(Number(element.y1), Number(element.y2)) - halfStroke,
      width: Math.abs(Number(element.x2) - Number(element.x1)) + halfStroke * 2,
      height: Math.abs(Number(element.y2) - Number(element.y1)) + halfStroke * 2
    };
  }

  return null;
}

function renderElement(element) {
  if (element.type === 'rect') {
    const radius = element.radius ?? 0;
    return `  <rect id="${escapeXml(element.id)}" x="${formatNumber(element.x)}" y="${formatNumber(element.y)}" width="${formatNumber(element.width)}" height="${formatNumber(element.height)}" rx="${formatNumber(radius)}" fill="${escapeXml(element.fill ?? 'none')}" stroke="${escapeXml(element.stroke ?? 'none')}"/>`;
  }

  if (element.type === 'text') {
    const lineHeight = Number(element.lineHeight ?? Number(element.fontSize ?? 16) * 1.2);
    const lines = Array.isArray(element.lines) ? element.lines : [element.text ?? ''];
    const spans = lines
      .map((line, index) => {
        const y = Number(element.y) + Number(element.fontSize ?? 16) + index * lineHeight;
        return `    <tspan x="${formatNumber(element.x)}" y="${formatNumber(y)}">${escapeXml(line)}</tspan>`;
      })
      .join('\n');

    return [
      `  <text id="${escapeXml(element.id)}" font-family="${escapeXml(element.fontFamily ?? 'Inter, Arial, sans-serif')}" font-size="${formatNumber(element.fontSize ?? 16)}" font-weight="${formatNumber(element.fontWeight ?? 400)}" fill="${escapeXml(element.fill ?? '#0a0e19')}">`,
      spans,
      '  </text>'
    ].join('\n');
  }

  if (element.type === 'connector') {
    const marker = element.markerEnd ? ` marker-end="url(#${escapeXml(markerId(element))})"` : '';
    return `  <line id="${escapeXml(element.id)}" x1="${formatNumber(element.x1)}" y1="${formatNumber(element.y1)}" x2="${formatNumber(element.x2)}" y2="${formatNumber(element.y2)}" stroke="${escapeXml(element.stroke ?? '#636363')}" stroke-width="${formatNumber(element.strokeWidth ?? 2)}"${marker}/>`;
  }

  throw new Error(`Unsupported element type: ${element.type}`);
}

function renderMarker(element) {
  const stroke = escapeXml(element.stroke ?? '#636363');
  return [
    `    <marker id="${escapeXml(markerId(element))}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`,
    `      <path d="M 0 0 L 10 5 L 0 10 z" fill="${stroke}"/>`,
    '    </marker>'
  ].join('\n');
}

function markerId(element) {
  return `arrow-${element.id}`;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function isPositiveNumber(value) {
  return isFiniteNumber(value) && Number(value) > 0;
}

function estimateTextWidth(text, fontSize) {
  const units = Array.from(text).reduce((total, character) => {
    if (character === ' ') return total + 0.33;
    if (/[ilI1.,'|]/.test(character)) return total + 0.3;
    if (/[MW@%&]/.test(character)) return total + 0.9;
    if (/[A-Z0-9]/.test(character)) return total + 0.65;
    return total + 0.55;
  }, 0);

  return units * fontSize;
}

function boxesOverlap(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function boxContains(owner, child) {
  return (
    child.x >= owner.x &&
    child.y >= owner.y &&
    child.x + child.width <= owner.x + owner.width &&
    child.y + child.height <= owner.y + owner.height
  );
}

function hasExplicitRelationship(first, second) {
  return (
    includesId(first.contains, second.id) ||
    includesId(second.contains, first.id) ||
    includesId(first.allowOverlapWith, second.id) ||
    includesId(second.allowOverlapWith, first.id)
  );
}

function includesId(values, id) {
  return Array.isArray(values) && values.map(String).includes(String(id));
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(4)));
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function readSpec(specPath) {
  return JSON.parse(readFileSync(path.resolve(specPath), 'utf8'));
}

function printReport(report) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

export function run(argv) {
  const [command, specPath, outputPath] = argv;
  if (!command || !specPath) {
    process.stderr.write('Usage: svg-education <build|validate|check> <spec.json> [output.svg]\n');
    return 2;
  }

  try {
    const spec = readSpec(specPath);
    const report = validateSpec(spec);

    if (command === 'validate') {
      printReport(report);
      return report.ok ? 0 : 1;
    }

    if (command === 'build' || command === 'check') {
      if (!report.ok) {
        printReport(report);
        return 1;
      }
      if (!outputPath && command === 'build') {
        process.stderr.write('build requires an output SVG path.\n');
        return 2;
      }

      const svg = buildSvg(spec);
      if (outputPath) {
        writeFileSync(path.resolve(outputPath), svg);
      }
      printReport({ ...report, output: outputPath ? path.resolve(outputPath) : null });
      return 0;
    }

    process.stderr.write(`Unknown command: ${command}\n`);
    return 2;
  } catch (error) {
    if (error instanceof SpecValidationError) {
      printReport(error.report);
      return 1;
    }
    printReport({
      ok: false,
      errors: [
        {
          code: 'INVALID_SPEC',
          elementIds: [],
          message: error instanceof Error ? error.message : String(error)
        }
      ],
      warnings: []
    });
    return 2;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  process.exitCode = run(process.argv.slice(2));
}
