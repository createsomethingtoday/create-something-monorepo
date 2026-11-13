// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { writable } from 'svelte/store';
import { afterEach, expect, it, vi } from 'vitest';
import Harness from '../../../tests/fixtures/seo-navigation-harness.svelte';
const stores = vi.hoisted(() => ({ page: undefined as any }));
vi.mock('$app/stores', () => ({ page: { subscribe: (run: any) => stores.page.subscribe(run) } }));
let instance: ReturnType<typeof mount> | undefined;
afterEach(async () => { if (instance) await unmount(instance); instance = undefined; document.body.replaceChildren(); document.head.replaceChildren(); });
const meta = (name: string) => document.head.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content');
const schemas = () => [...document.head.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent!));
const schema = (type: string) => schemas().find(value => value['@type'] === type);
function setup() {
  stores.page = writable({ url: new URL('https://createsomething.ltd/canon/colors/') });
  const values = writable<Record<string, any>>({ title: 'Colors', description: 'Color roles', propertyName: 'ltd' });
  const target = document.createElement('div'); document.body.append(target);
  instance = mount(Harness, { target, props: { values } }); flushSync();
  return (next: Record<string, any>, path = '/canon/typography/') => flushSync(() => {
    values.update(old => ({ ...old, ...next }));
    stores.page.set({ url: new URL(`https://createsomething.ltd${path}`) });
  });
}
it('updates the mounted head after prop and route changes, overrides and resets', () => {
  const update = setup();
  expect(document.title).toBe('Colors | CREATE SOMETHING');
  const organization = schema('Organization');
  update({ title: 'Typography', description: 'Type roles', ogImage: '/type.png', noindex: true, nofollow: true });
  expect(document.title).toBe('Typography | CREATE SOMETHING');
  for (const name of ['description', 'og:description', 'twitter:description']) expect(meta(name)).toBe('Type roles');
  for (const name of ['og:title', 'twitter:title']) expect(meta(name)).toBe(document.title);
  for (const name of ['og:url', 'twitter:url']) expect(meta(name)).toBe('https://createsomething.ltd/canon/typography');
  expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://createsomething.ltd/canon/typography');
  expect(meta('robots')).toBe('noindex, nofollow');
  expect(meta('og:image')).toBe('https://createsomething.ltd/type.png');
  expect(meta('twitter:image')).toBe(meta('og:image'));
  expect(schema('WebPage')).toMatchObject({ name: 'Typography', description: 'Type roles', '@id': 'https://createsomething.ltd/canon/typography#webpage', primaryImageOfPage: { url: 'https://createsomething.ltd/type.png' } });
  expect(schema('BreadcrumbList').itemListElement.at(-1)).toMatchObject({ name: 'Typography', item: 'https://createsomething.ltd/canon/typography' });
  update({ canonical: 'https://example.com/preferred', breadcrumbs: [{ name: 'Explicit', url: 'https://example.com/preferred' }] });
  expect(meta('og:url')).toBe('https://example.com/preferred');
  expect(schema('WebPage')['@id']).toBe('https://example.com/preferred#webpage');
  expect(schema('BreadcrumbList').itemListElement[0].name).toBe('Explicit');
  update({ title: '', description: '', canonical: '', breadcrumbs: [], propertyName: 'space', ogImage: '/og-image.png', noindex: false, nofollow: false }, '/');
  expect(document.title).toBe('CREATE SOMETHING SPACE');
  expect(meta('description')).toContain('public workshop');
  expect(meta('og:url')).toBe('https://createsomething.space');
  expect(schema('WebSite')['@id']).toBe('https://createsomething.space/#website');
  expect(schema('BreadcrumbList')).toBeUndefined();
  expect(meta('robots')).toBe('index, follow');
  update({}, '/tools/ai');
  expect(schema('BreadcrumbList').itemListElement[0].item).toBe('https://createsomething.space');
  update({ propertyName: 'agency' }, '/tools/ai');
  expect(schema('BreadcrumbList').itemListElement[0].item).toBe('https://createsomething.agency');
  expect(schema('WebPage').about[0].name).toBe('AI workflow systems');
  expect(schema('Organization')).toEqual(organization);
});
it('recomputes and removes optional schemas without remounting', () => {
  const update = setup();
  update({ title: 'New article', ogType: 'article', author: 'New Author', authorType: 'Person', authorUrl: 'https://example.com/author', publishedTime: '2026-11-13', articleTags: ['Type'], services: [{ name: 'Support', price: 0 }], faqItems: [{ question: 'Why?', answer: 'Clarity' }], reviews: [{ rating: 5, author: 'Reader' }], video: { uploadDate: '2026-11-13' }, course: { instructor: 'Teacher' } });
  expect(schema('Article')).toMatchObject({ headline: 'New article', author: { name: 'New Author', url: 'https://example.com/author' }, keywords: 'Type' });
  expect(schema('Service').offers.price).toBe(0);
  expect(schema('FAQPage').mainEntity[0].name).toBe('Why?');
  expect(schemas().find(s => s.aggregateRating).aggregateRating.ratingValue).toBe('5.0');
  expect(schema('VideoObject').name).toBe('New article');
  expect(schema('Course').instructor.name).toBe('Teacher');
  update({ ogType: 'website', services: [], faqItems: [], reviews: [], video: null, course: null });
  for (const type of ['Article', 'Service', 'FAQPage', 'Product', 'VideoObject', 'Course']) expect(schema(type)).toBeUndefined();
  expect(document.head.querySelector('meta[property="article:published_time"]')).toBeNull();
});
