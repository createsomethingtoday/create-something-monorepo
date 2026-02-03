/**
 * Category Filter Analytics Script
 * 
 * Tracks user interactions with the category filtering system
 * Integrates with Webflow's wf_analytics for comprehensive usage tracking
 */

(function() {
  'use strict';
  
  // === CONFIGURATION ===
  var ANALYTICS_CONFIG = {
    DEBUG: true,
    PAGE_NAME: 'Landing Page Templates',
    EVENTS: {
      FILTER_APPLIED: 'Landing Page Filter - Category Selected',
      SUBCATEGORY_APPLIED: 'Landing Page Filter - Subcategory Selected',
      FILTER_CLEARED: 'Landing Page Filter - Filter Cleared',
      PAGE_VIEW: 'Landing Page Filter - Page Viewed'
    }
  };
  
  // === UTILITIES ===
  function log(message, data) {
    if (ANALYTICS_CONFIG.DEBUG) {
      console.log('[FilterAnalytics]', message, data || '');
    }
  }
  
  function getUrlParams() {
    var params = {};
    try {
      var url = new URL(window.location.href);
      url.searchParams.forEach(function(value, key) {
        params[key] = value;
      });
    } catch (e) {
      // Fallback for older browsers
      var search = window.location.search.substring(1);
      if (search) {
        var pairs = search.split('&');
        for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split('=');
          if (pair.length === 2) {
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
          }
        }
      }
    }
    return params;
  }
  
  function getCurrentPageContext() {
    var urlParams = getUrlParams();
    return {
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || 'direct',
      current_category: urlParams.category || null,
      current_subcategory: urlParams.subcategory || null,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  }
  
  // === ANALYTICS FUNCTIONS ===
  function trackEvent(eventName, eventData) {
    if (typeof wf_analytics === 'undefined') {
      log('wf_analytics not available, queuing event:', eventName);
      return;
    }
    
    var fullEventData = Object.assign({}, getCurrentPageContext(), eventData || {});
    
    try {
      wf_analytics.track(eventName, fullEventData);
      log('Event tracked:', eventName, fullEventData);
    } catch (error) {
      console.error('[FilterAnalytics] Error tracking event:', error);
    }
  }
  
  function trackPageView() {
    var context = getCurrentPageContext();
    var pageViewData = {
      filter_state: context.current_category ? 'filtered' : 'unfiltered',
      initial_category: context.current_category,
      initial_subcategory: context.current_subcategory,
      has_url_params: !!(context.current_category || context.current_subcategory)
    };
    
    trackEvent(ANALYTICS_CONFIG.EVENTS.PAGE_VIEW, pageViewData);
  }
  
  function trackCategorySelection(categoryName, selectionMethod) {
    trackEvent(ANALYTICS_CONFIG.EVENTS.FILTER_APPLIED, {
      category_name: categoryName,
      selection_method: selectionMethod || 'click', // 'click', 'url', 'breadcrumb'
      previous_category: getCurrentPageContext().current_category,
      filter_depth: 'parent'
    });
  }
  
  function trackSubcategorySelection(categoryName, subcategoryName, selectionMethod) {
    trackEvent(ANALYTICS_CONFIG.EVENTS.SUBCATEGORY_APPLIED, {
      category_name: categoryName,
      subcategory_name: subcategoryName,
      selection_method: selectionMethod || 'click',
      filter_depth: 'subcategory',
      filter_path: categoryName + ' > ' + subcategoryName
    });
  }
  
  function trackFilterCleared(clearMethod, previousState) {
    trackEvent(ANALYTICS_CONFIG.EVENTS.FILTER_CLEARED, {
      clear_method: clearMethod, // 'all_categories_click', 'breadcrumb_click', 'direct'
      previous_category: previousState.category,
      previous_subcategory: previousState.subcategory,
      previous_filter_depth: previousState.subcategory ? 'subcategory' : (previousState.category ? 'parent' : 'none')
    });
  }
  
  
  
  // === INTEGRATION WITH CATEGORY FILTER ===
  function setupCategoryFilterIntegration() {
    
    // Listen for category filter ready event
    document.addEventListener('categoryFilterReady', function(event) {
      var detail = event.detail || {};
      log('Category filter ready, setting up analytics hooks');
      
      // Track initial page view after filter is ready
      setTimeout(trackPageView, 100);
    });
    
    // Hook into SimpleCategoryFilter, FreeCategoryFilter, or FeaturedCategoryFilter if available
    function hookIntoFilterEvents() {
      var categoryFilter = window.SimpleCategoryFilter || window.FreeCategoryFilter || window.FeaturedCategoryFilter;
      
      if (typeof categoryFilter !== 'undefined') {
        var filterType = window.SimpleCategoryFilter ? 'SimpleCategoryFilter' : 
                        (window.FreeCategoryFilter ? 'FreeCategoryFilter' : 'FeaturedCategoryFilter');
        log(filterType + ' detected, hooking into events');
        
        // Store original functions to wrap them
        var originalState = categoryFilter.getState();
        
        // Set up periodic state checking to detect changes
        var lastState = originalState;
        setInterval(function() {
          var currentState = categoryFilter.getState();
          
          // Check for parent category changes
          if (currentState.parent !== lastState.parent) {
            if (currentState.parent) {
              trackCategorySelection(currentState.parent, 'click');
            } else if (lastState.parent) {
              trackFilterCleared('category_deselected', {
                category: lastState.parent,
                subcategory: lastState.subcategory
              });
            }
          }
          
          // Check for subcategory changes
          if (currentState.subcategory !== lastState.subcategory) {
            if (currentState.subcategory) {
              trackSubcategorySelection(currentState.parent, currentState.subcategory, 'click');
            } else if (lastState.subcategory) {
              // Subcategory was cleared but parent remains
              trackFilterCleared('subcategory_deselected', {
                category: lastState.parent,
                subcategory: lastState.subcategory
              });
            }
          }
          
          lastState = currentState;
        }, 250); // Check every 250ms
        
      } else {
        log('SimpleCategoryFilter/FreeCategoryFilter not available yet, retrying...');
        setTimeout(hookIntoFilterEvents, 500);
      }
    }
    
    // Start hooking into filter events
    hookIntoFilterEvents();
  }
  
  
  // === URL PARAMETER TRACKING ===
  function trackUrlParameterUsage() {
    var urlParams = getUrlParams();
    
    if (urlParams.category || urlParams.subcategory) {
      log('URL parameters detected, tracking direct access');
      
      if (urlParams.category) {
        trackCategorySelection(urlParams.category, 'url');
      }
      
      if (urlParams.subcategory) {
        trackSubcategorySelection(urlParams.category, urlParams.subcategory, 'url');
      }
    }
  }
  
  // === INITIALIZATION ===
  function init() {
    log('Category Filter Analytics initializing...');
    
    // Wait for wf_analytics to be available
    function waitForAnalytics() {
      if (typeof wf_analytics !== 'undefined') {
        log('wf_analytics detected, setting up tracking');
        
        // Initialize page view tracking
        wf_analytics.init({
          pageView: {
            name: 'Landing Page Templates - Category Filter Viewed',
            data: getCurrentPageContext()
          },
          page: ANALYTICS_CONFIG.PAGE_NAME
        });
        
        // Set up all tracking
        setupCategoryFilterIntegration();
        trackUrlParameterUsage();
        
        log('Category Filter Analytics initialized successfully');
      } else {
        log('Waiting for wf_analytics...');
        setTimeout(waitForAnalytics, 100);
      }
    }
    
    waitForAnalytics();
  }
  
  // === PUBLIC API ===
  window.CategoryFilterAnalytics = {
    track: trackEvent,
    trackCategory: trackCategorySelection,
    trackSubcategory: trackSubcategorySelection,
    trackClear: trackFilterCleared,
    getContext: getCurrentPageContext,
    debug: function(enabled) {
      ANALYTICS_CONFIG.DEBUG = enabled;
      log('Debug mode', enabled ? 'enabled' : 'disabled');
    }
  };
  
  // === START ===
  log('🚀 Category Filter Analytics v1.0 starting...');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();