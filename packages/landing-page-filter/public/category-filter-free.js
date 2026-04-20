/**
 * Free Templates Category Filter
 * 
 * Based on Ultra-Simplified Category Filter v2.0
 * Modified for Free Templates with pricing=free URL parameters
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
    API_URL: 'https://landing-page-filter.pages.dev/api/categories?hierarchical=true&type=free',
    SWIPER_CONTAINER: '#subcategory-list',
    ITEMS_SELECTOR: '.tm-templates_grid_item',
    URL_PARAM_NAME: 'category',
    SUBCATEGORY_URL_PARAM_NAME: 'subcategory',
    HEADING_SELECTOR: 'h1.h3',
    EMPTY_STATE_SELECTOR: '.search-empty-wrap',
    BREADCRUMB_CONTAINER: '.mp-breadcrumbs',
    DEBUG: true
  };
  
  // === STATE ===
  var currentParent = null;
  var currentSubcategory = null;
  var categoriesData = null;
  var originalHeadingText = '';
  
  // === UTILITIES ===
  function log(message, data) {
    if (CONFIG.DEBUG) console.log('[FreeCategoryFilter-v2.0]', message, data || '');
  }
  
  function error(message, err) {
    console.error('[FreeCategoryFilter]', message, err || '');
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
  
  function formatUrlValue(value) {
    if (!value) return '';
    return value.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-')
      .replace(/^\-|\-$/g, '');
  }
  
  function findCategoryByUrlParam(urlParam, type) {
    if (!urlParam || !categoriesData) return null;
    
    // Try multiple matching strategies
    for (var i = 0; i < categoriesData.length; i++) {
      var category = categoriesData[i];
      
      // Strategy 1: Exact match with formatted URL parameter
      if (formatUrlValue(category.name) === urlParam) {
        return category.name;
      }
      
      // Strategy 2: Direct name match (for URLs like "Architecture & Design")
      if (category.name === urlParam) {
        return category.name;
      }
      
      // Strategy 3: Case-insensitive match
      if (category.name.toLowerCase() === urlParam.toLowerCase()) {
        return category.name;
      }
      
      // Check subcategories if looking for subcategory
      if (type === 'subcategory' && category.children) {
        for (var j = 0; j < category.children.length; j++) {
          var subcategory = category.children[j];
          
          // Same strategies for subcategories
          if (formatUrlValue(subcategory.name) === urlParam) {
            return subcategory.name;
          }
          if (subcategory.name === urlParam) {
            return subcategory.name;
          }
          if (subcategory.name.toLowerCase() === urlParam.toLowerCase()) {
            return subcategory.name;
          }
        }
      }
    }
    
    return null;
  }
  
  function updateUrlParameter(name, value) {
    try {
      var url = new URL(window.location.href);
      if (value) {
        var formattedValue = formatUrlValue(value);
        url.searchParams.set(name, formattedValue);
        log('URL updated:', name + '=' + formattedValue);
      } else {
        url.searchParams.delete(name);
        log('URL parameter removed:', name);
      }
      
      window.history.replaceState({}, '', url.toString());
      log('New URL:', url.toString());
    } catch (e) {
      // Fallback for older browsers - don't update URL
      log('URL update not supported in this browser');
    }
  }
  
  // === HEADING MANAGEMENT ===
  function initializeHeading() {
    var headingEl = document.querySelector(CONFIG.HEADING_SELECTOR);
    if (headingEl && !originalHeadingText) {
      originalHeadingText = headingEl.textContent.trim();
      log('Original heading captured:', originalHeadingText);
    }
  }
  
  function updateHeading(categoryName, subcategoryName) {
    var headingEl = document.querySelector(CONFIG.HEADING_SELECTOR);
    if (!headingEl) return;
    
    var displayName = subcategoryName || categoryName;
    
    if (displayName) {
      headingEl.textContent = displayName + ' Free Templates';
      log('Updated heading for:', displayName);
    } else {
      // Reset to original text when no category is selected
      headingEl.textContent = originalHeadingText || 'Free Website Templates';
      log('Reset heading to original text');
    }
  }
  
  // === EMPTY STATE MANAGEMENT ===
  function showEmptyState() {
    var emptyStateEl = document.querySelector(CONFIG.EMPTY_STATE_SELECTOR);
    if (emptyStateEl) {
      emptyStateEl.style.display = 'block';
      log('Empty state shown');
    }
  }
  
  function hideEmptyState() {
    var emptyStateEl = document.querySelector(CONFIG.EMPTY_STATE_SELECTOR);
    if (emptyStateEl) {
      emptyStateEl.style.display = 'none';
      log('Empty state hidden');
    }
  }
  
  // === BREADCRUMB MANAGEMENT ===
  function createBreadcrumbSeparator() {
    var separator = document.createElement('div');
    separator.className = 'mp-breadcrumb-divider w-embed';
    separator.setAttribute('data-dynamic-breadcrumb', 'true'); // Mark as our element
    separator.innerHTML = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.75849 5.62486L4.82227 3.36593L5.67643 2.63379L8.2402 5.62486L5.67643 8.61593L4.82227 7.88379L6.75849 5.62486Z" fill="#757575"></path></svg>';
    return separator;
  }
  
  function createBreadcrumbLink(text, isActive, clickHandler) {
    var link = document.createElement('a');
    link.href = '#';
    link.setAttribute('data-dynamic-breadcrumb', 'true'); // Mark as our element
    link.className = isActive ? 'u-text-none' : 'u-text-blue u-text-none u-text-medium';
    link.textContent = text;
    
    if (clickHandler) {
      link.onclick = function(e) {
        e.preventDefault();
        clickHandler(text);
        return false;
      };
    }
    
    return link;
  }
  
  function updateFreeTemplatesLinkStyle() {
    var breadcrumbContainer = document.querySelector(CONFIG.BREADCRUMB_CONTAINER);
    if (!breadcrumbContainer) return;
    
    // Find the "Free Templates" link (should be the last static link)
    var staticLinks = breadcrumbContainer.querySelectorAll('a:not([data-dynamic-breadcrumb])');
    var freeTemplatesLink = staticLinks[staticLinks.length - 1];
    
    if (freeTemplatesLink && freeTemplatesLink.textContent.includes('Free')) {
      if (currentParent) {
        // Make "Free Templates" clickable when a parent is selected
        freeTemplatesLink.className = 'u-text-blue u-text-none u-text-medium';
        freeTemplatesLink.onclick = function(e) {
          e.preventDefault();
          log('Free Templates breadcrumb clicked - clearing all filters');
          handleReturnToFreeTemplates();
          return false;
        };
      } else {
        // Make "Free Templates" non-clickable when no parent is selected
        freeTemplatesLink.className = 'u-text-none';
        freeTemplatesLink.onclick = null;
      }
    }
  }
  
  function handleReturnToFreeTemplates() {
    log('Returning to Free Templates view');
    currentParent = null;
    currentSubcategory = null;
    updateUrlParameter(CONFIG.URL_PARAM_NAME, '');
    updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
    updateHeading(null, null);
    updateBreadcrumbs();
    hideEmptyState();
    clearAllFilters();
    buildParentInterface();
  }
  
  function handleParentBreadcrumbClick(parentName) {
    log('Parent breadcrumb clicked:', parentName);
    if (currentSubcategory) {
      // If subcategory is selected, go back to parent-only mode
      currentSubcategory = null;
      updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
      updateHeading(currentParent, null);
      updateBreadcrumbs();
      hideEmptyState();
      restoreParentFilter();
      // CRITICAL: Update active states to unlock buttons
      updateActiveStates();
    }
  }
  
  function removeDynamicBreadcrumbs() {
    var breadcrumbContainer = document.querySelector(CONFIG.BREADCRUMB_CONTAINER);
    if (!breadcrumbContainer) return;
    
    // Remove only elements we added (marked with data-dynamic-breadcrumb)
    var dynamicElements = breadcrumbContainer.querySelectorAll('[data-dynamic-breadcrumb]');
    for (var i = 0; i < dynamicElements.length; i++) {
      dynamicElements[i].remove();
    }
    
    log('Removed', dynamicElements.length, 'dynamic breadcrumb elements');
  }
  
  function updateBreadcrumbs() {
    var breadcrumbContainer = document.querySelector(CONFIG.BREADCRUMB_CONTAINER);
    if (!breadcrumbContainer) {
      log('Breadcrumb container not found');
      return;
    }
    
    // First, remove any existing dynamic breadcrumbs
    removeDynamicBreadcrumbs();
    
    // Update "Free Templates" link styling
    updateFreeTemplatesLinkStyle();
    
    // Add parent category if selected
    if (currentParent) {
      breadcrumbContainer.appendChild(createBreadcrumbSeparator());
      breadcrumbContainer.appendChild(createBreadcrumbLink(
        currentParent, 
        !currentSubcategory, // Active if no subcategory selected
        currentSubcategory ? handleParentBreadcrumbClick : null // Only clickable if subcategory is selected
      ));
    }
    
    // Add subcategory if selected
    if (currentSubcategory) {
      breadcrumbContainer.appendChild(createBreadcrumbSeparator());
      breadcrumbContainer.appendChild(createBreadcrumbLink(
        currentSubcategory, 
        true, // Always active when selected
        null  // Not clickable (current page)
      ));
    }
    
    log('Breadcrumbs updated:', {
      parent: currentParent,
      subcategory: currentSubcategory,
      freeTemplatesClickable: !!currentParent
    });
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
        // Hide empty state when parent filter is applied
        hideEmptyState();
        // Update heading for parent category
        updateHeading(categoryName, null);
        // Update breadcrumbs for parent category
        updateBreadcrumbs();
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
    
    // Check if CustomNest has completed
    var totalSubcatElements = document.querySelectorAll('[data-subcategory]').length;
    log('Total data-subcategory elements in page:', totalSubcatElements);
    
    if (totalSubcatElements === 0) {
      log('⚠️ No data-subcategory elements found! CustomNest may not have completed yet.');
      log('Waiting 1 second for CustomNest...');
      setTimeout(function() {
        filterBySubcategory(subcategoryName);
      }, 1000);
      return;
    }
    
    // CRITICAL FIX: Restore parent filter first to reset CMS Load state
    log('🔄 Restoring parent filter before applying subcategory:', currentParent);
    restoreParentFilterForSubcategory(subcategoryName);
  }
  
  function applySubcategoryFilterWithCMSLoad(subcategoryName) {
    log('Applying subcategory filter with CMS Load coordination');
    
    // Get both CMS Filter and CMS Load instances for proper coordination
    window.fsAttributes = window.fsAttributes || [];
    window.fsAttributes.push(['cmsfilter', function(filterInstances) {
      if (filterInstances && filterInstances.length > 0) {
        var filterInstance = filterInstances[0];
        log('CMS Filter instance found, coordinating subcategory filter');
        
        // Get the list instance from the filter
        var listInstance = filterInstance.listInstance;
        var items = listInstance.items;
        var visibleCount = 0;
        var itemsChecked = 0;
        var itemsSkipped = 0;
        
        log('Found', items.length, 'CMS items to filter');
        
        // Apply subcategory filtering by updating the valid property
        for (var i = 0; i < items.length; i++) {
          var cmsItem = items[i];
          var itemElement = cmsItem.element;
          
          // Skip items already marked as invalid by parent filter
          if (!cmsItem.valid) {
            itemsSkipped++;
            continue;
          }
          
          itemsChecked++;
          
          // Find subcategory element
          var subcatEl = itemElement.querySelector('[data-subcategory="' + subcategoryName + '"]');
          
          if (i < 3) {
            // Debug first 3 items
            log('Item', i + 1, 'checking for subcategory...');
            var allSubcatEls = itemElement.querySelectorAll('[data-subcategory]');
            log('Found', allSubcatEls.length, 'data-subcategory elements in this item');
            for (var j = 0; j < allSubcatEls.length; j++) {
              log('  data-subcategory="' + allSubcatEls[j].getAttribute('data-subcategory') + '"');
            }
            log('Looking for [data-subcategory="' + subcategoryName + '"]');
            log('Found match:', !!subcatEl);
          }
          
          if (subcatEl) {
            // Keep item valid and visible
            cmsItem.valid = true;
            itemElement.classList.remove('category-filter-hidden');
            visibleCount++;
          } else {
            // Mark item as invalid so CMS Load ignores it
            cmsItem.valid = false;
            itemElement.classList.add('category-filter-hidden');
          }
        }
        
        log('Subcategory filter result:', visibleCount, 'items valid,', itemsChecked, 'checked,', itemsSkipped, 'skipped by parent filter');
        
        // Show/hide empty state based on results
        if (visibleCount === 0) {
          showEmptyState();
        } else {
          hideEmptyState();
        }
        
        // CRITICAL: Trigger CMS List render which will coordinate with CMS Load
        listInstance.renderItems().then(function() {
          log('✓ CMS List render completed, CMS Load will recalculate automatically');
        });
        
        // Update heading for subcategory
        updateHeading(currentParent, currentSubcategory);
        // Update breadcrumbs for subcategory
        updateBreadcrumbs();
        
      } else {
        // Fallback: apply subcategory filter without CMS Filter coordination
        log('No CMS Filter instance found, applying subcategory filter directly');
        applySubcategoryFilterDirect(subcategoryName);
      }
    }]);
  }
  
  function applySubcategoryFilterDirect(subcategoryName) {
    var items = document.querySelectorAll(CONFIG.ITEMS_SELECTOR);
    var visibleCount = 0;
    var itemsChecked = 0;
    var itemsSkipped = 0;
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      
      // Skip items already hidden by Finsweet
      var computedStyle = window.getComputedStyle(item);
      if (computedStyle.display === 'none') {
        itemsSkipped++;
        continue;
      }
      
      itemsChecked++;
      
      // Find subcategory element
      var subcatEl = item.querySelector('[data-subcategory="' + subcategoryName + '"]');
      
      if (subcatEl) {
        item.classList.remove('category-filter-hidden');
        visibleCount++;
      } else {
        item.classList.add('category-filter-hidden');
      }
    }
    
    log('Direct subcategory filter result:', visibleCount, 'items visible,', itemsChecked, 'checked,', itemsSkipped, 'skipped by Finsweet');
    
    // Show/hide empty state based on results
    if (visibleCount === 0) {
      showEmptyState();
    } else {
      hideEmptyState();
    }
    
    // Update heading for subcategory
    updateHeading(currentParent, currentSubcategory);
    // Update breadcrumbs for subcategory
    updateBreadcrumbs();
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
    // CRITICAL FIX: Update active states after rebuilding interface
    updateActiveStates();
  }
  
  function createSlide(template, text, type) {
    var slide = template.cloneNode(true);
    var link = slide.querySelector('a');
    
    if (!link) return slide;
    
    link.textContent = text;
    
    // Generate SEO-friendly URLs with category parameters
    if (type === 'parent' && text !== 'All Categories') {
      // Parent category links
      var baseUrl = window.location.origin + window.location.pathname;
      var categoryParam = formatUrlValue(text);
      link.href = baseUrl + '?category=' + categoryParam;
    } else if (type === 'subcategory') {
      // Subcategory links (include both parent and subcategory)
      var baseUrl = window.location.origin + window.location.pathname;
      var categoryParam = formatUrlValue(currentParent);
      var subcategoryParam = formatUrlValue(text);
      link.href = baseUrl + '?category=' + categoryParam + '&subcategory=' + subcategoryParam;
    } else {
      // Default or "All Categories" - link to base page
      link.href = window.location.origin + window.location.pathname;
    }
    
    // Clear existing classes
    link.className = link.className.replace(/\bactive\b/g, '').trim();
    link.style.fontWeight = '';
    
    if (type === 'separator') {
      link.style.pointerEvents = 'none';
      link.style.opacity = '0.6';
      // Remove all padding for pipe/separator appearance
      link.style.padding = '0';
      link.style.margin = '0';
    } else {
      link.onclick = function(e) {
        e.preventDefault();
        handleClick(text, type);
        return false;
      };
      
      // Apply active state based on current selection
      var isActive = false;
      var isLocked = false;
      
      if (type === 'parent') {
        // "All Categories" is active when no parent is selected
        if (text === 'All Categories') {
          isActive = (currentParent === null);
        } else {
          isActive = (currentParent === text);
          // Parent is "locked" when a subcategory is selected
          isLocked = (currentParent === text && currentSubcategory !== null);
        }
        link.style.fontWeight = 'bold';
      } else if (type === 'subcategory') {
        isActive = (currentSubcategory === text);
      }
      
      if (isActive) {
        link.classList.add('active');
        link.style.backgroundColor = '#146ef5';
        link.style.color = '#fff';
      }
      
      if (isLocked) {
        link.classList.add('locked');
        // Add visual indication of locked state
        link.style.opacity = '0.7';
        link.style.cursor = 'not-allowed';
      }
    }
    
    return slide;
  }
  
  function handleClick(name, type) {
    log('Clicked:', name, 'type:', type);
    log('Current state - Parent:', currentParent, 'Subcategory:', currentSubcategory);
    
    if (type === 'parent') {
      // Check if parent is locked (subcategory is selected)
      var isLocked = (currentParent === name && currentSubcategory !== null);
      
      if (isLocked) {
        log('Parent is locked - subcategory must be deselected first');
        return; // Prevent parent deselection when locked
      }
      
      if (currentParent === name || name === 'All Categories') {
        // Second click or "All Categories" - deselect everything
        log('Deselecting parent category, showing all items');
        currentParent = null;
        currentSubcategory = null;
        updateUrlParameter(CONFIG.URL_PARAM_NAME, '');
        updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
        // Reset heading to original
        updateHeading(null, null);
        // Update breadcrumbs to remove category selections
        updateBreadcrumbs();
        // Hide empty state when clearing filters
        hideEmptyState();
        clearAllFilters();
        buildParentInterface();
      } else {
        // Different parent - switch
        log('Switching to parent category:', name);
        currentSubcategory = null; // Clear subcategory when switching parents
        updateUrlParameter(CONFIG.URL_PARAM_NAME, name);
        updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
        filterByParent(name);
      }
    } else if (type === 'subcategory') {
      if (currentSubcategory === name) {
        // Second click - back to parent only
        log('Deselecting subcategory, showing parent category only');
        currentSubcategory = null;
        updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, '');
        // Update heading back to parent only
        updateHeading(currentParent, null);
        // Update breadcrumbs back to parent only
        updateBreadcrumbs();
        // Hide empty state when going back to parent filter
        hideEmptyState();
        restoreParentFilter();
      } else {
        // Apply subcategory filter
        log('Applying subcategory filter:', name);
        updateUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME, name);
        filterBySubcategory(name);
      }
    }
    
    // Update active states after any click
    updateActiveStates();
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
    
    // Add "All Categories" option (active by default when no selection)
    var allSlide = createSlide(template, 'All Categories', 'parent');
    wrapper.appendChild(allSlide);
    
    // Add separator to show categories to the right are all available categories
    var separator = createSlide(template, '|', 'separator');
    wrapper.appendChild(separator);
    
    // Add parent categories
    for (var i = 0; i < categoriesData.length; i++) {
      var parentSlide = createSlide(template, categoriesData[i].name, 'parent');
      wrapper.appendChild(parentSlide);
    }
    
    updateSwiper();
  }
  
  function updateActiveStates() {
    var container = document.querySelector(CONFIG.SWIPER_CONTAINER);
    if (!container) return;
    
    var links = container.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var text = link.textContent;
      
      // Remove active and locked classes and reset styles
      link.className = link.className.replace(/\b(active|locked)\b/g, '').trim();
      link.style.opacity = '';
      link.style.cursor = '';
      link.style.backgroundColor = '';
      link.style.color = '';
      
      // Add active class based on current selection
      var shouldBeActive = false;
      var shouldBeLocked = false;
      
      if (text === 'All Categories') {
        // "All Categories" is active when no parent is selected
        shouldBeActive = (currentParent === null);
      } else if (currentParent && text === currentParent) {
        // Selected parent category is active
        shouldBeActive = true;
        // Parent is locked when a subcategory is selected
        shouldBeLocked = (currentSubcategory !== null);
      } else if (currentSubcategory && text === currentSubcategory) {
        // Selected subcategory is active
        shouldBeActive = true;
      }
      
      if (shouldBeActive) {
        link.classList.add('active');
        link.style.backgroundColor = '#146ef5';
        link.style.color = '#fff';
      }
      
      if (shouldBeLocked) {
        link.classList.add('locked');
        link.style.opacity = '0.7';
        link.style.cursor = 'not-allowed';
      }
    }
  }
  
  function clearAllFilters() {
    log('Clearing all filters and showing all items');
    
    // Reset Finsweet filters
    if (window.fsAttributes) {
      window.fsAttributes.push(['cmsfilter', function(filterInstances) {
        if (filterInstances && filterInstances.length > 0) {
          var filter = filterInstances[0];
          filter.resetFilters().then(function() {
            log('✓ All Finsweet filters cleared');
          }).catch(function(err) {
            error('Error clearing Finsweet filters:', err);
          });
        }
      }]);
    }
    
    // Remove custom filter classes and show all items
    var items = document.querySelectorAll(CONFIG.ITEMS_SELECTOR);
    for (var i = 0; i < items.length; i++) {
      // Remove our custom hiding class
      items[i].classList.remove('category-filter-hidden');
      // Also clear any direct style manipulation for backward compatibility
      if (items[i].style.display === 'none') {
        items[i].style.display = '';
      }
    }
  }
  
  function restoreParentFilter() {
    log('Restoring parent filter for:', currentParent);
    
    // Use CMS Filter to properly restore parent-only filtering
    window.fsAttributes = window.fsAttributes || [];
    window.fsAttributes.push(['cmsfilter', function(filterInstances) {
      if (filterInstances && filterInstances.length > 0) {
        var filterInstance = filterInstances[0];
        var listInstance = filterInstance.listInstance;
        var items = listInstance.items;
        
        log('Restoring parent filter via CMS Filter API');
        
        // Reset all items to use parent filter validation only
        for (var i = 0; i < items.length; i++) {
          var cmsItem = items[i];
          var itemElement = cmsItem.element;
          
          // Remove our custom hiding class
          itemElement.classList.remove('category-filter-hidden');
          
          // Let the parent filter determine validity
          // (This will be recalculated by applyFilters)
        }
        
        // Trigger parent filter to recalculate which items are valid
        filterInstance.applyFilters().then(function() {
          log('✓ Parent filter restored, CMS Load will recalculate automatically');
        });
        
      } else {
        // Fallback: remove custom classes directly
        var items = document.querySelectorAll(CONFIG.ITEMS_SELECTOR);
        for (var i = 0; i < items.length; i++) {
          items[i].classList.remove('category-filter-hidden');
          if (items[i].style.display === 'none') {
            items[i].style.display = '';
          }
        }
      }
    }]);
    
    // Update UI
    buildSubcategoryInterface(currentParent, getSubcategoriesForParent(currentParent));
    updateBreadcrumbs();
  }
  
  function getSubcategoriesForParent(parentName) {
    if (!categoriesData || !parentName) return [];
    
    var parentCategory = categoriesData.find(function(cat) {
      return cat.name === parentName;
    });
    
    return parentCategory && parentCategory.children ? parentCategory.children : [];
  }
  
  function restoreParentFilterForSubcategory(subcategoryName) {
    log('Restoring parent filter before subcategory switch:', currentParent);
    
    // Use CMS Filter to restore parent-only filtering
    window.fsAttributes = window.fsAttributes || [];
    window.fsAttributes.push(['cmsfilter', function(filterInstances) {
      if (filterInstances && filterInstances.length > 0) {
        var filterInstance = filterInstances[0];
        var listInstance = filterInstance.listInstance;
        var items = listInstance.items;
        
        log('Resetting CMS Load state for parent filter:', currentParent);
        
        // Reset all items to use parent filter validation only
        for (var i = 0; i < items.length; i++) {
          var cmsItem = items[i];
          var itemElement = cmsItem.element;
          
          // Remove our custom hiding class
          itemElement.classList.remove('category-filter-hidden');
          
          // Let the parent filter determine validity
          // (This will be recalculated by applyFilters)
        }
        
        // Trigger parent filter to recalculate which items are valid
        filterInstance.applyFilters().then(function() {
          log('✓ Parent filter restored, now applying subcategory:', subcategoryName);
          
          // Wait a moment for CMS Load to process parent filter
          setTimeout(function() {
            applySubcategoryFilterWithCMSLoad(subcategoryName);
          }, 100);
        });
        
      } else {
        // Fallback: apply subcategory filter directly
        log('No CMS Filter instance found, applying subcategory filter directly');
        applySubcategoryFilterWithCMSLoad(subcategoryName);
      }
    }]);
  }
  
  function scrollToLeft() {
    var container = document.querySelector(CONFIG.SWIPER_CONTAINER);
    if (!container) return;
    
    var wrapper = container.querySelector('.swiper-wrapper');
    if (!wrapper) return;
    
    // Check if we're in subcategory mode (parent + subcategories)
    var hasSubcategories = currentParent && getSubcategoriesForParent(currentParent).length > 0;
    
    if (hasSubcategories) {
      // Scroll to the beginning when showing subcategories
      wrapper.scrollLeft = 0;
      log('✓ Auto-scrolled to left for subcategory mode');
      
      // Also try to use Swiper's native scroll if available
      if (window.swiperInstance && window.swiperInstance.slideTo) {
        window.swiperInstance.slideTo(0, 300); // Smooth scroll to first slide
        log('✓ Used Swiper native scroll to first slide');
      }
    }
  }
  
  function updateSwiper() {
    performSwiperUpdate();
    // Delayed update to ensure Swiper can calculate dimensions properly
    setTimeout(function() {
      performSwiperUpdate();
      // Auto-scroll to left when switching to subcategory mode
      scrollToLeft();
    }, 100);
  }
  
  function performSwiperUpdate() {
    // Check if slides overflow the container and dispatch event
    var container = document.querySelector(CONFIG.SWIPER_CONTAINER);
    if (!container) return;
    
    var wrapper = container.querySelector('.swiper-wrapper');
    if (!wrapper) return;
    
    // Calculate total width of all slides
    var slides = wrapper.querySelectorAll('.swiper-slide');
    var totalSlidesWidth = 0;
    for (var i = 0; i < slides.length; i++) {
      totalSlidesWidth += slides[i].offsetWidth;
    }
    
    var containerWidth = container.offsetWidth;
    var hasOverflow = totalSlidesWidth > containerWidth;
    
    log('Swiper overflow check:', {
      totalSlidesWidth: totalSlidesWidth,
      containerWidth: containerWidth, 
      hasOverflow: hasOverflow,
      slideCount: slides.length
    });
    
    // Dispatch event with overflow information
    var event = new CustomEvent('categoryFilterUpdated', {
      detail: { 
        parent: currentParent, 
        subcategory: currentSubcategory,
        hasOverflow: hasOverflow,
        slideCount: slides.length
      }
    });
    document.dispatchEvent(event);
  }
  
  // === INITIALIZATION ===
  function loadCategories() {
    log('Loading free template categories from API...');
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', CONFIG.API_URL, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data && data.categories && data.hierarchical) {
            categoriesData = data.categories;
            log('✓ Free template categories loaded:', categoriesData.length);
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
    initializeHeading();
    // Hide empty state by default
    hideEmptyState();
    
    // Check for URL parameters BEFORE building interface
    var urlCategory = getUrlParameter(CONFIG.URL_PARAM_NAME);
    var urlSubcategory = getUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME);
    
    // IMMEDIATE URL normalization on page load
    if (urlCategory) {
      var categoryName = findCategoryByUrlParam(urlCategory, 'category');
      if (categoryName) {
        var normalizedCategory = formatUrlValue(categoryName);
        if (normalizedCategory !== urlCategory) {
          log('🔄 IMMEDIATE URL normalization on page load:', urlCategory, '->', normalizedCategory);
          // Update URL immediately without triggering filter logic
          try {
            var url = new URL(window.location.href);
            url.searchParams.set(CONFIG.URL_PARAM_NAME, normalizedCategory);
            if (urlSubcategory) {
              var subcategoryName = findCategoryByUrlParam(urlSubcategory, 'subcategory');
              if (subcategoryName) {
                var normalizedSubcategory = formatUrlValue(subcategoryName);
                if (normalizedSubcategory !== urlSubcategory) {
                  log('🔄 IMMEDIATE subcategory URL normalization:', urlSubcategory, '->', normalizedSubcategory);
                  url.searchParams.set(CONFIG.SUBCATEGORY_URL_PARAM_NAME, normalizedSubcategory);
                }
              }
            }
            window.history.replaceState({}, '', url.toString());
            log('✅ URL immediately normalized to:', url.toString());
          } catch (e) {
            log('URL normalization failed:', e);
          }
        }
      }
    }
    
    // Re-read URL parameters after normalization
    urlCategory = getUrlParameter(CONFIG.URL_PARAM_NAME);
    urlSubcategory = getUrlParameter(CONFIG.SUBCATEGORY_URL_PARAM_NAME);
    
    if (urlCategory) {
      // Find the actual category name from the URL parameter
      var categoryName = findCategoryByUrlParam(urlCategory, 'category');
      if (categoryName) {
        log('URL category detected, applying filter:', categoryName);
        // Set the state before applying the filter
        currentParent = categoryName;
        
        if (urlSubcategory) {
          var subcategoryName = findCategoryByUrlParam(urlSubcategory, 'subcategory');
          if (subcategoryName) {
            currentSubcategory = subcategoryName;
          }
        }
        // Apply the filter which will build the appropriate interface
        filterByParent(categoryName);
        
        if (urlSubcategory && subcategoryName) {
          setTimeout(function() {
            filterBySubcategory(subcategoryName);
          }, 500); // Allow parent filter to complete first
        }
      } else {
        // URL parameter didn't match any category, build default interface
        buildParentInterface();
      }
    } else {
      // No URL parameters, build default parent interface
      buildParentInterface();
    }
    
    // Dispatch ready event after interface is built
    var readyEvent = new CustomEvent('categoryFilterReady', {
      detail: { 
        slidesBuilt: true,
        totalSlides: document.querySelector(CONFIG.SWIPER_CONTAINER + ' .swiper-wrapper').children.length
      }
    });
    document.dispatchEvent(readyEvent);
    log('✓ Initial slides built, Swiper can now initialize safely');
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
  window.FreeCategoryFilter = {
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
  log('🚀 Free Templates Category Filter v2.0 starting...');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDependencies);
  } else {
    waitForDependencies();
  }
  
})();