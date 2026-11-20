import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Theme } from '@astryxdesign/core/theme';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './fonts.css';
import { gigiDevTheme } from './gigi-dev.js';
import { gigiMidnightTheme } from './gigi-midnight.js';
import './gigi-theme.css';
import './gigi-dev-theme.css';
import './app.css';
import { App } from './App.jsx';
import { startController } from './controller.mjs';
import { installCompatibility } from './compatibility.mjs';

const root = createRoot(document.getElementById('app'));
const renderUI = (ctx) => {
  ctx.themeDefinitions = { studio: gigiDevTheme, paper: gigiDevTheme, midnight: gigiMidnightTheme };
  const theme = ctx.themeDefinitions[ctx.preferences.theme] || gigiDevTheme;
  const mode = ctx.preferences.theme === 'paper' ? 'light' : 'dark';
  installCompatibility(theme, mode);
  flushSync(() =>
    root.render(
      <Theme theme={theme} mode={mode}>
        <App ctx={ctx} />
      </Theme>
    )
  );
};
if (import.meta.env.DEV && new URLSearchParams(location.search).has('fixture')) {
  const { startFixture } = await import('./preview-fixture.mjs');
  startFixture({ startController, renderUI });
} else {
  try {
    startController({ renderUI });
  } catch (error) {
    document.getElementById('app').textContent =
      `Open GiGi in the installed desktop app. ${error.message}`;
  }
}
