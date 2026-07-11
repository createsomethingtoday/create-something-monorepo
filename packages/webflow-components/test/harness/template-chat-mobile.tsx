import React from 'react';
import { createRoot } from 'react-dom/client';
import { TemplateChat } from '../../src/components/chat/TemplateChat';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <TemplateChat
    apiBase={window.location.origin}
    defaultOpen
    enableAnalytics={false}
    starterPrompts="Show popular templates,Show one spotlight template"
    welcomeMessage="Tell me what you are building and I will find a focused set of templates."
  />,
);

