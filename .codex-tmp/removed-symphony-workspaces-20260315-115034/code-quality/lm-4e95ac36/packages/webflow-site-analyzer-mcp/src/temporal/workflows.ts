/**
 * Temporal Workflows for Webflow Extraction
 * 
 * Workflows are deterministic orchestrators. They call activities
 * for all I/O operations. If the workflow crashes, Temporal replays
 * it from the beginning but returns cached results for completed
 * activities - so you resume exactly where you left off.
 * 
 * Key principle: Workflows contain NO I/O, NO randomness.
 * Everything non-deterministic goes in activities.
 */

import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities.js';

// =============================================================================
// Activity Proxies
// =============================================================================

// Configure activities with timeouts and retry policies
const {
  createSession,
  extractSiteInfo,
  extractPages,
  extractStyleClasses,
  extractComponents,
  extractInteractions,
  extractCMSCollections,
  extractAssets,
  extractSitePlan,
  closeSession
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    backoffCoefficient: 2,
  }
});

// =============================================================================
// Types
// =============================================================================

export interface WebflowExtractionResult {
  url: string;
  sessionId: string;
  viewerUrl: string;
  siteName: string;
  sitePlan: string;
  pages: activities.PageInfo[];
  styleClasses: activities.StyleClass[];
  components: activities.ComponentInfo[];
  interactions: activities.InteractionInfo[];
  cmsCollections: activities.CMSCollection[];
  assets: activities.AssetInfo[];
  breakpoints: string[];
  extractedAt: string;
  activitiesCompleted: string[];
}

// =============================================================================
// Main Workflow: Extract Webflow Designer Metadata
// =============================================================================

/**
 * Durable workflow for extracting Webflow Designer metadata.
 * 
 * Each extraction step is a separate activity. If the workflow
 * crashes at step 5, it resumes at step 5 - not step 1.
 * 
 * @param url - Webflow preview URL
 */
export async function webflowExtractionWorkflow(url: string): Promise<WebflowExtractionResult> {
  const activitiesCompleted: string[] = [];
  
  // Step 1: Create Steel session and navigate
  const { sessionId, viewerUrl } = await createSession(url);
  activitiesCompleted.push('createSession');
  
  // Step 2: Extract site info (name, breakpoints)
  const { siteName, breakpoints } = await extractSiteInfo();
  activitiesCompleted.push('extractSiteInfo');
  
  // Step 3: Extract pages
  const pages = await extractPages();
  activitiesCompleted.push('extractPages');
  
  // Step 4: Extract style classes
  const styleClasses = await extractStyleClasses();
  activitiesCompleted.push('extractStyleClasses');
  
  // Step 5: Extract components
  const components = await extractComponents();
  activitiesCompleted.push('extractComponents');
  
  // Step 6: Extract interactions
  const interactions = await extractInteractions();
  activitiesCompleted.push('extractInteractions');
  
  // Step 7: Extract CMS collections
  const cmsCollections = await extractCMSCollections();
  activitiesCompleted.push('extractCMSCollections');
  
  // Step 8: Extract assets
  const assets = await extractAssets();
  activitiesCompleted.push('extractAssets');
  
  // Step 9: Extract site plan
  const sitePlan = await extractSitePlan();
  activitiesCompleted.push('extractSitePlan');
  
  // Step 10: Close session
  await closeSession();
  activitiesCompleted.push('closeSession');
  
  return {
    url,
    sessionId,
    viewerUrl,
    siteName,
    sitePlan,
    pages,
    styleClasses,
    components,
    interactions,
    cmsCollections,
    assets,
    breakpoints,
    extractedAt: new Date().toISOString(),
    activitiesCompleted
  };
}

// =============================================================================
// Workflow: Extract with Simulated Failure (for testing)
// =============================================================================

/**
 * Same as webflowExtractionWorkflow but with a simulated failure
 * after a specified number of activities. Use this to test
 * Temporal's resume capability.
 * 
 * @param url - Webflow preview URL
 * @param failAfterStep - Step number to fail after (1-10)
 */
export async function webflowExtractionWithFailure(
  url: string, 
  failAfterStep: number
): Promise<WebflowExtractionResult> {
  const activitiesCompleted: string[] = [];
  let stepCount = 0;
  
  const maybeFailAfter = async (stepName: string) => {
    stepCount++;
    activitiesCompleted.push(stepName);
    if (stepCount === failAfterStep) {
      // In a real scenario, this would be an unexpected crash
      // Temporal will resume from this point
      throw new Error(`Simulated failure after step ${stepCount}: ${stepName}`);
    }
  };
  
  // Step 1
  const { sessionId, viewerUrl } = await createSession(url);
  await maybeFailAfter('createSession');
  
  // Step 2
  const { siteName, breakpoints } = await extractSiteInfo();
  await maybeFailAfter('extractSiteInfo');
  
  // Step 3
  const pages = await extractPages();
  await maybeFailAfter('extractPages');
  
  // Step 4
  const styleClasses = await extractStyleClasses();
  await maybeFailAfter('extractStyleClasses');
  
  // Step 5
  const components = await extractComponents();
  await maybeFailAfter('extractComponents');
  
  // Step 6
  const interactions = await extractInteractions();
  await maybeFailAfter('extractInteractions');
  
  // Step 7
  const cmsCollections = await extractCMSCollections();
  await maybeFailAfter('extractCMSCollections');
  
  // Step 8
  const assets = await extractAssets();
  await maybeFailAfter('extractAssets');
  
  // Step 9
  const sitePlan = await extractSitePlan();
  await maybeFailAfter('extractSitePlan');
  
  // Step 10
  await closeSession();
  await maybeFailAfter('closeSession');
  
  return {
    url,
    sessionId,
    viewerUrl,
    siteName,
    sitePlan,
    pages,
    styleClasses,
    components,
    interactions,
    cmsCollections,
    assets,
    breakpoints,
    extractedAt: new Date().toISOString(),
    activitiesCompleted
  };
}
