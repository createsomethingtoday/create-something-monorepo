/**
 * Webflow Review - Complete Testing Suite
 *
 * Combined script: console-injector.js + console-auto-reveal.js
 * Single paste for complete testing including hidden content.
 *
 * Usage:
 *   1. Open Webflow preview page (e.g., Dishora)
 *   2. Open Console (Cmd+Option+J on Mac, F12 on Windows)
 *   3. Paste this ENTIRE file
 *   4. Run: await AutoRevealTest.runFullTest()
 */

(function() {
  'use strict';

  // ===================================================================
  // PART 1: WebflowReview (from console-injector.js)
  // ===================================================================

  const WebflowReview = {
    version: '1.0.0',

    checkSEO() {
      const findings = [];
      const url = window.location.href;

      // Check title tag
      const title = document.title || '';
      if (!title) {
        findings.push({
          checkType: 'seo',
          severity: 'critical',
          message: 'Missing <title> tag',
          pageUrl: url,
          evidence: { reason: 'No title tag found' },
          autoFixable: true,
        });
      } else if (title.length > 70) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: `Title too long (${title.length} chars, maximum 70)`,
          pageUrl: url,
          evidence: { title, length: title.length },
          autoFixable: true,
        });
      } else if (title.length < 10) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: `Title too short (${title.length} chars, minimum 10)`,
          pageUrl: url,
          evidence: { title, length: title.length },
          autoFixable: true,
        });
      }

      // Check meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc?.getAttribute('content') || '';

      if (!description) {
        findings.push({
          checkType: 'seo',
          severity: 'critical',
          message: 'Missing meta description',
          pageUrl: url,
          evidence: { reason: 'No meta description tag found' },
          autoFixable: true,
        });
      } else if (description.length > 160) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: `Meta description too long (${description.length} chars, maximum 160)`,
          pageUrl: url,
          evidence: { description, length: description.length },
          autoFixable: true,
        });
      }

      // Check H1 headings
      const h1Elements = document.querySelectorAll('h1');
      const visibleH1s = Array.from(h1Elements).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });

      if (visibleH1s.length === 0) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: 'No visible H1 heading found',
          pageUrl: url,
          evidence: {
            totalH1s: h1Elements.length,
            visibleH1s: 0,
            reason: 'H1 headings help structure content'
          },
        });
      } else if (visibleH1s.length > 1) {
        findings.push({
          checkType: 'seo',
          severity: 'info',
          message: `Multiple H1 headings found (${visibleH1s.length} visible)`,
          pageUrl: url,
          evidence: {
            count: visibleH1s.length,
            texts: visibleH1s.map(h1 => h1.textContent.trim().substring(0, 50)),
            reason: 'Best practice is one H1 per page'
          },
        });
      }

      // Check images without alt text
      const images = document.querySelectorAll('img');
      const imagesWithoutAlt = Array.from(images)
        .filter(img => !img.getAttribute('alt'))
        .map(img => ({
          src: img.src,
          visible: window.getComputedStyle(img).display !== 'none'
        }));

      if (imagesWithoutAlt.length > 0) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: `${imagesWithoutAlt.length} image(s) missing alt text`,
          pageUrl: url,
          evidence: {
            count: imagesWithoutAlt.length,
            visible: imagesWithoutAlt.filter(img => img.visible).length,
            examples: imagesWithoutAlt.slice(0, 5),
            reason: 'Alt text is important for accessibility and SEO'
          },
          autoFixable: false,
        });
      }

      // Check Open Graph image
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: 'Missing Open Graph image (og:image)',
          pageUrl: url,
          evidence: { reason: 'Social media previews will not show an image' },
        });
      }

      // Check structured data
      const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
      if (structuredData.length === 0) {
        findings.push({
          checkType: 'seo',
          severity: 'info',
          message: 'No structured data (Schema.org) found',
          pageUrl: url,
          evidence: { reason: 'Structured data helps search engines understand content' },
        });
      }

      return findings;
    },

    validateLinks() {
      const findings = [];
      const url = window.location.href;

      const links = document.querySelectorAll('a[href]');
      const missingUrls = [];
      const javascriptUrls = [];
      const relativeLinks = [];
      const hiddenLinksCount = { missing: 0, javascript: 0, relative: 0 };

      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim().substring(0, 50);
        const selector = this._getSelector(link);
        const isVisible = this._isVisible(link);

        if (!href || href === '#' || href === '') {
          missingUrls.push({ text, selector, visible: isVisible });
          if (!isVisible) hiddenLinksCount.missing++;
          return;
        }

        if (href.startsWith('javascript:')) {
          javascriptUrls.push({ text, selector, href, visible: isVisible });
          if (!isVisible) hiddenLinksCount.javascript++;
          return;
        }

        if (!href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:')) {
          relativeLinks.push({ text, selector, href, visible: isVisible });
          if (!isVisible) hiddenLinksCount.relative++;
        }
      });

      if (missingUrls.length > 0) {
        findings.push({
          checkType: 'links',
          severity: 'critical',
          message: `${missingUrls.length} link(s) missing URL`,
          pageUrl: url,
          evidence: {
            count: missingUrls.length,
            visible: missingUrls.filter(l => l.visible).length,
            hidden: hiddenLinksCount.missing,
            examples: missingUrls.slice(0, 5),
          },
          autoFixable: false,
        });
      }

      if (javascriptUrls.length > 0) {
        findings.push({
          checkType: 'links',
          severity: 'warning',
          message: `${javascriptUrls.length} link(s) use javascript: protocol`,
          pageUrl: url,
          evidence: {
            count: javascriptUrls.length,
            visible: javascriptUrls.filter(l => l.visible).length,
            hidden: hiddenLinksCount.javascript,
            examples: javascriptUrls.slice(0, 3),
            reason: 'Consider using event handlers instead',
          },
        });
      }

      if (relativeLinks.length > 0) {
        findings.push({
          checkType: 'links',
          severity: 'info',
          message: `${relativeLinks.length} relative link(s) found`,
          pageUrl: url,
          evidence: {
            count: relativeLinks.length,
            visible: relativeLinks.filter(l => l.visible).length,
            hidden: hiddenLinksCount.relative,
            examples: relativeLinks.slice(0, 3),
            reason: 'Relative links work on published site but may not work in preview',
          },
        });
      }

      return findings;
    },

    findInteractiveElements() {
      const selectors = [
        'button[data-toggle]',
        'button[aria-expanded]',
        '[data-drawer]',
        '[data-modal]',
        '.hamburger',
        '.menu-button',
        '.nav-toggle',
        '[role="button"]',
        'button:not([type="submit"])',
      ];

      const elements = [];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          elements.push({
            selector: this._getSelector(el),
            text: el.textContent.trim().substring(0, 30),
            ariaExpanded: el.getAttribute('aria-expanded'),
            visible: this._isVisible(el),
            element: el,
          });
        });
      });

      return elements;
    },

    async clickAndReveal(selector) {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`Element not found: ${selector}`);
        return false;
      }

      console.log(`Clicking: ${selector}`);
      element.click();
      await this._wait(500);
      return true;
    },

    async runFullCheck() {
      console.log('🔍 Running Webflow Review...\n');

      const seoFindings = this.checkSEO();
      const linkFindings = this.validateLinks();
      const allFindings = [...seoFindings, ...linkFindings];
      const score = this._calculateScore(allFindings);

      const result = {
        url: window.location.href,
        score,
        findings: allFindings,
        timestamp: new Date().toISOString(),
      };

      this._displayResults(result);

      const interactive = this.findInteractiveElements();
      if (interactive.length > 0) {
        console.log(`\n💡 Found ${interactive.length} interactive elements that may reveal hidden content`);
      }

      return result;
    },

    async checkVisibleContent() {
      console.log('🔍 Checking only visible content...\n');

      const seoFindings = this.checkSEO();
      const linkFindings = this.validateLinks();

      const visibleFindings = [...seoFindings, ...linkFindings].map(finding => {
        if (finding.evidence?.visible !== undefined) {
          return {
            ...finding,
            message: finding.message + ' (visible only)',
          };
        }
        return finding;
      });

      const score = this._calculateScore(visibleFindings);

      const result = {
        url: window.location.href,
        score,
        findings: visibleFindings,
        timestamp: new Date().toISOString(),
        mode: 'visible-only',
      };

      this._displayResults(result);
      return result;
    },

    _isVisible(element) {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0' &&
             element.offsetParent !== null;
    },

    _getSelector(element) {
      if (element.id) return `#${element.id}`;
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c);
        if (classes.length > 0) return `.${classes[0]}`;
      }
      return element.tagName.toLowerCase();
    },

    _calculateScore(findings) {
      const weights = { critical: 10, warning: 5, info: 1 };
      let penalties = 0;
      findings.forEach(f => {
        penalties += weights[f.severity] || 0;
      });
      return Math.max(0, Math.min(100, 100 - penalties));
    },

    _wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    _displayResults(result) {
      const critical = result.findings.filter(f => f.severity === 'critical').length;
      const warning = result.findings.filter(f => f.severity === 'warning').length;
      const info = result.findings.filter(f => f.severity === 'info').length;

      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #888');
      console.log(`%c   Webflow Review Results`, 'font-size: 16px; font-weight: bold');
      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #888');

      let scoreColor = '#ef4444';
      if (result.score >= 90) scoreColor = '#22c55e';
      else if (result.score >= 75) scoreColor = '#3b82f6';
      else if (result.score >= 60) scoreColor = '#eab308';

      console.log(`\n%c   Score: ${result.score}/100`, `font-size: 20px; font-weight: bold; color: ${scoreColor}`);
      console.log(`\n   🔴 Critical: ${critical}   🟡 Warning: ${warning}   🔵 Info: ${info}`);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const grouped = {
        critical: result.findings.filter(f => f.severity === 'critical'),
        warning: result.findings.filter(f => f.severity === 'warning'),
        info: result.findings.filter(f => f.severity === 'info'),
      };

      Object.entries(grouped).forEach(([severity, items]) => {
        if (items.length === 0) return;

        const icon = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
        console.log(`%c${icon} ${severity.toUpperCase()} (${items.length})`, 'font-weight: bold');

        items.forEach(finding => {
          console.log(`\n  [${finding.checkType.toUpperCase()}] ${finding.message}`);

          if (finding.evidence) {
            if (finding.evidence.count !== undefined) {
              console.log(`  📊 Count: ${finding.evidence.count}`);
              if (finding.evidence.visible !== undefined) {
                console.log(`     Visible: ${finding.evidence.visible} | Hidden: ${finding.evidence.hidden || 0}`);
              }
            }
            if (finding.evidence.examples) {
              console.log(`  📝 Examples:`, finding.evidence.examples.slice(0, 3));
            }
          }
        });
        console.log('');
      });
    }
  };

  // ===================================================================
  // PART 2: AutoRevealTest (from console-auto-reveal.js)
  // ===================================================================

  const AutoRevealTest = {
    version: '1.0.0',

    config: {
      waitBetweenClicks: 800,
      maxElementsToTest: 20,
      skipSelectors: [
        '[type="submit"]',
        '.cta-button',
        'a[href*="mailto"]',
        'a[href*="tel"]',
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

    async runFullTest() {
      console.log('🚀 Starting automatic reveal test...\n');

      // Step 1: Initial baseline check
      console.log('📊 Step 1: Running baseline check...');
      const initial = await WebflowReview.runFullCheck();
      console.log(`   Initial score: ${initial.score}/100`);
      console.log(`   Initial findings: ${initial.findings.length}\n`);

      // Step 2: Find interactive elements
      console.log('🔍 Step 2: Finding interactive elements...');
      const interactive = WebflowReview.findInteractiveElements();
      console.log(`   Found ${interactive.length} total interactive elements\n`);

      // Step 3: Filter and prioritize
      console.log('🎯 Step 3: Filtering and prioritizing...');
      const filtered = this.filterElements(interactive);
      console.log(`   Testing ${filtered.length} high-priority elements\n`);

      if (filtered.length === 0) {
        console.log('✅ No interactive elements to test.');
        return { initial, revealed: initial, discovered: [] };
      }

      // Step 4: Click through elements
      console.log('👆 Step 4: Clicking elements and waiting for reveals...');
      const clickResults = await this.clickElements(filtered);
      console.log(`   Successfully clicked: ${clickResults.success}/${filtered.length}\n`);

      // Step 5: Re-check with revealed content
      console.log('🔍 Step 5: Re-checking with revealed content...');
      await this.wait(1000);
      const revealed = await WebflowReview.checkVisibleContent();
      console.log(`   Revealed score: ${revealed.score}/100`);
      console.log(`   Revealed findings: ${revealed.findings.length}\n`);

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

    filterElements(interactive) {
      let filtered = interactive;

      filtered = filtered.filter(el => {
        return !this.config.skipSelectors.some(selector => {
          try {
            return el.element.matches(selector);
          } catch (e) {
            return false;
          }
        });
      });

      const priority = filtered.filter(el =>
        this.config.prioritySelectors.some(selector => {
          try {
            return el.element.matches(selector);
          } catch (e) {
            return false;
          }
        })
      );

      if (priority.length > 0) {
        filtered = priority;
      }

      filtered = filtered.slice(0, this.config.maxElementsToTest);

      return filtered;
    },

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

    compareResults(initial, revealed) {
      const initialMessages = new Set(initial.findings.map(f => f.message));
      const revealedMessages = new Set(revealed.findings.map(f => f.message));

      const newFindings = revealed.findings.filter(f =>
        !initialMessages.has(f.message)
      );

      const fixedFindings = initial.findings.filter(f =>
        !revealedMessages.has(f.message)
      );

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
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                    Comparison Results                         ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');

      console.log(`Score change: ${comparison.scoreDelta >= 0 ? '+' : ''}${comparison.scoreDelta} points`);
      console.log(`New findings: ${comparison.new.length}`);
      console.log(`Fixed findings: ${comparison.fixed.length}`);
      console.log(`Unchanged: ${comparison.same.length}\n`);

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
        console.log('✨ No changes detected. All interactive elements appear clean.\n');
      }
    },

    wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    async testNavigationOnly() {
      console.log('🧭 Testing navigation elements only...\n');

      const interactive = WebflowReview.findInteractiveElements();
      const navElements = interactive.filter(el =>
        el.selector.includes('nav') ||
        el.selector.includes('menu') ||
        el.selector.includes('hamburger')
      );

      console.log(`Found ${navElements.length} navigation elements\n`);

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
      console.log(`\nNavigation test complete. Score: ${results.score}/100`);

      return results;
    }
  };

  // Make both globally available
  window.WebflowReview = WebflowReview;
  window.AutoRevealTest = AutoRevealTest;

  console.log('✅ Complete Webflow Review Suite loaded!');
  console.log('\nQuick Start:');
  console.log('  await AutoRevealTest.runFullTest()          - Full automated test');
  console.log('  await AutoRevealTest.testNavigationOnly()   - Navigation only');
  console.log('  await WebflowReview.runFullCheck()          - Manual baseline');
  console.log('');

})();
