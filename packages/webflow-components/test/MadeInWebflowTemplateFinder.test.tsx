import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MadeInWebflowTemplateFinder } from '../src/index';
import { TemplateChat } from '../src/components/chat/TemplateChat';

test('MadeInWebflowTemplateFinder renders the Template Finder experience', () => {
  const html = renderToStaticMarkup(
    <MadeInWebflowTemplateFinder defaultOpen enableAnalytics={false} />,
  );

  assert.match(html, /Template finder/);
  assert.match(html, /class="tmchat-panel/);
  assert.match(html, /class="tmchat-turnstile"/);
});

test('MadeInWebflowTemplateFinder pins page actions off and callers cannot re-enable them', () => {
  const element = MadeInWebflowTemplateFinder({}) as React.ReactElement<{
    enablePageActions?: boolean;
  }>;
  assert.equal(element.type, TemplateChat);
  assert.equal(element.props.enablePageActions, false);

  // A caller (or a future prop spread) must not be able to turn the page
  // grid manipulation back on — Made in Webflow has no template grid.
  const overridden = MadeInWebflowTemplateFinder({
    ...({ enablePageActions: true } as Record<string, unknown>),
  }) as React.ReactElement<{ enablePageActions?: boolean }>;
  assert.equal(overridden.props.enablePageActions, false);
});

test('MadeInWebflowTemplateFinder forwards surface props to TemplateChat', () => {
  const element = MadeInWebflowTemplateFinder({
    sessionScope: 'made-in-webflow',
    launcherLabel: 'Find a template',
    variant: 'inline',
  }) as React.ReactElement<{
    sessionScope?: string;
    launcherLabel?: string;
    variant?: string;
  }>;

  assert.equal(element.props.sessionScope, 'made-in-webflow');
  assert.equal(element.props.launcherLabel, 'Find a template');
  assert.equal(element.props.variant, 'inline');
});
