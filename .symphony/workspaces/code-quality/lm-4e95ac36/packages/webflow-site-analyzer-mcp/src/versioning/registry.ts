/**
 * Script Registry
 * 
 * Manages versioned extraction scripts. The registry tracks:
 * - All script versions
 * - Active vs testing versions
 * - Performance metrics per version
 * - Feedback and modifications
 * 
 * This is the core of the intelligence layer's ability to
 * observe and evolve the automation layer.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import type {
  ScriptRegistry,
  ScriptVersion,
  ScriptMetrics,
  ScriptEntry,
  ExtractionFeedback,
  ScriptModification,
  VersionComparison,
  VersioningEvent
} from './types.js';

// Import base scripts as v1.0.0
import { touchpointScript } from '../scripts/touchpoints.js';
import { seoScript } from '../scripts/seo.js';
import { structureScript } from '../scripts/structure.js';
import { imagesScript } from '../scripts/images.js';
import { performanceScript } from '../scripts/performance.js';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_REGISTRY_PATH = '.webflow-analyzer/registry.json';

// =============================================================================
// Registry Manager
// =============================================================================

export class RegistryManager {
  private registry: ScriptRegistry;
  private registryPath: string;
  private eventHandlers: ((event: VersioningEvent) => void)[] = [];

  constructor(registryPath?: string) {
    this.registryPath = registryPath || DEFAULT_REGISTRY_PATH;
    this.registry = this.createInitialRegistry();
  }

  /**
   * Create initial registry with base script versions
   */
  private createInitialRegistry(): ScriptRegistry {
    const now = new Date().toISOString();

    const createEntry = (
      name: string,
      description: string,
      code: string
    ): ScriptEntry => ({
      name,
      description,
      versions: [{
        id: `${name}-v1.0.0`,
        scriptName: name,
        version: '1.0.0',
        code,
        createdAt: now,
        createdBy: 'human',
        changelog: 'Initial version',
        status: 'active'
      }],
      metrics: {},
      feedback: [],
      modifications: []
    });

    return {
      scripts: {
        touchpoints: createEntry(
          'touchpoints',
          'Extract interactive elements (links, buttons, forms, Webflow interactions)',
          touchpointScript
        ),
        seo: createEntry(
          'seo',
          'Extract SEO data with scoring and recommendations',
          seoScript
        ),
        structure: createEntry(
          'structure',
          'Extract page hierarchy (sections, navbar, footer)',
          structureScript
        ),
        images: createEntry(
          'images',
          'Analyze images for optimization',
          imagesScript
        ),
        performance: createEntry(
          'performance',
          'Extract performance metrics',
          performanceScript
        )
      },
      activeVersions: {
        touchpoints: 'touchpoints-v1.0.0',
        seo: 'seo-v1.0.0',
        structure: 'structure-v1.0.0',
        images: 'images-v1.0.0',
        performance: 'performance-v1.0.0'
      },
      testingVersions: {}
    };
  }

  /**
   * Load registry from disk
   */
  async load(): Promise<void> {
    try {
      if (existsSync(this.registryPath)) {
        const data = await readFile(this.registryPath, 'utf-8');
        const loaded = JSON.parse(data) as ScriptRegistry;
        
        // Merge with initial to ensure all base scripts exist
        this.registry = this.mergeWithBase(loaded);
      }
    } catch (error) {
      console.error('Failed to load registry, using defaults:', error);
    }
  }

  /**
   * Merge loaded registry with base scripts
   */
  private mergeWithBase(loaded: ScriptRegistry): ScriptRegistry {
    const base = this.createInitialRegistry();
    
    // Ensure all base scripts exist
    for (const [name, entry] of Object.entries(base.scripts)) {
      if (!loaded.scripts[name]) {
        loaded.scripts[name] = entry;
        loaded.activeVersions[name] = base.activeVersions[name];
      }
    }
    
    return loaded;
  }

  /**
   * Save registry to disk
   */
  async save(): Promise<void> {
    try {
      const dir = dirname(this.registryPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(this.registryPath, JSON.stringify(this.registry, null, 2));
    } catch (error) {
      console.error('Failed to save registry:', error);
      throw error;
    }
  }

  // ===========================================================================
  // Script Version Management
  // ===========================================================================

  /**
   * Get the active script code for a given script name
   */
  getActiveScript(scriptName: string): string {
    const versionId = this.registry.activeVersions[scriptName];
    if (!versionId) {
      throw new Error(`No active version for script: ${scriptName}`);
    }
    
    const entry = this.registry.scripts[scriptName];
    const version = entry?.versions.find(v => v.id === versionId);
    
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }
    
    return version.code;
  }

  /**
   * Get script for A/B testing (returns testing version if in test, else active)
   */
  getScriptForExecution(scriptName: string, forceActive = false): { code: string; versionId: string } {
    // Check if there's a testing version
    const testingVersionId = this.registry.testingVersions[scriptName];
    const activeVersionId = this.registry.activeVersions[scriptName];
    
    // 50% chance to use testing version if available and not forced
    const useTestingVersion = !forceActive && 
      testingVersionId && 
      Math.random() < 0.5;
    
    const versionId = useTestingVersion ? testingVersionId : activeVersionId;
    
    if (!versionId) {
      throw new Error(`No version available for script: ${scriptName}`);
    }
    
    const entry = this.registry.scripts[scriptName];
    const version = entry?.versions.find(v => v.id === versionId);
    
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }
    
    return { code: version.code, versionId };
  }

  /**
   * Create a new version of a script
   */
  async createVersion(
    scriptName: string,
    code: string,
    changelog: string,
    createdBy: 'human' | 'agent' = 'agent',
    parentVersion?: string
  ): Promise<ScriptVersion> {
    const entry = this.registry.scripts[scriptName];
    if (!entry) {
      throw new Error(`Unknown script: ${scriptName}`);
    }
    
    // Calculate next version
    const versions = entry.versions;
    const latestVersion = versions[versions.length - 1];
    const nextVersion = this.incrementVersion(latestVersion.version, 'minor');
    
    const newVersion: ScriptVersion = {
      id: `${scriptName}-v${nextVersion}`,
      scriptName,
      version: nextVersion,
      code,
      createdAt: new Date().toISOString(),
      createdBy,
      parentVersion: parentVersion || latestVersion.id,
      changelog,
      status: 'draft'
    };
    
    entry.versions.push(newVersion);
    await this.save();
    
    this.emit({ type: 'version_created', version: newVersion });
    
    return newVersion;
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(current: string, type: 'patch' | 'minor' | 'major'): string {
    const [major, minor, patch] = current.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Promote a version to testing or active
   */
  async promoteVersion(
    versionId: string,
    to: 'testing' | 'active'
  ): Promise<void> {
    // Find the version
    let targetVersion: ScriptVersion | undefined;
    let scriptName: string | undefined;
    
    for (const [name, entry] of Object.entries(this.registry.scripts)) {
      const version = entry.versions.find(v => v.id === versionId);
      if (version) {
        targetVersion = version;
        scriptName = name;
        break;
      }
    }
    
    if (!targetVersion || !scriptName) {
      throw new Error(`Version not found: ${versionId}`);
    }
    
    const previousStatus = targetVersion.status;
    
    if (to === 'testing') {
      targetVersion.status = 'testing';
      this.registry.testingVersions[scriptName] = versionId;
      
      this.emit({
        type: 'ab_test_started',
        baseVersion: this.registry.activeVersions[scriptName],
        testVersion: versionId
      });
      
    } else if (to === 'active') {
      // Deprecate old active version
      const oldActiveId = this.registry.activeVersions[scriptName];
      const entry = this.registry.scripts[scriptName];
      const oldVersion = entry.versions.find(v => v.id === oldActiveId);
      if (oldVersion) {
        oldVersion.status = 'deprecated';
      }
      
      // Promote new version
      targetVersion.status = 'active';
      this.registry.activeVersions[scriptName] = versionId;
      
      // Clear testing if this was the testing version
      if (this.registry.testingVersions[scriptName] === versionId) {
        delete this.registry.testingVersions[scriptName];
      }
    }
    
    await this.save();
    
    this.emit({
      type: 'version_promoted',
      versionId,
      from: previousStatus,
      to
    });
  }

  /**
   * Deprecate a version
   */
  async deprecateVersion(versionId: string, reason: string): Promise<void> {
    for (const entry of Object.values(this.registry.scripts)) {
      const version = entry.versions.find(v => v.id === versionId);
      if (version) {
        version.status = 'deprecated';
        await this.save();
        this.emit({ type: 'version_deprecated', versionId, reason });
        return;
      }
    }
    
    throw new Error(`Version not found: ${versionId}`);
  }

  // ===========================================================================
  // Metrics Management
  // ===========================================================================

  /**
   * Record execution metrics for a version
   */
  async recordExecution(
    versionId: string,
    success: boolean,
    durationMs: number,
    itemsExtracted?: number
  ): Promise<void> {
    const scriptName = versionId.split('-v')[0];
    const entry = this.registry.scripts[scriptName];
    
    if (!entry) return;
    
    // Initialize metrics if needed
    if (!entry.metrics[versionId]) {
      entry.metrics[versionId] = {
        versionId,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageDurationMs: 0,
        averageItemsExtracted: 0,
        errorRate: 0
      };
    }
    
    const metrics = entry.metrics[versionId];
    
    // Update counts
    metrics.executionCount++;
    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }
    
    // Update averages
    metrics.averageDurationMs = (
      (metrics.averageDurationMs * (metrics.executionCount - 1)) + durationMs
    ) / metrics.executionCount;
    
    if (itemsExtracted !== undefined) {
      metrics.averageItemsExtracted = (
        (metrics.averageItemsExtracted * (metrics.executionCount - 1)) + itemsExtracted
      ) / metrics.executionCount;
    }
    
    // Update error rate
    metrics.errorRate = metrics.failureCount / metrics.executionCount;
    
    // Save periodically (every 10 executions)
    if (metrics.executionCount % 10 === 0) {
      await this.save();
    }
  }

  /**
   * Get metrics for a version
   */
  getMetrics(versionId: string): ScriptMetrics | undefined {
    const scriptName = versionId.split('-v')[0];
    return this.registry.scripts[scriptName]?.metrics[versionId];
  }

  /**
   * Compare two versions
   */
  compareVersions(baseVersionId: string, compareVersionId: string): VersionComparison | null {
    const baseMetrics = this.getMetrics(baseVersionId);
    const compareMetrics = this.getMetrics(compareVersionId);
    
    if (!baseMetrics || !compareMetrics) {
      return null;
    }
    
    const successRateImprovement = (
      (1 - compareMetrics.errorRate) - (1 - baseMetrics.errorRate)
    ) / (1 - baseMetrics.errorRate) * 100;
    
    const durationImprovement = (
      (baseMetrics.averageDurationMs - compareMetrics.averageDurationMs)
    ) / baseMetrics.averageDurationMs * 100;
    
    const itemsImprovement = baseMetrics.averageItemsExtracted > 0 ? (
      (compareMetrics.averageItemsExtracted - baseMetrics.averageItemsExtracted)
    ) / baseMetrics.averageItemsExtracted * 100 : 0;
    
    // Determine recommendation
    let recommendation: VersionComparison['recommendation'];
    
    if (compareMetrics.executionCount < 50) {
      recommendation = 'keep_testing';
    } else if (
      successRateImprovement >= 5 ||
      (durationImprovement >= 10 && successRateImprovement >= 0) ||
      (itemsImprovement >= 10 && successRateImprovement >= 0)
    ) {
      recommendation = 'promote';
    } else if (
      successRateImprovement < -5 ||
      (durationImprovement < -20 && successRateImprovement < 0)
    ) {
      recommendation = 'rollback';
    } else {
      recommendation = 'deprecate'; // No significant improvement
    }
    
    return {
      baseVersion: baseVersionId,
      compareVersion: compareVersionId,
      metrics: { base: baseMetrics, compare: compareMetrics },
      improvement: {
        successRate: successRateImprovement,
        duration: durationImprovement,
        itemsExtracted: itemsImprovement
      },
      recommendation
    };
  }

  // ===========================================================================
  // Feedback Management
  // ===========================================================================

  /**
   * Record feedback for an extraction
   */
  async recordFeedback(feedback: ExtractionFeedback): Promise<void> {
    const scriptName = feedback.versionId.split('-v')[0];
    const entry = this.registry.scripts[scriptName];
    
    if (!entry) {
      throw new Error(`Unknown script: ${scriptName}`);
    }
    
    entry.feedback.push(feedback);
    
    // Update quality scores in metrics
    const metrics = entry.metrics[feedback.versionId];
    if (metrics) {
      const allFeedback = entry.feedback.filter(f => f.versionId === feedback.versionId);
      metrics.userFeedbackScore = allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;
    }
    
    await this.save();
    this.emit({ type: 'feedback_recorded', feedback });
  }

  /**
   * Get feedback for analysis
   */
  getFeedback(scriptName: string, versionId?: string): ExtractionFeedback[] {
    const entry = this.registry.scripts[scriptName];
    if (!entry) return [];
    
    if (versionId) {
      return entry.feedback.filter(f => f.versionId === versionId);
    }
    
    return entry.feedback;
  }

  // ===========================================================================
  // Modification Management
  // ===========================================================================

  /**
   * Propose a modification to a script
   */
  async proposeModification(modification: ScriptModification): Promise<void> {
    const scriptName = modification.targetVersion.split('-v')[0];
    const entry = this.registry.scripts[scriptName];
    
    if (!entry) {
      throw new Error(`Unknown script: ${scriptName}`);
    }
    
    entry.modifications.push(modification);
    await this.save();
    
    this.emit({ type: 'modification_proposed', modification });
  }

  /**
   * Apply a modification (creates new version)
   */
  async applyModification(modificationId: string): Promise<ScriptVersion | null> {
    for (const [scriptName, entry] of Object.entries(this.registry.scripts)) {
      const modification = entry.modifications.find(m => m.id === modificationId);
      
      if (modification) {
        if (modification.status !== 'approved') {
          throw new Error('Modification must be approved before applying');
        }
        
        if (!modification.newCode) {
          throw new Error('Modification has no new code');
        }
        
        // Create new version
        const newVersion = await this.createVersion(
          scriptName,
          modification.newCode,
          modification.modification.description,
          modification.proposedBy,
          modification.targetVersion
        );
        
        // Update modification
        modification.status = 'applied';
        modification.newVersion = newVersion.id;
        
        await this.save();
        
        this.emit({
          type: 'modification_applied',
          modificationId,
          newVersionId: newVersion.id
        });
        
        return newVersion;
      }
    }
    
    return null;
  }

  /**
   * Get pending modifications
   */
  getPendingModifications(): ScriptModification[] {
    const pending: ScriptModification[] = [];
    
    for (const entry of Object.values(this.registry.scripts)) {
      pending.push(...entry.modifications.filter(m => 
        m.status === 'proposed' || m.status === 'approved'
      ));
    }
    
    return pending;
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to versioning events
   */
  onEvent(handler: (event: VersioningEvent) => void): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event
   */
  private emit(event: VersioningEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  /**
   * Get all script names
   */
  getScriptNames(): string[] {
    return Object.keys(this.registry.scripts);
  }

  /**
   * Get all versions for a script
   */
  getVersions(scriptName: string): ScriptVersion[] {
    return this.registry.scripts[scriptName]?.versions || [];
  }

  /**
   * Get the current registry state (for debugging/inspection)
   */
  getRegistryState(): ScriptRegistry {
    return { ...this.registry };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let registryInstance: RegistryManager | null = null;

export function getRegistry(path?: string): RegistryManager {
  if (!registryInstance) {
    registryInstance = new RegistryManager(path);
  }
  return registryInstance;
}

export async function initRegistry(path?: string): Promise<RegistryManager> {
  const registry = getRegistry(path);
  await registry.load();
  return registry;
}
