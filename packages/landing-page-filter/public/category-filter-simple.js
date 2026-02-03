/**
 * Ultra-Simplified Category Filter
 * 
 * First Principles:
 * 1. Finsweet filters by parent category (reduces to <100 items)
 * 2. Custom logic filters visible items by data-subcategory
 * 
 * Total Complexity: ~150 lines vs 1500+
 */

(function() {
  'use strict';
  
  // === CONFIGURATION ===
  var CONFIG = {
    API_URL: 'https://landing-page-category-filter.vercel.app/api/categories?hierarchical=true',
    SWIPER_CONTAINER: '#subcategory-list',
    ITEMS_SELECTOR: '.tm-templates_grid .w-dyn-item',
    URL_PARAM_NAME: 'category',
    SUBCATEGORY_URL_PARAM_NAME: 'subcategory',
    DEBUG: true
  };
  
  // === STATE ===
  var currentParent = null;
  var currentSubcategory = null;
  var categoriesData = null;
  
  // === UTILITIES ===
  function log(message, data) {
    if (CONFIG.DEBUG) console.log('[SimpleFilter]', message, data || '');
  }
  
  function error(message, err) {
    console.error('[SimpleFilter]', message, err || '');
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
  
  function updateUrlParameter(name, value) {
    try {
      var url = new URL(window.location.href);
      if (value) {
        url.searchParams.set(name, value);
      } else {
        url.searchParams.delete(name);
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // Fallback for older browsers - don't update URL
      log('URL update not supported in this browser');
    }
  }
  
  // === CORE FILTERING ===
  function filterByParent(categoryName) {
    log('Filtering by parent:', categoryName);
    currentParent = categoryName;
    currentSubcategory = null;
    
    if (!window.fsAttributes) {
      error('Finsweet not available');
      return;
    }
    
    window.fsAttributes.push(['cmsfilter', function(filterInstances) {
      if (!filterInstances || filterInstances.length === 0) return;
      
      var filter = filterInstances[0];
      filter.resetFilters().then(function() {
        if (categoryName) {
          var categoryFilter = filter.filtersData.find(function(f) {
            return f.filterKeys && f.filterKeys.includes('category');
          });
          
          if (categoryFilter) {
            categoryFilter.values.add(categoryName);
            return filter.applyFilters();
          }
        }
        return Promise.resolve();
      }).then(function() {
        log('✓ Parent filter applied:', categoryName);
        // Show subcategory options if available
        showSubcategories(categoryName);
      }).catch(function(err) {
        error('Filter error:', err);
      });
    }]);
  }
  
  function filterBySubcategory(subcategoryName) {
    log('Filtering by subcategory:', subcategoryName);
    currentSubcategory = subcategoryName;
    
    var items = document.querySelectorAll(CONFIG.ITEMS_SELECTOR);
    var visibleCount = 0;
    
    log('Found', items.length, 'items to filter');
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      
      // First restore any custom hiding (but respect Finsweet hiding)
      if (item.style.display === 'none' && !item.hasAttribute('data-finsweet-hidden')) {
        item.style.display = '';
      }
      
      // Skip items hidden by Finsweet
      var computedStyle = window.getComputedStyle(item);
      if (computedStyle.display === 'none') continue;
      
      // Find subcategory element
      var subcatEl = item.querySelector('[data-subcategory="' + subcategoryName + '"]');
      
      if (i === 0) {
        // Debug first item
        log('First item HTML preview:', item.innerHTML.substring(0, 200) + '...');
        log('Looking for [data-subcategory="' + subcategoryName + '"]');
        log('Found subcategory element:', !!subcatEl);
      }
      
      if (subcatEl) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    }
    
    log('Subcategory filter result:', visibleCount, 'items visible');
  }
  
  // === UI MANAGEMENT ===
  function showSubcategories(parentName) {
    if (!categoriesData || !parentName) return;
    
    // Find parent category data
    var parentCategory = categoriesData.find(function(cat) {
      return cat.name === parentName;
    });
    
    if (!parentCategory || !parentCategory.children) {
      log('No subcategories for:', parentName);
      return;
    }
    
    log('Building subcategory UI for:', parentName, parentCategory.children.length, 'subcategories');
    buildSubcategoryInterface(parentName, parentCategory.children);
  }
  
  function buildSubcategoryInterface(parentName, subcategories) {
    var container = document.querySelector(CONFIG.SWIPER_CONTAINER);
    if (!container) {
      error('Swiper container not found');
      return;
    }
    
    var wrapper = container.querySelector('.swiper-wrapper');
    if (!wrapper) {
      error('Swiper wrapper not found');
      return;
    }
    
    // Get template slide
    var template = wrapper.querySelector('.swiper-slide');
    if (!template) {
      error('Template slide not found');
      return;
    }
    
    // Clear existing slides
    wrapper.innerHTML = '';
    
    // Add parent slide
    var parentSlide = createSlide(template, parentName, 'parent');
    wrapper.appendChild(parentSlide);
    
    // Add separator
    var separator = createSlide(template, '|', 'separator');
    wrapper.appendChild(separator);
    
    // Add subcategory slides
    for (var i = 0; i < subcategories.length; i++) {
      var subSlide = createSlide(template, subcategories[i].name, 'subcategory');
      wrapper.appendChild(subSlide);
    }
    
    updateSwiper();
  }
  
  function createSlide(template, text, type) {
    var slide = template.cloneNode(true);
    var link = slide.querySelector('a');
    
    if (!link) return slide;
    
    link.textContent = text;
    link.href = '#';
    
    if (type === 'separator') {
      link.style.pointerEvents = 'none';
      link.style.opacity = '0.6';
    } else {
      link.onclick = function(e) {
        e.preventDefault();
        handleClick(text, type);
        return false;
      };
      
      if (type === 'parent') {
        link.style.fontWeight = 'bold';
        link.classList.add('active');
      }
    }
    
    return slide;
  }
  
  function handleClick(name, type) {
    log('Clicked:', name, 'type:', type);
    
    if (type === 'parent') {
      if (currentParent === name || name === 'All Categories') {
        // Second click or "All Categories" - deselect
        currentParent = null;
        currentSubcategory = null;
        updateUrlParameter(CONFIG.URL_PARAM_NAME, '');
        updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
        filterByParent('');
        buildParentInterface();
      } else {
        // Different parent - switch
        updateUrlParameter(CONFIG.URL_PARAM_NAME, name);
        updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
        filterByParent(name);
      }
    } else if (type === 'subcategory') {
      if (currentSubcategory === name) {
        // Second click - back to parent only
        currentSubcategory = null;
        updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
        filterByParent(currentParent);
      } else {
        // Apply subcategory filter
        updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, name);
        filterBySubcategory(name);
      }
    }
  }
  
  function buildParentInterface() {
    if (!categoriesData) return;
    
    var container = document.querySelector(CONFIG.SWIPER_CONTAINER);
    if (!container) return;
    
    var wrapper = container.querySelector('.swiper-wrapper');
    if (!wrapper) return;
    
    var template = wrapper.querySelector('.swiper-slide');
    if (!template) return;
    
    // Clear and rebuild with parent categories
    wrapper.innerHTML = '';
    
    // Add "All Categories" option
    var allSlide = createSlide(template, 'All Categories', 'parent');
    wrapper.appendChild(allSlide);
    
    // Add parent categories
    for (var i = 0; i < categoriesData.length; i++) {
      var parentSlide = createSlide(template, categoriesData[i].name, 'parent');
      wrapper.appendChild(parentSlide);
    }
    
    updateSwiper();
  }
  
  function updateSwiper() {
    // Update Swiper instance
    if (window.swiperInstance && window.swiperInstance.update) {
      window.swiperInstance.update();
    } else {
      var swiper = document.querySelector('.swiper');
      if (swiper && swiper.swiper) {
        swiper.swiper.update();
      }
    }
  }
  
  // === INITIALIZATION ===
  function loadCategories() {
    log('Loading categories from API...');
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', CONFIG.API_URL, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data && data.categories && data.hierarchical) {
            categoriesData = data.categories;
            log('✓ Categories loaded:', categoriesData.length);
            initializeInterface();
          } else {
            error('Invalid API response format');
          }
        } catch (e) {
          error('Failed to parse API response:', e);
        }
      } else {
        error('API request failed:', xhr.status);
      }
    };
    xhr.onerror = function() {
      error('API request error');
    };
    xhr.send();
  }
  
  function initializeInterface() {
    log('Initializing interface...');
    buildParentInterface();
    
    // Check for URL parameters and apply initial filters
    var urlCategory = getUrlParameter(CONFIG.URL_PARAM_NAME);
    var urlSubcategory = getUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME);
    
    if (urlCategory) {
      log('Applying URL category filter:', urlCategory);
      filterByParent(urlCategory);
      
      if (urlSubcategory) {
        setTimeout(function() {
          filterBySubcategory(urlSubcategory);
        }, 500); // Allow parent filter to complete first
      }
    }
  }
  
  function waitForDependencies() {
    var attempts = 0;
    var maxAttempts = 30;
    
    function check() {
      attempts++;
      var hasSwiper = !!document.querySelector(CONFIG.SWIPER_CONTAINER);
      var hasFinsweet = !!window.fsAttributes;
      
      if ((hasSwiper && hasFinsweet) || attempts >= maxAttempts) {
        if (hasSwiper && hasFinsweet) {
          log('✓ Dependencies ready, initializing...');
          loadCategories();
        } else {
          error('Dependencies not found after', maxAttempts, 'attempts');
        }
      } else {
        setTimeout(check, 100);
      }
    }
    
    check();
  }
  
  // === PUBLIC API ===
  window.SimpleCategoryFilter = {
    debug: function(enabled) {
      CONFIG.DEBUG = enabled;
      log('Debug mode', enabled ? 'enabled' : 'disabled');
    },
    filterParent: filterByParent,
    filterSubcategory: filterBySubcategory,
    getState: function() {
      return {
        parent: currentParent,
        subcategory: currentSubcategory,
        categoriesLoaded: !!categoriesData
      };
    }
  };
  
  // === START ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDependencies);
  } else {
    waitForDependencies();
  }
  
})();