/**
 * Bundle Scanner - Webflow Code Component Declaration
 * This file declares the component for Webflow's DevLink system
 */

import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { BundleScannerApp } from './BundleScannerApp';

// Import styles directly for Shadow DOM
import './globals.css';

export default declareComponent(BundleScannerApp, {
  name: 'Bundle Scanner',
  description: 'Webflow Marketplace bundle security scanner with Cortex v4.0 alignment. Upload ZIP files to scan for security issues, policy violations, and get AI-powered verification.',
  group: 'Tools',
  options: {
    ssr: false, // Uses browser APIs (File, IndexedDB)
  },
  props: {
    accentColor: props.Text({
      name: 'Accent Color',
      defaultValue: '#6366f1',
      tooltip: 'Primary accent color for the UI (hex code)'
    }),
    geminiApiKey: props.Text({
      name: 'Gemini API Key',
      defaultValue: '',
      tooltip: 'Google Gemini API key for post-scan AI analysis (optional)'
    }),
    apiEndpoint: props.Text({
      name: 'Scanner API Endpoint',
      defaultValue: '',
      tooltip: 'Cloudflare Worker URL for P3-memory and P4-judge AI verification (optional). Example: https://scanner-worker.yourdomain.workers.dev'
    })
  }
});
