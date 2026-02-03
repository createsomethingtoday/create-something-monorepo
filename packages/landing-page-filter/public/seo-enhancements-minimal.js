/**
 * SEO Enhancements for Category Filter (Minimal Version)
 * 
 * This script provides legitimate client-side SEO improvements:
 * - Canonical URL management for filtered pages
 * - noindex directives for subcategory pages (prevent thin content indexing)
 * - Visual UI updates (H3 titles, description visibility)
 * 
 * NOTE: Title tags and meta descriptions are NOT managed here.
 * Those should be set server-side or via Webflow CMS for reliable SEO.
 * Client-side meta tag manipulation is unreliable for search engine indexing.
 * 
 * Used by: Free Templates page (no hardcoded SEO content)
 */

(function() {
  'use strict';
  
  // === CONFIGURATION ===
  var SEO_CONFIG = {
    DEBUG: true,
    SUBCATEGORY_NOINDEX: true, // Add noindex to subcategory pages (prevents thin content)
    CANONICAL_SELF_REFERENCE: true, // Make canonical tags self-referencing for filtered views
    SELECTORS: {
      titleBreadcrumb: '#title-breadcrumb',
      breadcrumbContainer: '.mp-breadcrumbs',
      dynamicBreadcrumb: '[data-dynamic-breadcrumb="true"]:not(.mp-breadcrumb-divider)',
      dynamicDivider: '[data-dynamic-breadcrumb="true"].mp-breadcrumb-divider',
      categoryTitle: '.h3',
      categoryDescription: '.u-text-gray600'
    }
  };
  
  // === UTILITIES ===
  function log(message, data) {
    if (SEO_CONFIG.DEBUG) {
      console.log('[SEO-Enhancements-Minimal]', message, data || '');
    }
  }
  
  function getUrlParameter(name) {
    try {
      var url = new URL(window.location.href);
      return url.searchParams.get(name);
    } catch (e) {
      var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
      var results = regex.exec(window.location.href);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }
  }
  
  function formatCategoryName(urlParam) {
    if (!urlParam) return '';
    return urlParam
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' & ');
  }
  
  function getCurrentPageType() {
    var category = getUrlParameter('category');
    var subcategory = getUrlParameter('subcategory');
    
    if (subcategory) {
      return {
        type: 'subcategory',
        category: category,
        subcategory: subcategory
      };
    } else if (category) {
      return {
        type: 'category',
        category: category
      };
    } else {
      return {
        type: 'base'
      };
    }
  }
  
  // === SEO FUNCTIONS ===
  
  /**
   * Update canonical URL to self-reference for filtered pages.
   * This tells search engines that the filtered view is the canonical version,
   * preventing duplicate content issues with parameter variations.
   */
  function updateCanonicalUrl() {
    if (!SEO_CONFIG.CANONICAL_SELF_REFERENCE) return;
    
    var canonicalLink = document.querySelector('link[rel="canonical"]');
    
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    
    // Make canonical self-referencing for category pages
    var currentUrl = window.location.href;
    canonicalLink.setAttribute('href', currentUrl);
    
    log('Updated canonical URL to self-reference:', currentUrl);
  }
  
  function addNoindexForSubcategories() {
    if (!SEO_CONFIG.SUBCATEGORY_NOINDEX) return;
    
    var pageType = getCurrentPageType();
    
    if (pageType.type === 'subcategory') {
      var robotsMeta = document.querySelector('meta[name="robots"]');
      
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      
      robotsMeta.setAttribute('content', 'noindex, follow');
      log('Added noindex for subcategory page:', pageType.subcategory);
    }
  }
  
  /**
   * Update visible page elements based on current filter state.
   * Controls visibility of description paragraph for different page types.
   * 
   * NOTE: This updates VISIBLE UI elements only, not meta tags.
   * The H3 title and description content should be managed by Webflow CMS
   * or the category filter script itself, not hardcoded here.
   */
  function updateVisibleElements() {
    var pageType = getCurrentPageType();
    var elements = {
      categoryTitle: document.querySelector(SEO_CONFIG.SELECTORS.categoryTitle),
      categoryDescription: document.querySelector(SEO_CONFIG.SELECTORS.categoryDescription)
    };

    log('Current page type:', pageType);
    log('Found elements:', Object.keys(elements).filter(key => elements[key]).join(', '));
    
    if (pageType.type === 'category') {
      // Category page - show description (content managed by Webflow/CMS)
      log('Category page detected - showing description');
      if (elements.categoryDescription) {
        elements.categoryDescription.style.display = 'block';
        log('✅ Showing description for category');
      }
      
    } else if (pageType.type === 'subcategory') {
      // Subcategory - hide description to avoid thin/duplicate content display
      log('Subcategory page detected - hiding description');
      if (elements.categoryDescription) {
        elements.categoryDescription.style.display = 'none';
        log('✅ Hidden description for subcategory');
      }
      
    } else {
      // Base page (no filters) - show default description
      log('Base page detected - showing default description');
      if (elements.categoryDescription) {
        elements.categoryDescription.style.display = 'block';
        log('✅ Showing default description');
      }
    }
  }
  
  // === URL CHANGE HANDLER ===
  function handleUrlChange() {
    log('URL change detected, updating SEO elements');
    
    // Legitimate client-side SEO (these are reliable)
    updateCanonicalUrl();
    addNoindexForSubcategories();
    
    // Visual UI updates (not meta tags)
    updateVisibleElements();
  }
  
  // === INITIALIZATION ===
  function init() {
    log('SEO Enhancements (Minimal) initializing...');
    
    // Initial setup
    handleUrlChange();
    
    // Listen for category filter changes
    document.addEventListener('categoryFilterUpdated', function() {
      // Small delay to ensure URL has been updated
      setTimeout(handleUrlChange, 100);
    });
    
    // Listen for history changes (back/forward buttons)
    window.addEventListener('popstate', function() {
      setTimeout(handleUrlChange, 100);
    });
    
    log('SEO Enhancements (Minimal) initialized successfully');
  }
  
  // === PUBLIC API ===
  window.SEOEnhancements = {
    updateSEO: handleUrlChange,
    config: SEO_CONFIG,
    debug: function(enabled) {
      SEO_CONFIG.DEBUG = enabled;
      log('Debug mode', enabled ? 'enabled' : 'disabled');
    }
  };
  
  // === START ===
  log('🚀 SEO Enhancements v2.0 (Minimal) starting...');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
