/**
 * Category Filter Script - Optimized for Webflow Integration
 * 
 * @version 1.0.0
 * @author Landing Page Category Filter
 * @description Dynamic category filtering for Webflow template marketplace
 * 
 * Features:
 * - Fetches categories from API with fallback to page-extracted categories
 * - Template-based UI enhancement maintaining Webflow styling
 * - Finsweet Infinite Load compatibility
 * - Show more/less functionality for large category lists
 * - Debounced filtering for optimal performance
 * - ES5 compatibility for broad browser support
 * 
 * Usage:
 * 1. Include this script in your Webflow page
 * 2. Ensure you have a filter dropdown with ID #filter-sort-toggle-category
 * 3. Template items should have class .tm-templates_grid_item
 * 4. Category fields should have class .tm-category
 * 
 * Production URL: https://landing-page-filter.pages.dev/category-filter.min.js
 * Development URL: https://landing-page-filter.pages.dev/category-filter.js
 */

(function() {
  'use strict';
  
  // Configuration
  var CONFIG = {
    API_ENDPOINT: 'https://landing-page-filter.pages.dev/api/categories',
    HIERARCHICAL_API_ENDPOINT: 'https://landing-page-filter.pages.dev/api/categories?hierarchical=true',
    SWIPER_CONTAINER_SELECTOR: '#subcategory-list',
    SWIPER_WRAPPER_SELECTOR: '.swiper-wrapper',
    ITEMS_SELECTOR: '.tm-templates_grid .w-dyn-item',
    CATEGORY_FIELD_SELECTOR: '[fs-cmsfilter-field="category"]',
    SUBCATEGORY_FIELD_SELECTOR: '[data-subcategory]',
    FINSWEET_FILTER_FIELD: 'category',
    FINSWEET_SUBCATEGORY_FIELD: 'subcategory',
    HEADING_SELECTOR: 'h1.h3',
    URL_PARAM_NAME: 'category',
    SUBCATEGORY_URL_PARAM_NAME: 'subcategory',
    INITIAL_SHOW_COUNT: 10,
    DEBUG: true,
    ENABLE_ANALYTICS: true,
    ANALYTICS_ENDPOINT: 'https://landing-page-filter.pages.dev/api/analytics',
    // Script compatibility flags
    HAS_INFINITE_SCROLL: true,
    RECOMMENDED_SCRIPT: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-list@1/list.js',
    CURRENT_SCRIPT_TYPE: 'cmsfilter' // Change to 'list' when using List package
  };
  
  // Utility functions
  var Utils = {
    log: function(message, data) {
      if (CONFIG.DEBUG) {
        console.log('[CategoryFilter]', message, data || '');
      }
    },
    
    error: function(message, error) {
      console.error('[CategoryFilter]', message, error || '');
      Analytics.trackError(message, error);
    },
    
    sanitizeText: function(text) {
      if (typeof text !== 'string') return '';
      return text.replace(/[<>]/g, '').trim();
    },
    
    debounce: function(func, wait) {
      var timeout;
      return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          func.apply(context, args);
        }, wait);
      };
    },
    
    // URL parameter utilities
    getUrlParameter: function(name) {
      try {
        var url = new URL(window.location.href);
        return url.searchParams.get(name);
      } catch (e) {
        // Fallback for older browsers
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
        var results = regex.exec(window.location.href);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
      }
    },
    
    updateUrlParameter: function(name, value) {
      try {
        var url = new URL(window.location.href);
        
        if (value && value !== '') {
          url.searchParams.set(name, value);
        } else {
          url.searchParams.delete(name);
        }
        
        var newUrl = url.toString();
        
        // Update URL without page reload
        if (window.history && window.history.pushState) {
          window.history.pushState({ category: value }, '', newUrl);
        }
        
        return newUrl;
      } catch (e) {
        Utils.error('Error updating URL parameter', e);
        return window.location.href;
      }
    },
    
    slugifyCategory: function(categoryName) {
      if (!categoryName) return '';
      return categoryName
        .toLowerCase()                        // Convert to lowercase
        .replace(/[^a-z0-9\s-]/g, '')        // Remove all characters except letters, numbers, spaces, and dashes
        .replace(/[\s_]+/g, '-')             // Replace spaces and underscores with dashes
        .replace(/-+/g, '-')                 // Replace multiple consecutive dashes with single dash
        .replace(/^-+|-+$/g, '');            // Remove leading and trailing dashes
    },
    
    unslugifyCategory: function(urlSlug) {
      if (!urlSlug) return '';
      
      // Handle special cases first
      var specialCases = {
        'architecture-design': 'Architecture & Design',
        'arts-entertainment': 'Arts & Entertainment',
        'food-drink': 'Food & Drink',
        'hair-beauty': 'Hair & Beauty',
        'home-services': 'Home Services',
        'hr-hiring': 'HR & Hiring',
        'music-audio': 'Music & Audio',
        'portfolio-agency': 'Portfolio & Agency',
        'real-estate': 'Real Estate',
        'retail-e-commerce': 'Retail & E-Commerce',
        'travel-tourism': 'Travel & Tourism',
        'weddings-events': 'Weddings & Events'
      };
      
      if (specialCases[urlSlug]) {
        return specialCases[urlSlug];
      }
      
      // Convert slug back to readable format
      return urlSlug
        .split('-')
        .map(function(word) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    },
    
    normalizeUrlParam: function(param) {
      // Handle both raw encoded and slugified URL parameters
      if (!param) return '';
      
      // If already slugified (contains hyphens, no spaces)
      if (param.indexOf('-') !== -1 && param.indexOf(' ') === -1 && param === param.toLowerCase()) {
        return Utils.unslugifyCategory(param);
      }
      
      // If raw encoded (decode it)
      try {
        var decoded = decodeURIComponent(param.replace(/\+/g, ' '));
        return decoded;
      } catch (e) {
        Utils.error('Error decoding URL parameter', e);
        return param;
      }
    }
  };
  
  // Analytics and error tracking
  var Analytics = {
    sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    startTime: Date.now(),
    events: [],
    
    track: function(event, data) {
      if (!CONFIG.ENABLE_ANALYTICS) return;
      
      var eventData = {
        event: event,
        data: data || {},
        timestamp: Date.now(),
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      this.events.push(eventData);
      
      // Send immediately for critical events, batch for others
      if (event === 'error' || event === 'init_failed') {
        this.sendEvents([eventData]);
      } else if (this.events.length >= 5) {
        this.sendBatch();
      }
    },
    
    trackError: function(message, error) {
      var errorData = {
        message: message,
        stack: error && error.stack ? error.stack : '',
        type: error && error.name ? error.name : 'Unknown',
        line: error && error.line ? error.line : null,
        column: error && error.column ? error.column : null
      };
      
      this.track('error', errorData);
    },
    
    trackFilter: function(category, visibleCount, totalCount) {
      this.track('filter_applied', {
        category: category,
        visible_count: visibleCount,
        total_count: totalCount,
        usage_time: Date.now() - this.startTime
      });
    },
    
    trackInit: function(categoriesCount, source) {
      this.track('init_success', {
        categories_count: categoriesCount,
        categories_source: source,
        init_time: Date.now() - this.startTime
      });
    },
    
    sendBatch: function() {
      if (this.events.length === 0) return;
      
      var eventsToSend = this.events.splice(0);
      this.sendEvents(eventsToSend);
    },
    
    sendEvents: function(events) {
      if (!CONFIG.ENABLE_ANALYTICS || events.length === 0) return;
      
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CONFIG.ANALYTICS_ENDPOINT, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 3000;
        
        // Silent failure for analytics
        xhr.onerror = function() {};
        xhr.ontimeout = function() {};
        
        xhr.send(JSON.stringify({ events: events }));
      } catch (e) {
        // Silent failure - don't let analytics break the main functionality
      }
    },
    
    // Send remaining events before page unload
    beforeUnload: function() {
      if (this.events.length > 0) {
        // Use sendBeacon if available for better reliability
        if (navigator.sendBeacon && CONFIG.ENABLE_ANALYTICS) {
          try {
            navigator.sendBeacon(
              CONFIG.ANALYTICS_ENDPOINT,
              JSON.stringify({ events: this.events })
            );
          } catch (e) {
            // Fallback to regular XHR
            this.sendBatch();
          }
        } else {
          this.sendBatch();
        }
      }
    }
  };
  
  // Set up analytics cleanup
  window.addEventListener('beforeunload', function() {
    Analytics.beforeUnload();
  });
  
  // State management
  var State = {
    isInitialized: false,
    categories: [],
    selectedCategory: '',
    selectedSubcategory: '',
    isFiltering: false,
    currentDOMFilter: undefined,
    infiniteScrollObserver: null,
    // Combo filter state
    mode: 'parent', // 'parent' or 'subcategory'
    selectedParent: null,
    hierarchicalCategories: [],
    hierarchicalData: null // Live extracted subcategory data
  };
  
  // Category data manager
  var CategoryManager = {
    fetchFromAPI: function() {
      return new Promise(function(resolve) {
        try {
          var xhr = new XMLHttpRequest();
          xhr.timeout = 5000;
          xhr.open('GET', CONFIG.API_ENDPOINT, true);
          xhr.setRequestHeader('Accept', 'application/json');
          
          xhr.onload = function() {
            if (xhr.status === 200) {
              try {
                var data = JSON.parse(xhr.responseText);
                if (data && Array.isArray(data.categories)) {
                  var validCategories = data.categories.filter(function(cat) {
                    return cat && cat.name && cat.id;
                  });
                  validCategories.sort(function(a, b) {
                    return a.name.localeCompare(b.name);
                  });
                  Utils.log('API categories loaded', validCategories.length);
                  Analytics.trackInit(validCategories.length, 'api');
                  resolve(validCategories);
                  return;
                }
              } catch (e) {
                Utils.error('API parse error', e);
              }
            }
            resolve(CategoryManager.getFallbackCategories());
          };
          
          xhr.onerror = function() {
            Utils.log('API request failed, using fallback');
            resolve(CategoryManager.getFallbackCategories());
          };
          
          xhr.ontimeout = function() {
            Utils.log('API request timeout, using fallback');
            resolve(CategoryManager.getFallbackCategories());
          };
          
          xhr.send();
        } catch (e) {
          Utils.error('API request error', e);
          resolve(CategoryManager.getFallbackCategories());
        }
      });
    },
    
    getFallbackCategories: function() {
      var categories = [];
      var seen = {};
      
      try {
        var elements = document.querySelectorAll(CONFIG.CATEGORY_FIELD_SELECTOR);
        
        for (var i = 0; i < elements.length; i++) {
          var text = Utils.sanitizeText(elements[i].textContent);
          if (text && !seen[text]) {
            seen[text] = true;
            categories.push(text);
          }
        }
      } catch (e) {
        Utils.error('Fallback categories extraction failed', e);
        return [];
      }
      
      categories.sort();
      var result = [];
      for (var j = 0; j < categories.length; j++) {
        result.push({ id: 'cat' + j, name: categories[j] });
      }
      
      Utils.log('Fallback categories loaded', result.length);
      Analytics.trackInit(result.length, 'fallback');
      return result;
    },
    
    fetchHierarchicalFromAPI: function() {
      return new Promise(function(resolve) {
        try {
          Utils.log('Starting hierarchical API request to:', CONFIG.HIERARCHICAL_API_ENDPOINT);
          var xhr = new XMLHttpRequest();
          xhr.timeout = 5000;
          xhr.open('GET', CONFIG.HIERARCHICAL_API_ENDPOINT, true);
          xhr.setRequestHeader('Accept', 'application/json');
          
          xhr.onload = function() {
            Utils.log('Hierarchical API response status:', xhr.status);
            if (xhr.status === 200) {
              try {
                var data = JSON.parse(xhr.responseText);
                Utils.log('Hierarchical API response parsed:', {
                  hasData: !!data,
                  hasCategories: !!(data && data.categories),
                  categoriesIsArray: !!(data && Array.isArray(data.categories)),
                  categoriesLength: data && data.categories ? data.categories.length : 0,
                  hasHierarchicalFlag: !!(data && data.hierarchical),
                  hierarchicalValue: data ? data.hierarchical : undefined
                });
                
                if (data && Array.isArray(data.categories) && data.hierarchical) {
                  var validCategories = data.categories.filter(function(cat) {
                    return cat && cat.name && cat.id;
                  });
                  validCategories.sort(function(a, b) {
                    return a.name.localeCompare(b.name);
                  });
                  Utils.log('Hierarchical API categories loaded', validCategories.length);
                  Utils.log('First category sample:', validCategories[0]);
                  Analytics.trackInit(validCategories.length, 'hierarchical_api');
                  resolve(validCategories);
                  return;
                } else {
                  Utils.log('Hierarchical API validation failed, falling back to regular API');
                }
              } catch (e) {
                Utils.error('Hierarchical API parse error', e);
              }
            } else {
              Utils.log('Hierarchical API bad status, falling back to regular API');
            }
            // Fallback to regular API if hierarchical fails
            Utils.log('Falling back to regular API');
            resolve(CategoryManager.fetchFromAPI());
          };
          
          xhr.onerror = function() {
            Utils.log('Hierarchical API request failed, using regular API');
            resolve(CategoryManager.fetchFromAPI());
          };
          
          xhr.ontimeout = function() {
            Utils.log('Hierarchical API request timeout, using regular API');
            resolve(CategoryManager.fetchFromAPI());
          };
          
          xhr.send();
        } catch (e) {
          Utils.error('Hierarchical API request error', e);
          resolve(CategoryManager.fetchFromAPI());
        }
      });
    }
  };
  
  // DOM manipulation
  var DOM = {
    injectStyles: function() {
      if (document.getElementById('category-filter-styles')) return;
      
      var style = document.createElement('style');
      style.id = 'category-filter-styles';
      style.textContent = [
        '.category-filter-loading { opacity: 0.5; pointer-events: none; }',
        '.category-filter-error { color: #ef4444; font-size: 12px; padding: 8px; }',
        '.category-filter-active { background-color: #146ef5; color: white; }'
      ].join('\n');
      
      document.head.appendChild(style);
    }
  };

  // Heading management
  var Heading = {
    originalText: '',
    
    init: function() {
      var headingEl = document.querySelector(CONFIG.HEADING_SELECTOR);
      if (headingEl && !this.originalText) {
        this.originalText = headingEl.textContent.trim();
      }
    },
    
    updateForCategory: function(categoryName) {
      var headingEl = document.querySelector(CONFIG.HEADING_SELECTOR);
      if (!headingEl) return;
      
      if (categoryName && categoryName !== '') {
        headingEl.textContent = categoryName + ' Landing Page Templates';
      } else {
        // Reset to original text when no category is selected
        headingEl.textContent = this.originalText || 'Landing Page Website Templates';
      }
      
      Utils.log('Updated heading for category: ' + (categoryName || 'All'));
    }
  };
  
  
  // Subcategory management
  var SubcategoryManager = {
    fetchHierarchicalData: function() {
      return new Promise(function(resolve) {
        try {
          Utils.log('Fetching hierarchical data from API');
          var xhr = new XMLHttpRequest();
          xhr.open('GET', CONFIG.HIERARCHICAL_API_ENDPOINT, true);
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                try {
                  var response = JSON.parse(xhr.responseText);
                  if (response && response.categories) {
                    var hierarchicalMap = {};
                    var allSubcategories = [];
                    
                    // Process API response to build hierarchical map
                    for (var i = 0; i < response.categories.length; i++) {
                      var category = response.categories[i];
                      if (category.children && category.children.length > 0) {
                        var subcategories = [];
                        for (var j = 0; j < category.children.length; j++) {
                          var child = category.children[j];
                          subcategories.push(child.name);
                          if (allSubcategories.indexOf(child.name) === -1) {
                            allSubcategories.push(child.name);
                          }
                        }
                        hierarchicalMap[category.name] = subcategories;
                      }
                    }
                    
                    allSubcategories.sort();
                    Utils.log('Fetched hierarchical data:', hierarchicalMap);
                    Utils.log('Total unique subcategories:', allSubcategories.length);
                    
                    resolve({
                      hierarchicalMap: hierarchicalMap,
                      allSubcategories: allSubcategories
                    });
                  } else {
                    Utils.error('Invalid API response format');
                    resolve({ hierarchicalMap: {}, allSubcategories: [] });
                  }
                } catch (e) {
                  Utils.error('Error parsing hierarchical API response', e);
                  resolve({ hierarchicalMap: {}, allSubcategories: [] });
                }
              } else {
                Utils.error('Failed to fetch hierarchical data from API', xhr.status);
                resolve({ hierarchicalMap: {}, allSubcategories: [] });
              }
            }
          };
          xhr.send();
        } catch (e) {
          Utils.error('Error fetching hierarchical data', e);
          resolve({ hierarchicalMap: {}, allSubcategories: [] });
        }
      });
    },
    
    getSubcategoriesForParent: function(parentCategory) {
      if (!State.hierarchicalData) {
        Utils.log('No hierarchical data available');
        return [];
      }
      Utils.log('Looking for subcategories for parent:', parentCategory);
      Utils.log('Available hierarchical map keys:', Object.keys(State.hierarchicalData.hierarchicalMap));
      Utils.log('Full hierarchical data:', State.hierarchicalData.hierarchicalMap);
      var subcategories = State.hierarchicalData.hierarchicalMap[parentCategory] || [];
      Utils.log('Found subcategories for "' + parentCategory + '":', subcategories);
      return subcategories;
    }
  };

  // Main initialization
  var CategoryFilter = {
    init: function() {
      if (State.isInitialized) return;
      
      Utils.log('Initializing category filter');
      
      // Check script compatibility
      CategoryFilter.checkScriptCompatibility();
      
      // Ensure all category elements have the required Finsweet attribute
      CategoryFilter.ensureCategoryAttributes();
      
      var swiperContainer = document.querySelector(CONFIG.SWIPER_CONTAINER_SELECTOR);
      if (!swiperContainer) {
        Utils.error('Swiper container not found');
        return;
      }
      
      var swiperWrapper = swiperContainer.querySelector(CONFIG.SWIPER_WRAPPER_SELECTOR);
      if (!swiperWrapper) {
        Utils.error('Swiper wrapper not found');
        return;
      }
      
      // Get existing slide template
      var existingSlide = swiperWrapper.querySelector('.swiper-slide');
      if (!existingSlide) {
        Utils.error('No existing swiper slide found to use as template');
        return;
      }
      
      // Inject styles and initialize heading
      DOM.injectStyles();
      Heading.init();
      
      // Show loading state immediately
      CategoryFilter.showLoadingState(swiperWrapper, existingSlide);
      
      // Load hierarchical categories and build interface  
      Utils.log('Starting hierarchical data loading...');
      
      CategoryManager.fetchHierarchicalFromAPI().then(function(categories) {
        Utils.log('Categories loaded, now fetching subcategory relationships...');
        State.categories = categories;
        State.hierarchicalCategories = categories;
        
        // Fetch hierarchical data from API
        return SubcategoryManager.fetchHierarchicalData();
      }).then(function(hierarchicalData) {
        Utils.log('Subcategory relationships loaded successfully');
        State.hierarchicalData = hierarchicalData;
        Utils.log('Hierarchical data loaded into State:', State.hierarchicalData);
        
        CategoryFilter.buildSwiperInterface(swiperWrapper, existingSlide, State.categories);
        CategoryFilter.setupSwiperEventListeners(swiperWrapper);
        
        // Set initial filter state from URL after interface is built
        setTimeout(function() {
          CategoryFilter.setInitialFilterFromUrl();
        }, 100);
        
        State.isInitialized = true;
        Utils.log('Category filter initialized successfully');
      }).catch(function(error) {
        Utils.error('Failed to load categories', error);
        // Show error state
        CategoryFilter.showErrorState(swiperWrapper, existingSlide);
      });
    },
    
    showLoadingState: function(swiperWrapper, existingSlide) {
      try {
        // Clear existing slides
        swiperWrapper.innerHTML = '';
        
        // Create loading slide
        var loadingSlide = this.createSwiperSlide(existingSlide, 'Loading categories...', '#');
        var loadingLink = loadingSlide.querySelector('a');
        if (loadingLink) {
          loadingLink.style.color = '#666';
          loadingLink.style.cursor = 'default';
          loadingLink.style.pointerEvents = 'none';
          loadingLink.onclick = function(e) { e.preventDefault(); return false; };
        }
        swiperWrapper.appendChild(loadingSlide);
        
        // Update Swiper to recognize the loading slide
        CategoryFilter.updateSwiper();
        
        Utils.log('Loading state displayed');
      } catch (e) {
        Utils.error('Error showing loading state', e);
      }
    },
    
    showErrorState: function(swiperWrapper, existingSlide) {
      try {
        // Clear existing slides
        swiperWrapper.innerHTML = '';
        
        // Create error slide
        var errorSlide = this.createSwiperSlide(existingSlide, 'Categories unavailable', '#');
        var errorLink = errorSlide.querySelector('a');
        if (errorLink) {
          errorLink.style.color = '#ef4444';
          errorLink.style.cursor = 'default';
          errorLink.style.pointerEvents = 'none';
          errorLink.onclick = function(e) { e.preventDefault(); return false; };
        }
        swiperWrapper.appendChild(errorSlide);
        
        // Update Swiper to recognize the error slide
        CategoryFilter.updateSwiper();
        
        Utils.log('Error state displayed');
      } catch (e) {
        Utils.error('Error showing error state', e);
      }
    },
    
    buildSwiperInterface: function(swiperWrapper, existingSlide, categories) {
      try {
        // Clear existing slides (including loading state)
        swiperWrapper.innerHTML = '';
        
        // Always add "All Categories" slide first (will be hidden via CSS if needed)
        var allSlide = this.createSwiperSlide(existingSlide, 'All Categories', '');
        swiperWrapper.appendChild(allSlide);
        
        // Always add separator slide after "All Categories" (will be hidden via CSS if needed)
        var separatorSlide = this.createSeparatorSlide(existingSlide);
        swiperWrapper.appendChild(separatorSlide);
        
        // Add category slides
        for (var i = 0; i < categories.length; i++) {
          var category = categories[i];
          var slide = this.createSwiperSlide(existingSlide, category.name, category.name);
          swiperWrapper.appendChild(slide);
        }
        
        Utils.log('Created ' + (categories.length + 2) + ' swiper slides');
        
        // Notify Swiper to update after adding new slides
        CategoryFilter.updateSwiper();
      } catch (e) {
        Utils.error('Error building swiper interface', e);
      }
    },
    
    updateSwiper: function() {
      try {
        // Try multiple ways to find and update the Swiper instance
        var swiperUpdated = false;
        
        // Method 1: Check for global swiperInstance
        if (window.swiperInstance && typeof window.swiperInstance.update === 'function') {
          Utils.log('Updating global Swiper instance');
          window.swiperInstance.update();
          swiperUpdated = true;
        }
        
        // Method 2: Check for Swiper on the element itself
        if (!swiperUpdated) {
          var swiperElement = document.querySelector('.swiper');
          if (swiperElement && swiperElement.swiper) {
            Utils.log('Updating element Swiper instance');
            swiperElement.swiper.update();
            swiperUpdated = true;
          }
        }
        
        // Method 3: Trigger a general event that the Swiper script can listen to
        if (!swiperUpdated) {
          Utils.log('Dispatching swiper update event');
          var updateEvent = new CustomEvent('categoryFilterUpdated', {
            detail: { source: 'category-filter' }
          });
          document.dispatchEvent(updateEvent);
        }
        
        // Always try to update the overlay state
        setTimeout(function() {
          var contOverlay = document.getElementById('cont-overlay');
          var swiperElement = document.querySelector('.swiper');
          
          if (contOverlay && swiperElement && swiperElement.swiper) {
            if (swiperElement.swiper.isEnd) {
              contOverlay.style.opacity = '0';
              contOverlay.style.display = 'none';
            } else {
              contOverlay.style.display = 'flex';
              contOverlay.style.opacity = '1';
            }
          }
        }, 100);
        
      } catch (e) {
        Utils.error('Error updating Swiper', e);
      }
    },
    
    createSwiperSlide: function(template, categoryName, categoryValue) {
      var slide = template.cloneNode(true);
      var link = slide.querySelector('a');
      if (link) {
        link.textContent = categoryName;
        link.href = '#';
        link.setAttribute('data-category', categoryValue);
        link.setAttribute('data-filter-value', categoryValue);
        
        // Add Finsweet filter field attribute directly to the swiper element
        link.setAttribute('fs-cmsfilter-field', CONFIG.FINSWEET_FILTER_FIELD);
        
        // Mark as active if it's "All Categories" (default)
        if (categoryValue === '') {
          link.classList.add('category-filter-active');
        }
        
        // Enhanced click behavior for hierarchical filtering
        link.onclick = function(e) {
          e.preventDefault();
          CategoryFilter.handleCategoryClick(link, categoryValue, categoryName);
          return false;
        };
      }
      return slide;
    },
    
    createSeparatorSlide: function(template) {
      var slide = template.cloneNode(true);
      var link = slide.querySelector('a');
      if (link) {
        link.textContent = '|';
        link.href = '#';
        link.style.pointerEvents = 'none';
        link.style.cursor = 'default';
        link.style.opacity = '0.6';
        link.style.fontWeight = 'normal';
        link.removeAttribute('data-category');
        link.removeAttribute('data-filter-value');
        link.removeAttribute('fs-cmsfilter-field');
        
        // Prevent any click behavior
        link.onclick = function(e) {
          e.preventDefault();
          return false;
        };
      }
      return slide;
    },

    // Simple combo filter handler with second-click deselection
    handleCategoryClick: function(clickedLink, categoryValue, categoryName) {
      try {
        Utils.log('Category clicked:', categoryName, 'Mode:', State.mode);
        Utils.log('Selected parent:', State.selectedParent);
        Utils.log('Selected subcategory:', State.selectedSubcategory);
        
        if (State.mode === 'parent') {
          // Parent mode: handle parent category clicks
          CategoryFilter.handleParentCategoryClick(clickedLink, categoryValue, categoryName);
        } else if (State.mode === 'subcategory') {
          // Subcategory mode: handle subcategory clicks or back button
          if (categoryValue === 'back') {
            CategoryFilter.switchToParentMode();
          } else {
            CategoryFilter.handleSubcategoryClick(clickedLink, categoryValue, categoryName);
          }
        }
      } catch (e) {
        Utils.error('Error handling category click', e);
      }
    },
    
    handleParentCategoryClick: function(clickedLink, categoryValue, categoryName) {
      // Second-click deselection logic
      if (State.selectedCategory === categoryValue) {
        // Second click on same category - deselect and show all
        Utils.log('Second click detected - deselecting category');
        // Find "All Categories" link to set as active
        var allCategoriesLink = document.querySelector('[data-filter-value=""]');
        CategoryFilter.setActiveCategory(allCategoriesLink);
        CategoryFilter.applyHybridFilter('', ''); // Clear both category and subcategory
        return;
      }
      
      // Check if this parent has subcategories in the live data
      Utils.log('Checking for subcategories for parent:', categoryName);
      var subcategories = SubcategoryManager.getSubcategoriesForParent(categoryName);
      Utils.log('Subcategories lookup result:', subcategories);
      
      if (subcategories && subcategories.length > 0) {
        // Parent has subcategories - switch to subcategory mode
        Utils.log('Parent has subcategories, switching to subcategory mode');
        Utils.log('Available subcategories:', subcategories);
        CategoryFilter.switchToSubcategoryMode(categoryName, subcategories);
      } else {
        // Parent has no subcategories - regular filtering
        Utils.log('Parent has no children, applying regular filter');
        CategoryFilter.setActiveCategory(clickedLink);
        CategoryFilter.applyHybridFilter(categoryValue, ''); // Category only, no subcategory
      }
    },
    
    handleSubcategoryClick: function(clickedLink, categoryValue, categoryName) {
      // Check if clicking the parent category while in subcategory mode (should deselect)
      if (categoryName === State.selectedParent) {
        Utils.log('Clicked parent category in subcategory mode - deselecting everything');
        // Find "All Categories" link to set as active
        var allCategoriesLink = document.querySelector('[data-filter-value=""]');
        CategoryFilter.setActiveCategory(allCategoriesLink);
        CategoryFilter.applyHybridFilter('', ''); // Clear both category and subcategory
        CategoryFilter.switchToParentMode();
        return;
      }
      
      // Second-click deselection for subcategories
      if (State.selectedSubcategory === categoryName) {
        // Second click on same subcategory - revert to parent-only filter
        Utils.log('Second click on subcategory - reverting to parent filter');
        CategoryFilter.applyHybridFilter(State.selectedParent, ''); // Category only
        State.selectedSubcategory = '';
        // Update active state - no subcategory should be active
        var allSubcategoryLinks = document.querySelectorAll('[data-subcategory]');
        for (var i = 0; i < allSubcategoryLinks.length; i++) {
          allSubcategoryLinks[i].classList.remove('category-filter-active');
        }
        return;
      }
      
      // Apply combo filter: parent category + subcategory
      Utils.log('Applying combo filter:', State.selectedParent, '+', categoryName);
      CategoryFilter.setActiveCategory(clickedLink);
      CategoryFilter.applyHybridFilter(State.selectedParent, categoryName);
      State.selectedSubcategory = categoryName;
    },
    
    switchToSubcategoryMode: function(parentCategoryName, subcategories) {
      State.mode = 'subcategory';
      State.selectedParent = parentCategoryName;
      State.selectedSubcategory = '';
      
      // First filter by parent category only
      CategoryFilter.applyHybridFilter(parentCategoryName, '');
      
      // Rebuild swiper with parent + pipe + subcategories
      var swiperWrapper = document.querySelector(CONFIG.SWIPER_WRAPPER_SELECTOR);
      var existingSlide = swiperWrapper.querySelector('.swiper-slide');
      
      if (swiperWrapper && existingSlide) {
        CategoryFilter.buildSubcategoryInterface(swiperWrapper, existingSlide, parentCategoryName, subcategories);
      }
    },
    
    switchToParentMode: function() {
      State.mode = 'parent';
      State.selectedParent = null;
      State.selectedSubcategory = '';
      
      var swiperWrapper = document.querySelector(CONFIG.SWIPER_WRAPPER_SELECTOR);
      var existingSlide = swiperWrapper.querySelector('.swiper-slide');
      
      if (swiperWrapper && existingSlide) {
        CategoryFilter.buildSwiperInterface(swiperWrapper, existingSlide, State.hierarchicalCategories);
        
        // After rebuilding, set "All Categories" as active and clear filters
        setTimeout(function() {
          var allCategoriesLink = document.querySelector('[data-filter-value=""]');
          CategoryFilter.setActiveCategory(allCategoriesLink);
          CategoryFilter.applyHybridFilter('', ''); // Clear both category and subcategory
        }, 50);
      }
    },
    
    buildSubcategoryInterface: function(swiperWrapper, existingSlide, parentCategoryName, subcategories) {
      try {
        // Clear existing slides
        swiperWrapper.innerHTML = '';
        
        // Add parent category slide (active/selected)
        var parentSlide = this.createSwiperSlide(existingSlide, parentCategoryName, parentCategoryName);
        var parentLink = parentSlide.querySelector('a');
        if (parentLink) {
          parentLink.classList.add('category-filter-active');
          parentLink.style.fontWeight = 'bold';
        }
        swiperWrapper.appendChild(parentSlide);
        
        // Add pipe separator
        var separatorSlide = this.createSeparatorSlide(existingSlide);
        swiperWrapper.appendChild(separatorSlide);
        
        // Add subcategory slides
        for (var i = 0; i < subcategories.length; i++) {
          var subcategoryName = subcategories[i];
          var slide = this.createSubcategorySlide(existingSlide, subcategoryName);
          swiperWrapper.appendChild(slide);
        }
        
        Utils.log('Built subcategory interface with', subcategories.length, 'subcategories for', parentCategoryName);
        CategoryFilter.updateSwiper();
      } catch (e) {
        Utils.error('Error building subcategory interface', e);
      }
    },
    
    createSubcategorySlide: function(template, subcategoryName) {
      var slide = template.cloneNode(true);
      var link = slide.querySelector('a');
      if (link) {
        link.textContent = subcategoryName;
        link.href = '#';
        link.setAttribute('data-subcategory', subcategoryName);
        link.setAttribute('data-filter-value', subcategoryName);
        link.setAttribute('fs-cmsfilter-field', CONFIG.FINSWEET_SUBCATEGORY_FIELD);
        link.setAttribute('fs-cmsfilter-match', 'any');
        link.classList.remove('category-filter-active');
        
        link.onclick = function(e) {
          e.preventDefault();
          CategoryFilter.handleCategoryClick(link, subcategoryName, subcategoryName);
          return false;
        };
      }
      return slide;
    },

    createBackSlide: function(template) {
      var slide = template.cloneNode(true);
      var link = slide.querySelector('a');
      if (link) {
        link.textContent = '← Back to All Categories';
        link.href = '#';
        link.setAttribute('data-category', 'back');
        link.setAttribute('data-filter-value', 'back');
        link.style.fontWeight = 'bold';
        link.style.color = '#146ef5';
        
        // Remove Finsweet attributes for back button
        link.removeAttribute('fs-cmsfilter-field');
        
        link.onclick = function(e) {
          e.preventDefault();
          CategoryFilter.handleCategoryClick(link, 'back', 'Back');
          return false;
        };
      }
      return slide;
    },

    setActiveCategory: function(activeLink) {
      try {
        var newSelectedCategory = activeLink ? activeLink.getAttribute('data-filter-value') : '';
        State.selectedCategory = newSelectedCategory || '';
        
        // Show/hide "All Categories" and separator using CSS
        CategoryFilter.toggleAllCategoriesVisibility(newSelectedCategory);
        
        // Update all links: remove active class and clear attribute
        var allLinks = document.querySelectorAll('[data-filter-value]');
        for (var i = 0; i < allLinks.length; i++) {
          allLinks[i].classList.remove('category-filter-active');
          allLinks[i].removeAttribute('fs-cmsfilter-element');
        }
        
        // Set active link with clear functionality
        if (activeLink) {
          activeLink.classList.add('category-filter-active');
          // Add clear attribute to active category for second-click clearing
          if (newSelectedCategory !== '') {
            activeLink.setAttribute('fs-cmsfilter-element', 'clear');
          }
        }
      } catch (e) {
        Utils.error('Error setting active category', e);
      }
    },
    
    toggleAllCategoriesVisibility: function(selectedCategory) {
      try {
        // Find "All Categories" slide and separator
        var allCategoriesElement = document.querySelector('[data-filter-value=""]');
        var allCategoriesSlide = allCategoriesElement ? allCategoriesElement.closest('.swiper-slide') : null;
        var separatorSlide = allCategoriesSlide && allCategoriesSlide.nextElementSibling;
        
        var shouldHide = selectedCategory && selectedCategory !== '';
        
        if (allCategoriesSlide) {
          allCategoriesSlide.style.display = shouldHide ? 'none' : '';
          Utils.log('All Categories slide:', shouldHide ? 'hidden' : 'visible');
        }
        
        if (separatorSlide && separatorSlide.textContent.trim() === '|') {
          separatorSlide.style.display = shouldHide ? 'none' : '';
          Utils.log('Separator slide:', shouldHide ? 'hidden' : 'visible');
        }
        
        // Update Swiper after visibility changes
        CategoryFilter.updateSwiper();
      } catch (e) {
        Utils.error('Error toggling All Categories visibility', e);
      }
    },
    
    setupSwiperEventListeners: function(swiperWrapper) {
      try {
        swiperWrapper.addEventListener('click', function(e) {
          if (e.target && e.target.tagName === 'A') {
            var categoryValue = e.target.getAttribute('data-filter-value');
            if (categoryValue !== null) {
              Utils.log('Category filter clicked: ' + categoryValue);
              Analytics.trackFilter(categoryValue, 0, 0);
            }
          }
        });
      } catch (e) {
        Utils.error('Error setting up swiper event listeners', e);
      }
    },

    applyHybridFilter: function(categoryValue, subcategoryValue) {
      try {
        Utils.log('HYBRID FILTER: Category =', categoryValue, '| Subcategory =', subcategoryValue);
        
        // Update URL parameters
        if (categoryValue && categoryValue !== '') {
          var slugifiedCategory = Utils.slugifyCategory(categoryValue);
          Utils.updateUrlParameter(CONFIG.URL_PARAM_NAME, slugifiedCategory);
        } else {
          Utils.updateUrlParameter(CONFIG.URL_PARAM_NAME, '');
        }
        
        if (subcategoryValue && subcategoryValue !== '') {
          var slugifiedSubcategory = Utils.slugifyCategory(subcategoryValue);
          Utils.updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, slugifiedSubcategory);
        } else {
          Utils.updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
        }
        
        // Update state
        State.selectedCategory = categoryValue || '';
        State.selectedSubcategory = subcategoryValue || '';
        
        // Update page heading
        var displayName = categoryValue;
        if (subcategoryValue) {
          displayName = subcategoryValue;
        }
        Heading.updateForCategory(displayName);
        
        // Step 1: Use Finsweet to filter by parent category
        if (window.fsAttributes) {
          try {
            window.fsAttributes.push([
              'cmsfilter',
              function(filterInstances) {
                if (filterInstances && filterInstances.length > 0) {
                  var filterInstance = filterInstances[0];
                  
                  if (typeof filterInstance.resetFilters === 'function' && typeof filterInstance.applyFilters === 'function') {
                    // Reset all filters first
                    filterInstance.resetFilters().then(function() {
                      
                      // Apply Finsweet category filter (parent categories only)
                      if (categoryValue && categoryValue !== '') {
                        var categoryFilterData = filterInstance.filtersData.find(function(filterData) {
                          return filterData.filterKeys && filterData.filterKeys.includes(CONFIG.FINSWEET_FILTER_FIELD);
                        });
                        
                        if (categoryFilterData) {
                          categoryFilterData.values.add(categoryValue);
                          Utils.log('✓ Finsweet category filter set:', categoryValue);
                          return filterInstance.applyFilters();
                        } else {
                          Utils.log('✗ Finsweet category filter not found');
                          return Promise.resolve();
                        }
                      } else {
                        // No category filter needed
                        return Promise.resolve();
                      }
                      
                    }).then(function() {
                      // Step 2: Apply custom subcategory filtering on Finsweet-filtered results
                      setTimeout(function() {
                        CategoryFilter.applyCustomSubcategoryFilter(subcategoryValue);
                      }, 50);
                      
                    }).catch(function(error) {
                      Utils.error('Finsweet filter error:', error);
                    });
                    
                    return;
                  }
                }
                
                // Fallback: if Finsweet not available, use direct DOM filtering
                Utils.log('FALLBACK: Finsweet API not available, using direct DOM filtering');
                CategoryFilter.applyDirectDOMFiltering(categoryValue, subcategoryValue);
              }
            ]);
          } catch (error) {
            Utils.error('Error accessing Finsweet API:', error);
            CategoryFilter.applyDirectDOMFiltering(categoryValue, subcategoryValue);
          }
          return;
        }
        
        // Fallback if no Finsweet
        Utils.log('No Finsweet CMS Filter found, using direct DOM filtering');
        CategoryFilter.applyDirectDOMFiltering(categoryValue, subcategoryValue);
        
      } catch (e) {
        Utils.error('Error applying hybrid filter', e);
      }
    },
    
    applyCustomSubcategoryFilter: function(subcategoryValue) {
      try {
        Utils.log('CUSTOM SUBCATEGORY FILTER:', subcategoryValue);
        
        // Get all template items (already filtered by Finsweet for parent category)
        var allItems = document.querySelectorAll(CONFIG.ITEMS_SELECTOR);
        var visibleCount = 0;
        
        Utils.log('Found', allItems.length, 'items to subcategory filter');
        Utils.log('Using subcategory selector:', CONFIG.SUBCATEGORY_FIELD_SELECTOR);
        
        if (!subcategoryValue || subcategoryValue === '') {
          // No subcategory filter - show all items that passed Finsweet filtering
          for (var i = 0; i < allItems.length; i++) {
            var item = allItems[i];
            // Only show items that are currently visible from Finsweet filtering
            if (item.style.display !== 'none') {
              visibleCount++;
            }
          }
          Utils.log('SUBCATEGORY RESULT: Showing all Finsweet-filtered items (' + visibleCount + ' visible)');
          return;
        }
        
        // Apply subcategory filtering
        for (var i = 0; i < allItems.length; i++) {
          var item = allItems[i];
          
          // Skip items already hidden by Finsweet
          if (item.style.display === 'none') {
            continue;
          }
          
          // Check if item has matching subcategory
          var subcategoryElements = item.querySelectorAll(CONFIG.SUBCATEGORY_FIELD_SELECTOR);
          var hasMatchingSubcategory = false;
          
          if (i === 0) {
            Utils.log('First item subcategory elements found:', subcategoryElements.length);
            Utils.log('First item HTML preview:', item.innerHTML.substring(0, 500) + '...');
            
            // Check if CustomNest target exists
            var nestTarget = item.querySelector('[fs-cmsnest-element="nest-target"]');
            Utils.log('CustomNest target found:', !!nestTarget);
            
            if (subcategoryElements.length > 0) {
              Utils.log('First subcategory element:', subcategoryElements[0]);
              Utils.log('First subcategory value:', subcategoryElements[0].getAttribute('data-subcategory'));
            } else {
              Utils.log('No subcategory elements found - checking all data attributes');
              var allDataElements = item.querySelectorAll('[data-*]');
              Utils.log('All elements with data attributes:', allDataElements.length);
            }
          }
          
          for (var j = 0; j < subcategoryElements.length; j++) {
            var subcatEl = subcategoryElements[j];
            var subcatValue = subcatEl.getAttribute('data-subcategory') || subcatEl.textContent.trim();
            
            if (subcatValue === subcategoryValue) {
              hasMatchingSubcategory = true;
              break;
            }
          }
          
          if (hasMatchingSubcategory) {
            // Keep item visible (it already passed Finsweet filtering)
            visibleCount++;
          } else {
            // Hide item (doesn't match subcategory)
            item.style.display = 'none';
          }
        }
        
        Utils.log('SUBCATEGORY RESULT:', visibleCount, 'items visible after subcategory filtering');
        
      } catch (e) {
        Utils.error('Error in custom subcategory filtering', e);
      }
    },

    applyDirectDOMFiltering: function(categoryValue, subcategoryValue) {
      try {
        Utils.log('Applying direct DOM filtering for category:', categoryValue);
        
        // Store current filter for infinite scroll
        State.currentDOMFilter = categoryValue;
        
        // Find all template items
        var allItems = document.querySelectorAll(CONFIG.ITEMS_SELECTOR);
        Utils.log('Found template items:', allItems.length);
        
        if (allItems.length === 0) {
          Utils.log('No template items found for filtering');
          
          // Set up observer for infinite scroll if items will load later
          if (CONFIG.HAS_INFINITE_SCROLL) {
            CategoryFilter.setupInfiniteScrollObserver();
          }
          return;
        }
        
        var visibleCount = 0;
        var totalCount = allItems.length;
        
        // Show/hide items based on category
        for (var i = 0; i < allItems.length; i++) {
          var item = allItems[i];
          var categoryEl = item.querySelector(CONFIG.CATEGORY_FIELD_SELECTOR);
          
          if (categoryEl) {
            var itemCategory = Utils.sanitizeText(categoryEl.textContent);
            var shouldShow = false;
            
            if (!categoryValue || categoryValue === '') {
              // Show all items for "All Categories"
              shouldShow = true;
            } else {
              // Show only items that match the selected category
              shouldShow = (itemCategory === categoryValue);
            }
            
            if (shouldShow) {
              item.style.display = '';
              item.style.opacity = '1';
              item.setAttribute('data-category-visible', 'true');
              visibleCount++;
            } else {
              item.style.display = 'none';
              item.style.opacity = '0';
              item.setAttribute('data-category-visible', 'false');
            }
          } else {
            // If no category element found, show by default
            item.style.display = '';
            item.style.opacity = '1';
            item.setAttribute('data-category-visible', 'true');
            visibleCount++;
          }
        }
        
        Utils.log('Direct DOM filtering applied:', visibleCount + '/' + totalCount + ' items visible');
        Analytics.trackFilter(categoryValue, visibleCount, totalCount);
        
        // Set up observer for new items in infinite scroll
        if (CONFIG.HAS_INFINITE_SCROLL) {
          CategoryFilter.setupInfiniteScrollObserver();
        }
        
        // Trigger any layout updates
        var customEvent = new CustomEvent('itemsFiltered', {
          detail: {
            category: categoryValue,
            visibleCount: visibleCount,
            totalCount: totalCount
          }
        });
        document.dispatchEvent(customEvent);
        
      } catch (e) {
        Utils.error('Error in direct DOM filtering', e);
      }
    },

    setupInfiniteScrollObserver: function() {
      // No longer needed - Webflow Collection List handles attributes automatically
      Utils.log('Skipping infinite scroll observer - Webflow Collection List handles new items automatically');
    },



    // Set initial filter state from URL parameters
    setInitialFilterFromUrl: function() {
      try {
        var urlCategoryParam = Utils.getUrlParameter(CONFIG.URL_PARAM_NAME);
        var urlSubcategoryParam = Utils.getUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME);
        
        if (urlCategoryParam) {
          var categoryName = Utils.normalizeUrlParam(urlCategoryParam);
          Utils.log('Setting initial filter from URL: ' + categoryName + ' (from param: ' + urlCategoryParam + ')');
          
          // Check if this category has subcategories and if we need subcategory mode
          var subcategories = SubcategoryManager.getSubcategoriesForParent(categoryName);
          Utils.log('URL filter - subcategories for ' + categoryName + ':', subcategories);
          
          if (urlSubcategoryParam && subcategories && subcategories.length > 0) {
            // Both category and subcategory in URL - switch to subcategory mode
            var subcategoryName = Utils.normalizeUrlParam(urlSubcategoryParam);
            Utils.log('Setting subcategory mode from URL - Parent:', categoryName, 'Sub:', subcategoryName);
            CategoryFilter.switchToSubcategoryMode(categoryName, subcategories);
            
            // After interface is built, apply combo filter
            setTimeout(function() {
              CategoryFilter.applyHybridFilter(categoryName, subcategoryName);
              State.selectedSubcategory = subcategoryName;
              
              // Find and activate the subcategory link
              var subcategoryLinks = document.querySelectorAll('[data-subcategory]');
              for (var j = 0; j < subcategoryLinks.length; j++) {
                var subLink = subcategoryLinks[j];
                if (subLink.getAttribute('data-subcategory') === subcategoryName) {
                  subLink.classList.add('category-filter-active');
                  break;
                }
              }
            }, 100);
          } else if (subcategories && subcategories.length > 0) {
            // Category with subcategories but no subcategory in URL - switch to subcategory mode
            Utils.log('Setting subcategory mode from URL - Parent only:', categoryName);
            CategoryFilter.switchToSubcategoryMode(categoryName, subcategories);
          } else {
            // Regular category without subcategories
            Utils.log('Setting regular category from URL:', categoryName);
            var categoryLinks = document.querySelectorAll('[data-filter-value]');
            var found = false;
            for (var i = 0; i < categoryLinks.length; i++) {
              var link = categoryLinks[i];
              var linkCategory = link.getAttribute('data-filter-value');
              Utils.log('Comparing URL category "' + categoryName + '" with link "' + linkCategory + '"');
              if (linkCategory === categoryName) {
                this.setActiveCategory(link);
                this.applyFinsweetFilter(categoryName, '');
                found = true;
                break;
              }
            }
            
            if (!found) {
              Utils.error('Could not find matching category link for: ' + categoryName);
              Utils.log('Available category links:', Array.from(categoryLinks).map(function(l) { 
                return l.getAttribute('data-filter-value'); 
              }));
            }
          }
        } else {
          // No category in URL, ensure "All Categories" is active
          Utils.log('No URL parameters - setting All Categories as active');
          var allCategoriesLink = document.querySelector('[data-filter-value=""]');
          if (allCategoriesLink) {
            this.setActiveCategory(allCategoriesLink);
          }
        }
      } catch (e) {
        Utils.error('Error setting initial filter from URL', e);
      }
    },
    
    waitForDependencies: function() {
      var attempts = 0;
      var maxAttempts = 30;
      
      function check() {
        attempts++;
        
        var swiperContainer = document.querySelector(CONFIG.SWIPER_CONTAINER_SELECTOR);
        var swiperWrapper = swiperContainer && swiperContainer.querySelector(CONFIG.SWIPER_WRAPPER_SELECTOR);
        var hasExistingSlide = swiperWrapper && swiperWrapper.querySelector('.swiper-slide');
        
        if ((swiperContainer && swiperWrapper && hasExistingSlide) || attempts >= maxAttempts) {
          setTimeout(CategoryFilter.init, 100);
        } else {
          setTimeout(check, 100);
        }
      }
      
      check();
    },

    ensureCategoryAttributes: function() {
      // No longer needed - attributes are already set in Webflow Collection List
      Utils.log('Skipping attribute setup - using Webflow Collection List with pre-configured attributes');
    },

    checkScriptCompatibility: function() {
      // Simplified compatibility check
      var hasCMSFilter = window.fsAttributes && window.fsAttributes.cmsfilter;
      Utils.log('Finsweet CMS Filter available:', !!hasCMSFilter);
    }
  };
  
  // Public API
  window.CategoryFilter = {
    version: '1.0.0',
    debug: function(enabled) {
      CONFIG.DEBUG = enabled;
      Utils.log('Debug mode', enabled ? 'enabled' : 'disabled');
    },
    analytics: function(enabled) {
      CONFIG.ENABLE_ANALYTICS = enabled;
      Utils.log('Analytics', enabled ? 'enabled' : 'disabled');
    },
    getState: function() {
      return {
        initialized: State.isInitialized,
        categories: State.categories.length,
        selected: State.selectedCategory,
        analytics: CONFIG.ENABLE_ANALYTICS,
        debug: CONFIG.DEBUG
      };
    },
    getAnalytics: function() {
      return {
        sessionId: Analytics.sessionId,
        startTime: Analytics.startTime,
        pendingEvents: Analytics.events.length,
        uptime: Date.now() - Analytics.startTime
      };
    },
    refresh: function() {
      State.isInitialized = false;
      CategoryFilter.init();
    }
  };
  
  // Handle browser back/forward navigation
  window.addEventListener('popstate', function(event) {
    if (State.isInitialized) {
      Utils.log('Browser navigation detected, updating filter state');
      CategoryFilter.setInitialFilterFromUrl();
    }
  });

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', CategoryFilter.waitForDependencies);
  } else {
    CategoryFilter.waitForDependencies();
  }
  
})();
