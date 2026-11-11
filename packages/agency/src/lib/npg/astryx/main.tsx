import React from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './fonts.css';
import './workspace.css';
import { Workspace } from './Workspace';
import type { NpgBootstrap } from './types';
const target = document.getElementById('npg-app');
const raw = document.getElementById('npg-bootstrap')?.textContent;
if (!target || !raw) throw new Error('Private workspace could not start. Refresh this page.');
const bootstrap = JSON.parse(raw) as NpgBootstrap;
createRoot(target).render(
  <Theme theme={neutralTheme} mode="light">
    <Workspace bootstrap={bootstrap} />
  </Theme>
);
