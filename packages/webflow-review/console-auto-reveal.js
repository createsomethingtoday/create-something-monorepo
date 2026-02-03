/**
 * Webflow Review - Automatic Interactive Element Testing
 *
 * Automatically clicks through interactive elements and re-checks content.
 * Paste into console AFTER loading console-injector.js
 *
 * Usage:
 *   1. Load console-injector.js first
 *   2. Paste this script
 *   3. Run: await AutoRevealTest.runFullTest()
 */

(function() {
  'use strict';

  if (!window.WebflowReview) {
    console.error('❌ WebflowReview not loaded. Load console-injector.js first.');
    return;
  }

  const AutoRevealTest = {
    version: '1.0.0',

    // ===================================================================
    // Configuration
    // ===================================================================

    config: {
      waitBetweenClicks: 800,        // ms to wait after each click
      maxElementsToTest: 20,         // Safety limit
      skipSelectors: [
        '[type="submit"]',           // Don't submit forms
        '.cta-button',               // Don't click CTAs
        'a[href*="mailto"]',         // Don't trigger email clients
        'a[href*="tel"]',            // Don't trigger phone calls
      ],
      prioritySelectors: [
        '.nav-toggle',
        '.hamburger',
        '.menu-button',
        '[data-drawer]',
        '[data-modal]',
        '.accordion-trigger',
      ],
    },

    // ===================================================================
    // Main Test Flow
    // ===================================================================

    async runFullTest() {
      console.log('🚀 Starting automatic reveal test...\\n');

      // Step 1: Initial baseline check
      console.log('📊 Step 1: Running baseline check...');
      const initial = await WebflowReview.runFullCheck();
      console.log(`   Initial score: ${initial.score}/100`);
      console.log(`   Initial findings: ${initial.findings.length}\\n`);

      // Step 2: Find interactive elements
      console.log('🔍 Step 2: Finding interactive elements...');
      const interactive = WebflowReview.findInteractiveElements();
      console.log(`   Found ${interactive.length} total interactive elements\\n`);

      // Step 3: Filter and prioritize
      console.log('🎯 Step 3: Filtering and prioritizing...');
      const filtered = this.filterElements(interactive);
      console.log(`   Testing ${filtered.length} high-priority elements\\n`);

      if (filtered.length === 0) {
        console.log('✅ No interactive elements to test.');
        return { initial, revealed: initial, discovered: [] };
      }

      // Step 4: Click through elements
      console.log('👆 Step 4: Clicking elements and waiting for reveals...');
      const clickResults = await this.clickElements(filtered);
      console.log(`   Successfully clicked: ${clickResults.success}/${filtered.length}\\n`);

      // Step 5: Re-check with revealed content
      console.log('🔍 Step 5: Re-checking with revealed content...');
      await this.wait(1000); // Final wait for any delayed renders
      const revealed = await WebflowReview.checkVisibleContent();
      console.log(`   Revealed score: ${revealed.score}/100`);
      console.log(`   Revealed findings: ${revealed.findings.length}\\n`);

      // Step 6: Compare results
      console.log('📈 Step 6: Analyzing differences...');
      const comparison = this.compareResults(initial, revealed);
      this.displayComparison(comparison);

      return {
        initial,
        revealed,
        discovered: comparison.new,
        clickResults
      };
    },

    // ===================================================================
    // Element Filtering
    // ===================================================================

    filterElements(interactive) {
      let filtered = interactive;

      // Remove skip selectors
      filtered = filtered.filter(el => {
        return !this.config.skipSelectors.some(selector => {
          try {
            return el.element.matches(selector);
          } catch (e) {
            return false;
          }
        });
      });

      // Prioritize certain selectors
      const priority = filtered.filter(el =>
        this.config.prioritySelectors.some(selector => {
          try {
            return el.element.matches(selector);
          } catch (e) {
            return false;
          }
        })
      );

      // If we have priority elements, use those first
      if (priority.length > 0) {
        filtered = priority;
      }

      // Apply safety limit
      filtered = filtered.slice(0, this.config.maxElementsToTest);

      return filtered;
    },

    // ===================================================================
    // Click Automation
    // ===================================================================

    async clickElements(elements) {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        console.log(`   ${i + 1}/${elements.length}: Clicking ${el.selector} ("${el.text}")`);

        try {
          el.element.click();
          await this.wait(this.config.waitBetweenClicks);
          results.success++;
        } catch (err) {
          console.warn(`   ⚠️  Failed to click ${el.selector}: ${err.message}`);
          results.failed++;
          results.errors.push({
            selector: el.selector,
            error: err.message
          });
        }
      }

      return results;
    },

    // ===================================================================
    // Results Comparison
    // ===================================================================

    compareResults(initial, revealed) {
      const initialMessages = new Set(initial.findings.map(f => f.message));
      const revealedMessages = new Set(revealed.findings.map(f => f.message));

      // New findings (in revealed but not in initial)
      const newFindings = revealed.findings.filter(f =>
        !initialMessages.has(f.message)
      );

      // Fixed findings (in initial but not in revealed)
      const fixedFindings = initial.findings.filter(f =>
        !revealedMessages.has(f.message)
      );

      // Same findings (in both)
      const sameFindings = initial.findings.filter(f =>
        revealedMessages.has(f.message)
      );

      return {
        new: newFindings,
        fixed: fixedFindings,
        same: sameFindings,
        scoreDelta: revealed.score - initial.score
      };
    },

    displayComparison(comparison) {
      console.log('\\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                    Comparison Results                         ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\\n');

      console.log(`Score change: ${comparison.scoreDelta >= 0 ? '+' : ''}${comparison.scoreDelta} points`);
      console.log(`New findings: ${comparison.new.length}`);
      console.log(`Fixed findings: ${comparison.fixed.length}`);
      console.log(`Unchanged: ${comparison.same.length}\\n`);

      if (comparison.new.length > 0) {
        console.log('🆕 NEW FINDINGS (discovered in hidden content):');
        comparison.new.forEach(f => {
          const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : '🔵';
          console.log(`   ${icon} [${f.checkType.toUpperCase()}] ${f.message}`);
          if (f.evidence?.examples) {
            console.log(`      Examples:`, f.evidence.examples.slice(0, 2));
          }
        });
        console.log('');
      }

      if (comparison.fixed.length > 0) {
        console.log('✅ FIXED FINDINGS (no longer present after reveal):');
        comparison.fixed.forEach(f => {
          console.log(`   • [${f.checkType.toUpperCase()}] ${f.message}`);
        });
        console.log('');
      }

      if (comparison.new.length === 0 && comparison.fixed.length === 0) {
        console.log('✨ No changes detected. All interactive elements appear clean.\\n');
      }
    },

    // ===================================================================
    // Utilities
    // ===================================================================

    wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ===================================================================
    // Focused Tests
    // ===================================================================

    async testNavigationOnly() {
      console.log('🧭 Testing navigation elements only...\\n');

      const interactive = WebflowReview.findInteractiveElements();
      const navElements = interactive.filter(el =>
        el.selector.includes('nav') ||
        el.selector.includes('menu') ||
        el.selector.includes('hamburger')
      );

      console.log(`Found ${navElements.length} navigation elements\\n`);

      if (navElements.length === 0) {
        console.log('No navigation elements to test.');
        return;
      }

      for (const el of navElements) {
        console.log(`Clicking: ${el.selector} ("${el.text}")`);
        try {
          el.element.click();
          await this.wait(1000);
        } catch (err) {
          console.warn(`Failed: ${err.message}`);
        }
      }

      const results = await WebflowReview.checkVisibleContent();
      console.log(`\\nNavigation test complete. Score: ${results.score}/100`);

      return results;
    },

    async testModalsOnly() {
      console.log('🪟 Testing modal/drawer elements only...\\n');

      const interactive = WebflowReview.findInteractiveElements();
      const modalElements = interactive.filter(el =>
        el.selector.includes('modal') ||
        el.selector.includes('drawer') ||
        el.element.hasAttribute('data-modal') ||
        el.element.hasAttribute('data-drawer')
      );

      console.log(`Found ${modalElements.length} modal/drawer elements\\n`);

      if (modalElements.length === 0) {
        console.log('No modal/drawer elements to test.');
        return;
      }

      for (const el of modalElements) {
        console.log(`Clicking: ${el.selector} ("${el.text}")`);
        try {
          el.element.click();
          await this.wait(1000);
        } catch (err) {
          console.warn(`Failed: ${err.message}`);
        }
      }

      const results = await WebflowReview.checkVisibleContent();
      console.log(`\\nModal test complete. Score: ${results.score}/100`);

      return results;
    }
  };

  // Make globally available
  window.AutoRevealTest = AutoRevealTest;

  console.log('✅ Auto Reveal Test loaded!');
  console.log('\\nUsage:');
  console.log('  await AutoRevealTest.runFullTest()          - Test all interactive elements');
  console.log('  await AutoRevealTest.testNavigationOnly()   - Test navigation only');
  console.log('  await AutoRevealTest.testModalsOnly()       - Test modals/drawers only');
  console.log('\\nConfig:');
  console.log('  AutoRevealTest.config.waitBetweenClicks     - Adjust timing (default: 800ms)');
  console.log('  AutoRevealTest.config.maxElementsToTest     - Safety limit (default: 20)');
  console.log('');

})();
