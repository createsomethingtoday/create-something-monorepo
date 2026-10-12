import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ANNOTATION_METADATA_MAX_BYTES,
  annotationApiStatus,
  findAnnotationApi,
  templateAnnotationContainerProps,
  templateAnnotationProps,
  templateAnnotationTextContainerProps,
  toAnnotationMetadata,
} from '../src/components/marketplace/templateAnnotations';

test('toAnnotationMetadata keeps a flat object within browser limits', () => {
  const json = toAnnotationMetadata({
    template_slug: 'atlas-studio',
    creator: '  Half Dozen  ',
    price: 79,
    free: false,
    none: null,
    nested: { not: 'allowed' },
    list: ['dropped'],
    'bad key!': 'dropped',
    '1starts-with-digit': 'dropped',
    nan: Number.NaN,
    empty: '   ',
  });
  assert.ok(json);
  assert.deepEqual(JSON.parse(json!), {
    template_slug: 'atlas-studio',
    creator: 'Half Dozen',
    price: 79,
    free: false,
    none: null,
  });
});

test('toAnnotationMetadata caps properties at six, strings at 256 chars, and payload at 2048 bytes', () => {
  const many = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i]));
  assert.equal(Object.keys(JSON.parse(toAnnotationMetadata(many)!)).length, 6);

  const long = toAnnotationMetadata({ a: 'x'.repeat(300) });
  assert.equal(JSON.parse(long!).a.length, 256);

  const heavy = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`key ${i}`, 'é'.repeat(256)]));
  const json = toAnnotationMetadata(heavy)!;
  assert.ok(new TextEncoder().encode(json).length <= ANNOTATION_METADATA_MAX_BYTES);
  assert.ok(Object.keys(JSON.parse(json)).length < 6);

  assert.equal(toAnnotationMetadata({}), null);
  assert.equal(toAnnotationMetadata({ 'bad key!': 'x' }), null);
});

test('templateAnnotationProps names the object and mirrors the WebMCP template vocabulary', () => {
  const props = templateAnnotationProps({
    name: '  Atlas  Studio ',
    template_slug: 'atlas-studio',
    creator_name: 'Half Dozen',
    price: 0,
    is_free: true,
    category: 'Portfolio',
    url: 'https://webflow.com/templates/html/atlas-studio-website-template',
  });
  assert.equal(props['oai-annotatable'], 'Atlas Studio');
  assert.deepEqual(JSON.parse(props['oai-annotation-metadata']!), {
    template_slug: 'atlas-studio',
    creator: 'Half Dozen',
    price: 'Free',
    category: 'Portfolio',
    url: 'https://webflow.com/templates/html/atlas-studio-website-template',
  });

  const paid = templateAnnotationProps({ name: 'Paid', template_slug: 'paid', price: 129 });
  assert.equal(JSON.parse(paid['oai-annotation-metadata']!).price, 129);

  const bare = templateAnnotationProps({ name: '', template_slug: null });
  assert.deepEqual(bare, {});
});

test('container props use the documented attribute names with empty values', () => {
  assert.deepEqual(templateAnnotationContainerProps(), { 'oai-annotation-container': '' });
  assert.deepEqual(templateAnnotationTextContainerProps(), { 'oai-annotation-container-text': '' });
});

test('annotation API detection reports installed methods and tolerates absence', () => {
  assert.equal(findAnnotationApi(null), null);
  assert.deepEqual(annotationApiStatus(null), { available: false, methods: [] });
  const doc = { oai: { annotation: { request: () => ({ accepted: true }), isActive: () => false, toggle: 1 } } };
  assert.deepEqual(annotationApiStatus(doc as unknown as Document), {
    available: true,
    methods: ['request', 'isActive'],
  });
  assert.deepEqual(annotationApiStatus({ oai: {} } as unknown as Document), { available: false, methods: [] });
});
