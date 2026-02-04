/**
 * Development entry point for local testing
 * The actual Webflow component uses webflow/BundleScanner.webflow.tsx
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BundleScannerApp } from '../webflow/BundleScannerApp';
import '../webflow/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BundleScannerApp 
      accentColor="#6366f1"
      geminiApiKey={import.meta.env.VITE_GOOGLE_API_KEY || ''}
      apiEndpoint={import.meta.env.VITE_SCANNER_API_ENDPOINT || ''}
    />
  </React.StrictMode>
);
