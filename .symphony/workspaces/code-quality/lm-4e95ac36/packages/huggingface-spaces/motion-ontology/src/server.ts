/**
 * Motion Ontology Analyzer - Express Server
 *
 * Analyzes UI motion through Heidegger's phenomenological framework:
 * Zuhandenheit (ready-to-hand) vs Vorhandenheit (present-at-hand).
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { extractMotion, closeBrowser } from './extractor.js';
import { interpretMotion } from './phenomenological.js';
import type { AnalysisRequest, MotionAnalysisResult } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../static')));

/**
 * POST /api/analyze
 * Main motion analysis endpoint
 */
app.post('/api/analyze', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { url, trigger } = req.body as AnalysisRequest;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Default trigger
    const triggerConfig = trigger || { type: 'load' as const };

    console.log(`Analyzing: ${url} (trigger: ${triggerConfig.type})`);

    // Extract motion with Puppeteer
    const technical = await extractMotion(url, triggerConfig);

    // Interpret through phenomenological lens
    const phenomenological = await interpretMotion(technical, url);

    const result: MotionAnalysisResult = {
      technical,
      phenomenological,
      metadata: {
        url,
        analyzedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
    };

    console.log(
      `Analysis complete: ${phenomenological.judgment} (${phenomenological.mode}) in ${result.metadata.duration}ms`
    );

    return res.json({
      success: true,
      result,
      hasClaudeIntegration: !!process.env.ANTHROPIC_API_KEY,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasClaudeIntegration: !!process.env.ANTHROPIC_API_KEY,
    version: '1.0.0',
  });
});

/**
 * Serve the frontend for any non-API route
 */
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(join(__dirname, '../static/index.html'));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await closeBrowser();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Motion Ontology Analyzer running on port ${PORT}`);
  console.log(
    `Claude integration: ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled (heuristic mode)'}`
  );
});
