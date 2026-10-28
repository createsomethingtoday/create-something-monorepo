// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsClient } from './client';
import { createCTATracker, createFormTracker, createInteractionTracker } from './interactions';
import { createCopyTracker, createLinkTracker } from './engagement';

const client = () => ({ rageClick: vi.fn(), formStart: vi.fn(), formSubmit: vi.fn(), formAbandon: vi.fn(), buttonClick: vi.fn(), track: vi.fn(), errorDisplayed: vi.fn(), contentCopy: vi.fn() });
const cast = (value: ReturnType<typeof client>) => value as unknown as AnalyticsClient;
const cleanup: Array<() => void> = [];
const get = (id: string) => document.getElementById(id)!;
const click = (id: string) => get(id).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
const focus = (id: string) => get(id).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
const submit = (id: string) => get(id).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

beforeEach(() => {
  document.body.innerHTML = `
    <section data-analytics-ignore><form id="private-form"><input id="private-input" name="query" required><button id="private-button" type="submit"><span id="private-icon">Search</span></button></form><div id="private-errors"></div></section>
    <section><form id="public-form"><input id="public-input" name="email" required><button id="public-button" type="submit"><span id="public-icon">Continue</span></button></form><div id="public-errors"></div></section>`;
});
afterEach(() => { for (const stop of cleanup.splice(0)) stop(); document.body.innerHTML = ''; });

describe('explicit subtree analytics opt-out', () => {
  it('excludes private input and text selection copies while tracking normal copied content', () => {
    const analytics = client();
    cleanup.push(createCopyTracker(cast(analytics)));
    const copy = () => document.dispatchEvent(new Event('copy', { bubbles: true }));
    get('private-input').focus();
    copy();
    expect(analytics.contentCopy).not.toHaveBeenCalled();
    get('public-input').focus();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(get('private-icon'));
    selection.removeAllRanges(); selection.addRange(range);
    copy();
    expect(analytics.contentCopy).not.toHaveBeenCalled();
    range.selectNodeContents(get('public-icon'));
    selection.removeAllRanges(); selection.addRange(range);
    copy();
    expect(analytics.contentCopy).toHaveBeenCalledExactlyOnceWith('Continue'.length);
    selection.removeAllRanges();
  });

  it('excludes marked content links without intercepting normal link events', () => {
    const analytics = client();
    get('private-errors').innerHTML = '<a href="/services"><span id="private-link">Open result</span></a>';
    get('public-errors').innerHTML = '<a href="/stack"><span id="public-link">Read more</span></a>';
    cleanup.push(createLinkTracker(cast(analytics), { contentSelector: 'body' }));
    // Model the application's delegated router without jsdom attempting navigation.
    const delegate = vi.fn((event: Event) => event.preventDefault());
    document.addEventListener('click', delegate);
    cleanup.push(() => document.removeEventListener('click', delegate));
    click('private-link');
    expect(analytics.track).not.toHaveBeenCalled();
    expect(delegate).toHaveBeenCalledTimes(1);
    click('public-link');
    expect(delegate).toHaveBeenCalledTimes(2);
    expect(analytics.track).toHaveBeenCalledExactlyOnceWith('content', 'content_link_click', { target: '/stack' });
  });

  it('keeps nested CTA events functional and bubbling while tracking only outside buttons', () => {
    const analytics = client();
    cleanup.push(createCTATracker(cast(analytics)));
    const delegated = vi.fn();
    document.addEventListener('click', delegated);
    cleanup.push(() => document.removeEventListener('click', delegated));
    click('private-icon');
    expect(delegated).toHaveBeenCalledTimes(1);
    expect(delegated.mock.calls[0][0].cancelBubble).toBe(false);
    expect(analytics.buttonClick).not.toHaveBeenCalled();
    click('public-icon');
    expect(delegated).toHaveBeenCalledTimes(2);
    expect(analytics.buttonClick).toHaveBeenCalledExactlyOnceWith('public-button', 'cta');
  });

  it('excludes private focus, fields, submissions, and abandonment while normal forms still work', () => {
    const analytics = client();
    cleanup.push(createFormTracker(cast(analytics), { trackFields: true }));
    focus('private-input');
    submit('private-form');
    window.dispatchEvent(new Event('pagehide'));
    expect(analytics.formStart).not.toHaveBeenCalled();
    expect(analytics.formSubmit).not.toHaveBeenCalled();
    expect(analytics.formAbandon).not.toHaveBeenCalled();
    expect(analytics.track).not.toHaveBeenCalled();
    focus('public-input');
    expect(analytics.formStart).toHaveBeenCalledExactlyOnceWith('public-form');
    expect(analytics.track).toHaveBeenCalledWith('interaction', 'form_field_focus', { target: 'public-form:email' });
    submit('public-form');
    expect(analytics.formSubmit).toHaveBeenCalledExactlyOnceWith('public-form', true);
    window.dispatchEvent(new Event('pagehide'));
    expect(analytics.formAbandon).not.toHaveBeenCalled();
    focus('public-input');
    window.dispatchEvent(new Event('pagehide'));
    expect(analytics.formAbandon).toHaveBeenCalledWith('public-form', 'email', expect.any(Number));
  });

  it('combined trackers suppress private rage clicks, validation, and errors without suppressing public tracking', async () => {
    const analytics = client();
    const stop = createInteractionTracker(cast(analytics), { forms: { trackFields: true } });
    cleanup.push(stop);
    for (let i = 0; i < 3; i++) click('private-icon');
    focus('private-input'); submit('private-form');
    get('private-input').dispatchEvent(new Event('invalid'));
    get('private-errors').innerHTML = '<div><p role="alert">Private query failed</p></div>';
    await Promise.resolve();
    for (const spy of Object.values(analytics)) expect(spy).not.toHaveBeenCalled();

    for (let i = 0; i < 3; i++) click('public-icon');
    expect(analytics.rageClick).toHaveBeenCalledExactlyOnceWith('#public-icon', 3);
    expect(analytics.buttonClick).toHaveBeenCalledTimes(3);
    get('public-input').dispatchEvent(new Event('invalid'));
    expect(analytics.track).toHaveBeenCalledWith('error', 'validation_failure', { target: 'email', metadata: { validationType: 'required', formId: 'public-form' } });
    get('public-errors').innerHTML = '<div><p role="alert">Public validation problem</p></div>';
    await Promise.resolve();
    expect(analytics.errorDisplayed).toHaveBeenCalledExactlyOnceWith('Public validation problem', 'display', undefined);
    stop();
    for (const spy of Object.values(analytics)) spy.mockClear();
    click('public-icon'); focus('public-input'); submit('public-form');
    get('public-input').dispatchEvent(new Event('invalid'));
    get('public-errors').innerHTML = '<p role="alert">After cleanup</p>';
    await Promise.resolve();
    for (const spy of Object.values(analytics)) expect(spy).not.toHaveBeenCalled();
  });
});
