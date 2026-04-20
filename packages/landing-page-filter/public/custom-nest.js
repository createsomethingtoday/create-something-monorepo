/**
 * Custom CMS Nest Script for Webflow
 * Handles proxy URLs with /templates prefix
 * Built for landing page category filter integration
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    attributes: {
      collection: 'fs-cmsnest-collection',
      element: 'fs-cmsnest-element',
      cmsfilterField: 'fs-cmsfilter-field',
      empty: 'fs-cmsnest-empty',
      cache: 'fs-cmsnest-cache'
    },
    elementTypes: {
      nestSource: 'nest-source',
      nestTarget: 'nest-target',
      slugs: 'slugs'
    },
    selectors: {
      dynList: '.w-dyn-list',
      dynItems: '.w-dyn-items', 
      dynItem: '.w-dyn-item',
      dynEmpty: '.w-dyn-empty'
    },
    urlProxy: '/templates',
    cache: new Map(),
    indexedDBCache: null,
    debug: true  // Enable debug mode to diagnose nesting issues
  };

  // Utility functions
  const log = (...args) => CONFIG.debug && console.log('[CustomNest]', ...args);
  
  const normalizeUrl = (url) => {
    if (!url) return null;
    try {
      let pathname = new URL(url, window.location.origin).pathname;
      // Keep the full path including /templates for proxy requests
      // The template proxy expects paths like /templates/html/template-name
      return pathname;
    } catch {
      return null;
    }
  };

  const extractSlug = (url) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return null;
    const segments = normalized.split('/').filter(s => s);
    return segments[segments.length - 1] || null;
  };

  // IndexedDB Cache Manager
  class CacheManager {
    constructor() {
      this.dbName = 'customNestCache';
      this.storeName = 'pages';
      this.version = 1;
      this.memoryCache = new Map();
    }

    async initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async get(url) {
      // Check memory cache first
      if (this.memoryCache.has(url)) {
        return this.memoryCache.get(url);
      }

      // Check IndexedDB
      try {
        const db = await this.initDB();
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(url);
        
        return new Promise((resolve) => {
          request.onsuccess = () => {
            const result = request.result;
            if (result) {
              this.memoryCache.set(url, result);
            }
            resolve(result);
          };
          request.onerror = () => resolve(null);
        });
      } catch {
        return null;
      }
    }

    async set(url, content) {
      // Set in memory cache
      this.memoryCache.set(url, content);

      // Set in IndexedDB
      try {
        const db = await this.initDB();
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.put(content, url);
      } catch (e) {
        log('Cache write error:', e);
      }
    }
  }

  // Page fetcher with caching
  const fetchPage = async (url, useCache = true) => {
    if (!CONFIG.indexedDBCache) {
      CONFIG.indexedDBCache = new CacheManager();
    }

    // Check cache first
    if (useCache) {
      const cached = await CONFIG.indexedDBCache.get(url);
      if (cached) {
        log(`Loaded from cache: ${url}`);
        return cached;
      }
    }

    try {
      log(`Fetching: ${url}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const content = await response.text();
      
      // Cache the result
      if (useCache) {
        await CONFIG.indexedDBCache.set(url, content);
      }
      
      return content;
    } catch (e) {
      log(`Failed to fetch ${url}:`, e);
      return null;
    }
  };

  // Collection manager
  class CollectionManager {
    constructor() {
      this.collections = new Map();
      this.init();
    }

    async init() {
      this.findCollections();
      this.hideSubcategoriesCollection(); // Hide subcategories immediately since we use API
      await this.processTargets();
      this.hideSourceCollections();
    }

    findCollections() {
      // Find nest source elements
      const sourceElements = document.querySelectorAll(
        `[${CONFIG.attributes.collection}][${CONFIG.attributes.element}="${CONFIG.elementTypes.nestSource}"]`
      );
      
      sourceElements.forEach(element => {
        const name = element.getAttribute(CONFIG.attributes.collection);
        const wrapper = element.closest(CONFIG.selectors.dynList);
        const items = this.extractItems(element);
        
        this.collections.set(name, { element, wrapper, items });
        log(`Found collection "${name}" with ${items.length} items`);
      });
    }

    extractItems(collection) {
      const items = [];
      const itemElements = collection.querySelectorAll(CONFIG.selectors.dynItem);
      
      itemElements.forEach(item => {
        // Look for subcategory field within the item (support both old and new formats)
        let subcategoryField = item.querySelector(`[${CONFIG.attributes.cmsfilterField}="subcategory"]`);
        if (!subcategoryField) {
          subcategoryField = item.querySelector('[data-subcategory]');
        }
        
        if (subcategoryField) {
          const subcategoryName = subcategoryField.textContent.trim();
          const slug = this.convertToSlug(subcategoryName);
          
          items.push({
            element: item.cloneNode(true),
            subcategory: subcategoryName,
            slug: slug
          });
        }
      });
      
      return items;
    }
    
    convertToSlug(text) {
      return text
        .toLowerCase()
        .replace(/[&]/g, 'and')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    async processTargets() {
      // Find nest target elements
      const targets = document.querySelectorAll(
        `[${CONFIG.attributes.collection}][${CONFIG.attributes.element}="${CONFIG.elementTypes.nestTarget}"]`
      );
      
      // Process targets in parallel
      await Promise.all(Array.from(targets).map(target => {
        const collectionName = target.getAttribute(CONFIG.attributes.collection);
        return this.nestIntoTarget(target, collectionName);
      }));
    }

    async nestIntoTarget(target, collectionName) {
      let collection = this.collections.get(collectionName);
      
      // For subcategories, always use API data to get complete dataset
      if (collectionName === 'subcategories') {
        log(`Loading subcategories from API (bypassing local collection limitations)...`);
        const apiCollection = await this.fetchSubcategoriesFromAPI();
        if (apiCollection) {
          collection = apiCollection;
          this.collections.set(collectionName, collection);
          log(`Using API data: ${collection.items.length} subcategories available`);
        } else if (!collection) {
          log(`API failed and no local collection found for "subcategories"`);
        }
      }
      
      if (!collection) {
        log(`Collection "${collectionName}" not found`);
        return;
      }

      // Find the template item that contains this target
      const templateItem = target.closest(CONFIG.selectors.dynItem);
      if (!templateItem) {
        log('Target not inside a dynamic item');
        return;
      }

      // Check for manual slug-based filtering
      const slugsElement = templateItem.querySelector(`[${CONFIG.attributes.element}="${CONFIG.elementTypes.slugs}"][${CONFIG.attributes.collection}="${collectionName}"]`);
      
      let itemsToNest = [];
      
      if (slugsElement) {
        // Manual slug-based filtering
        const slugsText = slugsElement.textContent.trim();
        const slugs = this.parseSlugsList(slugsText);
        itemsToNest = this.filterItemsBySlugs(collection.items, slugs);
        log(`Filtered ${itemsToNest.length} items by slugs for "${collectionName}": ${slugs.join(', ')}`);
      } else {
        // Try external page fetching
        const templateLink = templateItem.querySelector('a[href]');
        if (templateLink) {
          const templateUrl = normalizeUrl(templateLink.getAttribute('href'));
          if (templateUrl) {
            itemsToNest = await this.fetchAndFilterItems(templateUrl, collection, collectionName);
          }
        }
        
        // Fallback to all items - BUT ONLY if external fetching completely failed
        if (itemsToNest.length === 0) {
          log(`⚠️ No template-specific items found for "${collectionName}"`);
          log(`   - Template URL: ${templateUrl}`);
          log(`   - External fetch attempted: ${!!templateLink}`);
          log(`   - Collection total items: ${collection.items.length}`);
          
          // IMPORTANT: Do NOT fallback to all items - this causes the "all subcategories" issue
          // Instead, log the problem and let the template have no subcategories
          log(`🚫 NOT falling back to all items to avoid subcategory overload`);
          log(`   - This template will have no injected subcategories`);
          itemsToNest = []; // Keep it empty rather than inject everything
        }
      }
      
      this.insertItemsIntoTarget(target, itemsToNest, collectionName);
      
      log(`Nested ${itemsToNest.length} items into target for "${collectionName}"`);
    }

    parseSlugsList(text) {
      return text
        .split(',')
        .map(slug => slug.trim())
        .filter(slug => slug.length > 0);
    }

    filterItemsBySlugs(items, slugs) {
      return items.filter(item => 
        item.slug && slugs.includes(item.slug)
      );
    }

    async fetchAndFilterItems(templateUrl, collection, collectionName) {
      const proxyUrl = `https://landing-page-filter.pages.dev/api/template-proxy?path=${encodeURIComponent(templateUrl)}`;
      
      try {
        log(`🔍 Fetching template page for nesting: ${templateUrl}`);
        
        // Check if caching is disabled for this collection
        const cacheDisabled = document.querySelector(`[${CONFIG.attributes.cache}="false"][${CONFIG.attributes.collection}="${collectionName}"]`);
        const useCache = !cacheDisabled;
        
        // Fetch template page via proxy to get subcategory references
        log(`📥 Fetching page content via proxy: ${templateUrl}`);
        const pageContent = await fetchPage(proxyUrl, useCache);
        if (!pageContent) {
          log(`❌ Failed to fetch page content for: ${templateUrl}`);
          return [];
        }
        log(`✅ Successfully fetched page content for: ${templateUrl}`);  

        // Parse the fetched page
        const parser = new DOMParser();
        const doc = parser.parseFromString(pageContent, 'text/html');
        
        // Look for the actual subcategory structure on template pages
        // Template pages have: <div id="subcategory"> with .tag-list_link elements
        const subcategorySection = doc.querySelector('#subcategory');
        
        if (subcategorySection) {
          log(`Found subcategory section on template page: ${templateUrl}`);
          
          // Extract subcategory names from the tag links
          const subcategoryLinks = subcategorySection.querySelectorAll('a.tag-list_link');
          const templateSubcategories = Array.from(subcategoryLinks)
            .map(link => {
              // Decode HTML entities like &amp; to &
              const decoded = link.textContent.trim();
              return decoded.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
            })
            .filter(text => text);
          
          log(`Template subcategories found for ${templateUrl}: ${templateSubcategories.join(', ')}`);
          
          // Debug: show exact strings with character codes
          templateSubcategories.forEach((subcat, i) => {
            log(`Template[${i}]: "${subcat}" (chars: ${Array.from(subcat).map(c => c.charCodeAt(0)).join(',')})`)
          });
          
          // Debug: log all available local items with character codes
          log(`Available local collection items: ${collection.items.map(item => item.subcategory).join(', ')}`);
          collection.items.slice(0, 10).forEach((item, i) => {
            log(`API[${i}]: "${item.subcategory}" (chars: ${Array.from(item.subcategory).map(c => c.charCodeAt(0)).join(',')})`)
          });
          
          // Debug: basic info
          log(`Collection has ${collection.items.length} items, template has ${templateSubcategories.length} subcategories`);
          
          // Debug: detailed comparison logging
          log(`Detailed matching for ${templateUrl}:`);
          templateSubcategories.forEach(templateSubcat => {
            log(`  Template: "${templateSubcat}" (length: ${templateSubcat.length})`);
            const matches = collection.items.filter(localItem => {
              const nameMatch = localItem.subcategory === templateSubcat;
              const slugMatch = localItem.slug === this.convertToSlug(templateSubcat);
              if (nameMatch || slugMatch) {
                log(`    ✓ Match found: "${localItem.subcategory}"`);
              }
              return nameMatch || slugMatch;
            });
            if (matches.length === 0) {
              log(`    ✗ No match for "${templateSubcat}"`);
              // Show potential matches
              const closeMatches = collection.items.filter(localItem => 
                localItem.subcategory.toLowerCase().includes(templateSubcat.toLowerCase()) ||
                templateSubcat.toLowerCase().includes(localItem.subcategory.toLowerCase())
              );
              if (closeMatches.length > 0) {
                log(`    Potential matches: ${closeMatches.map(item => `"${item.subcategory}"`).join(', ')}`);
              }
            }
          });
          
          // Match with local collection items by name (with normalization)
          const matchedItems = collection.items.filter(localItem => {
            const hasMatch = templateSubcategories.some(templateSubcat => {
              // Normalize both strings for comparison
              const normalizedLocal = localItem.subcategory.trim().replace(/\s+/g, ' ');
              const normalizedTemplate = templateSubcat.trim().replace(/\s+/g, ' ');
              
              const exactMatch = normalizedLocal === normalizedTemplate;
              const caseInsensitiveMatch = normalizedLocal.toLowerCase() === normalizedTemplate.toLowerCase();
              const slugMatch = localItem.slug === this.convertToSlug(templateSubcat);
              
              if (exactMatch || caseInsensitiveMatch || slugMatch) {
                log(`    ✅ MATCH FOUND: "${templateSubcat}" -> "${localItem.subcategory}"`);
                log(`       - Exact: ${exactMatch}, Case-insensitive: ${caseInsensitiveMatch}, Slug: ${slugMatch}`);
                return true;
              }
              
              return false;
            });
            return hasMatch;
          });
          
          log(`Matched ${matchedItems.length} items from template subcategory reference for ${templateUrl}`);
          if (matchedItems.length > 0) {
            log(`Matched items: ${matchedItems.map(item => item.subcategory).join(', ')}`);
          }
          return matchedItems;
        } else {
          log(`No subcategory section (#subcategory) found on template page: ${templateUrl}`);
          
          // Check if we can find any other subcategory indicators
          const alternativeElements = doc.querySelectorAll('[class*="subcategor"], [id*="subcategor"], [data-*="subcategor"]');
          if (alternativeElements.length > 0) {
            log(`Found ${alternativeElements.length} alternative subcategory elements:`, 
                Array.from(alternativeElements).map(el => el.tagName + '.' + el.className).join(', '));
          }
        }
        
        // Fallback to looking for nested collection (old approach) - likely not needed anymore
        const templateCollection = doc.querySelector(
          `[${CONFIG.attributes.collection}="${collectionName}"][${CONFIG.attributes.element}="${CONFIG.elementTypes.nestSource}"]`
        );
        
        if (templateCollection) {
          log(`Using fallback: found nested collection on template page`);
          
          // Extract items from template page
          const templateItems = this.extractItems(templateCollection);
          
          // Match with local collection items by slug
          const matchedItems = collection.items.filter(localItem =>
            templateItems.some(templateItem => 
              localItem.slug === templateItem.slug
            )
          );
          
          log(`Matched ${matchedItems.length} items from external page (fallback)`);
          return matchedItems;
        }
        
        log(`❌ No subcategory data found on template page: ${templateUrl}`);
        return [];
        
      } catch (e) {
        log(`🚨 Error fetching/parsing template page ${templateUrl}:`, e.message || e);
        log(`   - Proxy URL attempted: ${proxyUrl}`);
        log(`   - Collection: ${collectionName}`);
        return [];
      }
    }


    filterItemsByCategory(items, categoryName) {
      // For demonstration, return all items
      // In a real implementation, you'd filter based on category relationships
      return items;
    }

    insertItemsIntoTarget(target, items, collectionName) {
      // Clear target
      target.innerHTML = '';

      // Handle empty state
      if (items.length === 0) {
        this.insertEmptyState(target, collectionName);
        return;
      }

      // Create nested list structure that matches Webflow CMS structure
      const wrapper = document.createElement('div');
      wrapper.className = 'w-dyn-list';
      wrapper.style.display = '';
      
      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'w-dyn-items';
      itemsContainer.setAttribute('role', 'list');
      
      // Add items with proper structure
      items.forEach(item => {
        const clonedItem = item.element.cloneNode(true);
        clonedItem.setAttribute('role', 'listitem');
        clonedItem.className = clonedItem.className || 'w-dyn-item';
        itemsContainer.appendChild(clonedItem);
      });
      
      wrapper.appendChild(itemsContainer);
      target.appendChild(wrapper);
      
      log(`Inserted ${items.length} items into target`);
    }

    insertEmptyState(target, collectionName) {
      // Look for empty state element
      const emptyElement = document.querySelector(`[${CONFIG.attributes.empty}^="${collectionName}"]`);
      if (emptyElement) {
        const clone = emptyElement.cloneNode(true);
        clone.style.display = 'block';
        target.appendChild(clone);
        log(`Inserted empty state for "${collectionName}"`);
      } else {
        log(`No items to nest for collection "${collectionName}" and no empty state found`);
      }
    }

    async fetchSubcategoriesFromAPI() {
      try {
        log('Fetching subcategories from API...');
        const response = await fetch('https://landing-page-filter.pages.dev/api/subcategories');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.subcategories || !Array.isArray(data.subcategories)) {
          throw new Error('Invalid API response format');
        }
        
        log(`API returned ${data.subcategories.length} subcategories (source: ${data.source})`);
        
        // Convert API data to collection format
        const items = data.subcategories.map(subcat => ({
          element: this.createSubcategoryElement(subcat.name),
          subcategory: subcat.name,
          slug: subcat.slug
        }));
        
        return {
          element: null,
          wrapper: null,
          items: items
        };
        
      } catch (error) {
        log('Failed to fetch subcategories from API:', error);
        return null;
      }
    }
    
    createSubcategoryElement(name) {
      // Create a dummy element structure that matches expected format
      const item = document.createElement('div');
      item.className = 'w-dyn-item';
      
      const field = document.createElement('div');
      // Use data-subcategory for hybrid filtering approach (no Finsweet conflicts)
      field.setAttribute('data-subcategory', name);
      field.textContent = name;
      
      item.appendChild(field);
      return item;
    }

    hideSubcategoriesCollection() {
      // Always hide subcategories source collection since we use API data
      const subcategoriesElements = document.querySelectorAll(
        `[${CONFIG.attributes.collection}="subcategories"][${CONFIG.attributes.element}="${CONFIG.elementTypes.nestSource}"]`
      );
      
      subcategoriesElements.forEach(element => {
        const wrapper = element.closest(CONFIG.selectors.dynList);
        if (wrapper) {
          wrapper.style.display = 'none';
          log('Hidden subcategories source collection');
        }
      });
    }

    hideSourceCollections() {
      this.collections.forEach(({ wrapper }) => {
        if (wrapper) {
          wrapper.style.display = 'none';
        }
      });
    }
  }

  // API
  window.CustomNest = {
    manager: null,
    
    async init() {
      this.manager = new CollectionManager();
      await this.manager.init();
      return this.manager;
    },
    
    async refresh() {
      if (this.manager) {
        await this.manager.init();
      }
    },
    
    async refreshTargets() {
      if (this.manager) {
        log('Refreshing CustomNest targets...');
        await this.manager.processTargets();
        log('CustomNest targets refresh complete');
      }
    },
    
    // Listen for category filter changes and re-inject subcategories
    setupCategoryFilterSync() {
      // Listen for category filter updates
      document.addEventListener('categoryFilterUpdated', async (event) => {
        log('🔄 Category filter updated, refreshing CustomNest subcategories');
        // Small delay to let Finsweet finish its DOM updates
        setTimeout(async () => {
          await this.refreshTargets();
        }, 200);
      });
      
      // Listen for Finsweet filter events
      if (window.fsAttributes && window.fsAttributes.cmsfilter) {
        window.fsAttributes.cmsfilter.on('renderitems', async () => {
          log('🔄 Finsweet render complete, refreshing CustomNest subcategories');
          setTimeout(async () => {
            await this.refreshTargets();
          }, 100);
        });
      }
    },
    
    debug(enabled = true) {
      CONFIG.debug = enabled;
      log('Debug mode', enabled ? 'enabled' : 'disabled');
    },
    
    getCollections() {
      return this.manager ? Array.from(this.manager.collections.keys()) : [];
    },

    clearCache() {
      if (CONFIG.indexedDBCache) {
        CONFIG.indexedDBCache.memoryCache.clear();
        log('Memory cache cleared');
      }
    }
  };

  // Auto-initialize
  const initialize = async () => {
    log('Initializing Custom Nest - Debug Mode Enabled');
    
    try {
      await window.CustomNest.init();
      
      // Dispatch completion event
      window.dispatchEvent(new CustomEvent('customNestComplete', {
        detail: {
          collections: window.CustomNest.getCollections(),
          version: '2.0.0',
          features: ['external-fetching', 'slug-filtering', 'indexeddb-cache', 'empty-states']
        }
      }));
      
      // CustomNest data injection complete - no Finsweet reinitialization needed
      // since category-filter.js handles all Finsweet interactions
      log('CustomNest data injection complete - subcategories ready for filtering');
      
      log('Custom Nest initialization complete - Collections found:', window.CustomNest.getCollections());
      
    } catch (error) {
      log('Custom Nest initialization failed:', error);
      
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('customNestError', {
        detail: { error: error.message }
      }));
    }
  };

  // Enhanced initialization with Finsweet synchronization
  const initializeWithSync = async () => {
    // Wait for Finsweet to be available
    let finsweetReady = false;
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (!finsweetReady && attempts < maxAttempts) {
      if (window.fsAttributes && window.fsAttributes.cmsfilter) {
        finsweetReady = true;
        log('✅ Finsweet CMS Filter detected, proceeding with CustomNest initialization');
        break;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!finsweetReady) {
      log('⚠️ Finsweet not detected after 5 seconds, proceeding anyway');
    }
    
    // Initialize CustomNest
    await initialize();
    
    // Setup synchronization with CategoryFilter
    if (window.CustomNest) {
      window.CustomNest.setupCategoryFilterSync();
    }
    
    // Additional delay for Finsweet to complete its initial filtering
    setTimeout(() => {
      log('🔄 Refreshing CustomNest targets after Finsweet stabilization');
      if (window.CustomNest && window.CustomNest.refreshTargets) {
        window.CustomNest.refreshTargets();
      }
    }, 1000);
  };

  // Wait for DOM and then synchronize with Finsweet
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWithSync);
  } else {
    initializeWithSync();
  }

})();