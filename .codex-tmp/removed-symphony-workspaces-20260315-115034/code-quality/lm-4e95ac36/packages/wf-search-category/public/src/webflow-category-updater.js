/**
 * Webflow Category Pills Updater - Existing Elements Version
 * Updates existing "Loading" category pills with AI-generated category suggestions
 * Designed for search results pages where categories load automatically
 */

class WebflowCategoryUpdater {
    constructor(searchQuery = null) {
        this.searchQuery = searchQuery || this.getSearchQueryFromURL();
        this.airtable = new AirtableIntegration();
        this.openai = new OpenAIIntegration();
        
        console.log('🔄 Webflow Category Updater initialized with query:', this.searchQuery);
        
        // Initialize on body load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize and start processing categories
     */
    async init() {
        try {
            console.log('🔄 Starting category update process...');
            console.log('📍 Page structure analysis:');
            
            // Debug: Show the page structure we're working with
            const containers = document.querySelectorAll('.category-pill-container');
            console.log(`   - Found ${containers.length} .category-pill-container elements`);
            
            const wrappers = document.querySelectorAll('.category-pill-wrapper');
            console.log(`   - Found ${wrappers.length} .category-pill-wrapper elements`);
            
            const subheadings = document.querySelectorAll('.category-pill-subheading');
            console.log(`   - Found ${subheadings.length} .category-pill-subheading elements`);
            
            // Find existing category pill elements on the page
            const existingPills = this.findExistingCategoryPills();
            
            if (existingPills.length === 0) {
                console.warn('⚠️ No existing category pills found on page');
                this.debugPageStructure();
                return;
            }
            
            console.log(`📍 Found ${existingPills.length} existing category pill(s) to update`);
            
            // Show what we found
            existingPills.forEach((pill, index) => {
                console.log(`   Pill ${index + 1}: "${pill.textContent.trim()}" (${pill.tagName}.${pill.className})`);
            });
            
            // If we have a search query, generate AI categories
            if (this.searchQuery && this.searchQuery.trim()) {
                await this.updateWithAICategories(existingPills);
            } else {
                console.log('ℹ️ No search query found, keeping existing pills as-is');
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize category updater:', error);
        }
    }

    /**
     * Get search query from URL parameters
     */
    getSearchQueryFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('query') || urlParams.get('search') || urlParams.get('q') || '';
    }

    /**
     * Debug page structure when no pills are found
     */
    debugPageStructure() {
        console.log('🔍 Debug: Analyzing page structure...');
        
        // Look for any elements with "pill" in their class
        const pillLike = document.querySelectorAll('[class*="pill"]');
        console.log(`Found ${pillLike.length} elements with "pill" in class name:`);
        pillLike.forEach((el, i) => {
            console.log(`  ${i + 1}. ${el.tagName}.${el.className} - "${el.textContent?.trim().substring(0, 50)}"`);
        });
        
        // Look for any links
        const links = document.querySelectorAll('a');
        console.log(`Found ${links.length} total <a> elements on page`);
        
        // Look for elements containing "loading"
        const loadingElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent && el.textContent.toLowerCase().includes('loading')
        );
        console.log(`Found ${loadingElements.length} elements containing "loading" text:`);
        loadingElements.forEach((el, i) => {
            console.log(`  ${i + 1}. ${el.tagName}.${el.className} - "${el.textContent?.trim()}"`);
        });
    }

    /**
     * Find existing category pill elements on the page
     * Specifically targets .category-pill elements INSIDE .category-pill-container
     */
    findExistingCategoryPills() {
        const pills = [];
        
        console.log('🔍 Looking for .category-pill elements inside .category-pill-container...');
        
        // First, find the category pill containers
        const containers = document.querySelectorAll('.category-pill-container');
        console.log(`📦 Found ${containers.length} .category-pill-container elements`);
        
        if (containers.length > 0) {
            containers.forEach((container, containerIndex) => {
                console.log(`   📦 Container ${containerIndex + 1}:`);
                
                // Find .category-pill elements within this specific container
                const containerPills = container.querySelectorAll('.category-pill');
                console.log(`      🎯 Found ${containerPills.length} .category-pill elements in this container`);
                
                containerPills.forEach((pill, pillIndex) => {
                    // Verify it's actually an anchor tag
                    if (pill.tagName === 'A') {
                        pills.push(pill);
                        console.log(`      ✅ Added pill ${pillIndex + 1}: "${pill.textContent.trim()}" (${pill.tagName})`);
                    } else {
                        console.log(`      ⚠️ Skipped non-link pill ${pillIndex + 1}: "${pill.textContent.trim()}" (${pill.tagName})`);
                    }
                });
            });
        } else {
            console.log('⚠️ No .category-pill-container elements found');
            
            // Fallback: Look for any .category-pill elements (less specific)
            const allPills = document.querySelectorAll('.category-pill');
            if (allPills.length > 0) {
                console.log(`🔄 Fallback: Found ${allPills.length} .category-pill elements outside containers`);
                allPills.forEach((pill, index) => {
                    if (pill.tagName === 'A') {
                        pills.push(pill);
                        console.log(`   🔄 Added fallback pill ${index + 1}: "${pill.textContent.trim()}"`);
                    }
                });
            }
        }
        
        console.log(`📊 Total pills found: ${pills.length}`);
        return pills;
    }

    /**
     * Update existing pills with AI-generated categories
     */
    async updateWithAICategories(existingPills) {
        try {
            console.log(`🤖 Generating AI categories for: "${this.searchQuery}"`);
            
            // Show immediate loading feedback
            this.showLoadingState(existingPills);
            
            // Step 1 & 2: Parallel API calls to reduce total processing time
            console.log('⚡ Starting parallel API calls for optimal performance...');
            
            const [allCategories, relevantCategories] = await Promise.all([
                // Fetch all categories from Airtable
                this.airtable.fetchAllCategories().catch(error => {
                    console.warn('⚠️ Airtable unavailable:', error.message);
                    return [];
                }),
                // Pre-warm OpenAI connection (will use categories once available)
                this.warmupAIConnection()
            ]);
            
            console.log(`📊 Retrieved ${allCategories.length} categories from Airtable`);
            
            if (allCategories.length === 0) {
                console.error('❌ STOP: No Airtable categories available');
                console.error('🔍 EXPLANATION: Cannot select categories because Airtable API returned no categories');
                console.error('🔧 SOLUTION: Check Airtable API connection and ensure categories are available');
                return;
            }

            console.log(`🧠 Using AI to select from ${allCategories.length} real Airtable categories`);
            const finalCategories = await this.openai.findRelevantCategories(this.searchQuery, allCategories);
            
            if (finalCategories.length === 0) {
                console.error('❌ STOP: AI returned no relevant categories');
                console.error('🔍 EXPLANATION: AI could not select any relevant categories from available Airtable categories');
                console.error(`🔧 SOLUTION: Review search query "${this.searchQuery}" or check AI category matching logic`);
                return;
            }
            
            console.log(`✅ Generated ${finalCategories.length} relevant categories`);
            
            // Debug: Check what data we actually have
            console.log('🔍 DEBUG: Checking category data structure...');
            finalCategories.forEach((cat, index) => {
                console.log(`  ${index + 1}. ${cat.name}`);
                console.log(`     id: ${cat.id}`);
                console.log(`     url: ${cat.url || 'MISSING'}`);
                console.log(`     slug: ${cat.slug || 'MISSING'}`);
                console.log(`     🥞CMS Slug: ${cat['🥞CMS Slug'] || 'MISSING'}`);
                console.log('');
            });
            
            // Step 3: Update existing pills with new category data
            this.updateExistingPills(existingPills, finalCategories);
            
        } catch (error) {
            console.error('❌ Error updating with AI categories:', error);
            
            // Fallback: at least remove "Loading" text from pills
            this.updatePillsWithFallback(existingPills);
        }
    }

    /**
     * Get fallback category selection from Airtable when AI is unavailable
     */
    getFallbackCategorySelection(searchQuery) {
        console.log('🔄 Using fallback category selection method');
        
        // Try to get recent Airtable categories from cache
        const cachedCategories = this.airtable.cache.get('all_categories');
        if (cachedCategories && cachedCategories.length > 0) {
            console.log('📦 Using cached Airtable categories for fallback selection');
            return this.keywordMatchCategories(searchQuery, cachedCategories);
        }
        
        // If no cached Airtable data, return empty array to preserve existing pills
        console.warn('⚠️ No Airtable categories available for fallback - keeping existing pills');
        return [];
    }

    /**
     * Simple keyword-based category matching as ultimate fallback
     */
    keywordMatchCategories(searchQuery, availableCategories) {
        const query = searchQuery.toLowerCase().trim();
        const queryWords = query.split(' ').filter(word => word.length > 1);
        
        console.log(`🔍 Keyword matching "${query}" against ${availableCategories.length} categories`);
        
        const scoredCategories = availableCategories.map(category => {
            let score = 0;
            
            // Check category name
            const categoryName = (category.Name || category.name || '').toLowerCase();
            if (categoryName.includes(query)) {
                score += 1.0;
            }
            
            // Check description
            const description = (category['ℹ️Description (Short)'] || category.description || '').toLowerCase();
            if (description.includes(query)) {
                score += 0.8;
            }
            
            // Check category group
            const categoryGroup = category['🪣Category Group Display Names'] || [];
            const groupText = Array.isArray(categoryGroup) ? categoryGroup.join(' ').toLowerCase() : '';
            if (groupText.includes(query)) {
                score += 0.6;
            }
            
            // Individual word matches
            queryWords.forEach(word => {
                if (categoryName.includes(word)) score += 0.4;
                if (description.includes(word)) score += 0.3;
                if (groupText.includes(word)) score += 0.2;
            });
            
            return {
                ...category,
                name: category.Name || category.name || 'Unnamed Category',
                slug: category['🥞CMS Slug'] || this.createSlug(category.Name || category.name),
                url: category['🥞CMS Slug'] ? 
                    `https://webflow.com/templates/subcategory/${category['🥞CMS Slug']}` : 
                    `https://webflow.com/templates/subcategory/${this.createSlug(category.Name || category.name)}`,
                relevanceScore: score
            };
        });
        
        const results = scoredCategories
            .filter(cat => cat.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 6);
            
        console.log(`✅ Keyword matching found ${results.length} matches`);
        results.forEach(cat => {
            console.log(`   • ${cat.name} (score: ${cat.relevanceScore.toFixed(2)})`);
        });
        
        return results;
    }

    /**
     * Update existing pill elements with new category data - dynamically create as many as needed
     */
    updateExistingPills(existingPills, categories) {
        console.log(`🔄 Creating ${categories.length} category pills from ${existingPills.length} template(s)`);
        
        if (existingPills.length === 0 || categories.length === 0) {
            console.warn('⚠️ No pills or categories to work with');
            return;
        }
        
        // Use the first pill as template
        const templatePill = existingPills[0];
        const parentWrapper = templatePill.parentElement; // Should be .category-pill-wrapper
        
        if (!parentWrapper) {
            console.error('❌ Could not find parent wrapper for template pill');
            return;
        }
        
        console.log(`📋 Using template: "${templatePill.textContent.trim()}" in ${parentWrapper.className}`);
        
        // Clear existing pills first (keep the template structure)
        existingPills.forEach(pill => {
            if (pill !== templatePill) {
                pill.remove();
            }
        });
        
        // Create pills for each category
        categories.forEach((category, index) => {
            let pillToUpdate;
            
            if (index === 0) {
                // Use the original template pill for the first category
                pillToUpdate = templatePill;
                console.log(`🔄 Updating template pill for: ${category.name}`);
            } else {
                // Clone the template pill for additional categories
                pillToUpdate = templatePill.cloneNode(true);
                parentWrapper.appendChild(pillToUpdate);
                console.log(`➕ Created new pill for: ${category.name}`);
            }
            
            // Update the pill with category data
            this.updateSinglePill(pillToUpdate, category);
            
            // Remove loading state
            this.clearLoadingState(pillToUpdate);
        });
        
        console.log(`✅ Successfully created ${categories.length} category pills`);
    }

    /**
     * Update a single pill element with category data
     * Preserves existing Webflow styling and structure
     */
    updateSinglePill(pillElement, category) {
        try {
            // Update the text content while preserving inner structure
            if (category.name) {
                // Check if pill has nested elements (like spans, divs)
                const textNode = this.findTextNode(pillElement);
                if (textNode) {
                    textNode.textContent = category.name;
                } else {
                    pillElement.textContent = category.name;
                }
            }
            
            // Update the href if it's a link - construct Webflow subcategory URL
            if (pillElement.tagName === 'A' || pillElement.href !== undefined) {
                let categoryUrl = category.url || '';
                
                // If category has a specific URL from Airtable, use it
                // Otherwise construct from Airtable CMS slug or fallback to generated slug
                if (!categoryUrl && category.name) {
                    // Priority: 1) category.slug (from 🥞CMS Slug), 2) category['🥞CMS Slug'], 3) auto-generated slug
                    let slug;
                    let slugSource;
                    
                    if (category.slug) {
                        slug = category.slug;
                        slugSource = 'category.slug';
                    } else if (category['🥞CMS Slug']) {
                        slug = category['🥞CMS Slug'];
                        slugSource = '🥞CMS Slug field';
                    } else {
                        slug = this.createSlug(category.name);
                        slugSource = 'auto-generated';
                    }
                    
                    categoryUrl = `https://webflow.com/templates/subcategory/${slug}`;
                    console.log(`🏷️ Using slug "${slug}" from ${slugSource} for category: ${category.name}`);
                }
                
                if (categoryUrl) {
                    pillElement.href = categoryUrl;
                    console.log(`🔗 Updated pill URL: ${category.name} → ${categoryUrl}`);
                }
            }
            
            // Add category data attributes for tracking
            if (category.id) {
                pillElement.setAttribute('data-category-id', category.id);
            }
            
            // Add title/tooltip with description
            if (category.description) {
                pillElement.setAttribute('title', category.description);
            }
            
            // Remove any loading-related classes
            pillElement.classList.remove('loading', 'placeholder', 'skeleton', 'loading-pill');
            
            // Add category-specific classes if available (without breaking existing styles)
            if (category.slug) {
                pillElement.classList.add(`category-${this.createSlug(category.slug)}`);
            }
            
            // Add click tracking (only once)
            if (!pillElement.hasAttribute('data-tracking-added')) {
                pillElement.addEventListener('click', (e) => {
                    console.log('📊 Category clicked:', {
                        name: category.name,
                        id: category.id,
                        searchQuery: this.searchQuery,
                        url: pillElement.href
                    });
                    
                    // Track in analytics if available
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'category_selection', {
                            category_id: category.id,
                            category_name: category.name,
                            search_query: this.searchQuery,
                            page_path: window.location.pathname
                        });
                    }
                    
                    // Track in Webflow analytics if available
                    if (window.Webflow && window.Webflow.push) {
                        window.Webflow.push(['track', 'Category Selected', {
                            category: category.name,
                            query: this.searchQuery
                        }]);
                    }
                });
                
                pillElement.setAttribute('data-tracking-added', 'true');
            }
            
            console.log(`✅ Updated pill with category: ${category.name}`);
            
        } catch (error) {
            console.error('❌ Error updating individual pill:', error);
        }
    }
    

    /**
     * Find the text node within an element (handles nested structure)
     */
    findTextNode(element) {
        // If element has direct text content
        for (let child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                return child;
            }
        }
        
        // Look for text in nested spans/divs
        const textElements = element.querySelectorAll('span, div, p');
        for (let textEl of textElements) {
            if (textEl.childNodes.length === 1 && textEl.childNodes[0].nodeType === Node.TEXT_NODE) {
                return textEl;
            }
        }
        
        return null;
    }
    
    /**
     * Create URL-safe slug from category name
     */
    createSlug(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    /**
     * Fallback update when AI categories are unavailable
     */
    updatePillsWithFallback(existingPills) {
        console.log('🔄 Applying fallback updates with dynamic pill creation');
        
        const fallbackCategories = [
            { name: 'Business', url: 'https://webflow.com/templates/subcategory/business' },
            { name: 'Creative', url: 'https://webflow.com/templates/subcategory/creative' },
            { name: 'Portfolio', url: 'https://webflow.com/templates/subcategory/portfolio' },
            { name: 'Agency', url: 'https://webflow.com/templates/subcategory/agency' },
            { name: 'Landing', url: 'https://webflow.com/templates/subcategory/landing' },
            { name: 'E-commerce', url: 'https://webflow.com/templates/subcategory/ecommerce' }
        ];
        
        // Use the same dynamic creation logic as updateExistingPills
        this.updateExistingPills(existingPills, fallbackCategories);
    }

    /**
     * Show immediate loading state while processing
     */
    showLoadingState(existingPills) {
        existingPills.forEach((pill, index) => {
            const loadingTexts = ['🔍 Analyzing...', '🧠 Thinking...', '⚡ Loading...', '🎯 Matching...'];
            const loadingText = loadingTexts[index % loadingTexts.length];
            
            // Update text content
            const textNode = this.findTextNode(pill);
            if (textNode) {
                textNode.textContent = loadingText;
            } else {
                pill.textContent = loadingText;
            }
            
            // Add loading visual cues
            pill.style.opacity = '0.7';
            pill.style.cursor = 'wait';
            pill.classList.add('loading-state');
        });
        
        console.log('⚡ Showing loading state while processing...');
    }

    /**
     * Clear loading state and restore normal appearance
     */
    clearLoadingState(pill) {
        pill.style.opacity = '';
        pill.style.cursor = '';
        pill.classList.remove('loading-state');
    }

    /**
     * Pre-warm AI connection to reduce latency
     */
    async warmupAIConnection() {
        try {
            // Test connection with minimal request
            const testResponse = await fetch(this.openai.suggestApiEndpoint, { method: 'GET' });
            console.log('⚡ AI connection pre-warmed');
            return true;
        } catch (error) {
            console.warn('⚠️ AI connection warmup failed:', error.message);
            return false;
        }
    }

    /**
     * Public method to update categories with new search query
     */
    async updateCategories(newSearchQuery) {
        this.searchQuery = newSearchQuery;
        const existingPills = this.findExistingCategoryPills();
        if (existingPills.length > 0) {
            await this.updateWithAICategories(existingPills);
        }
    }
}

// Auto-initialize when script loads
let categoryUpdater;

function initializeCategoryUpdater() {
    const searchQuery = new URLSearchParams(window.location.search).get('query') || 
                       new URLSearchParams(window.location.search).get('search') || 
                       new URLSearchParams(window.location.search).get('q') || '';
    
    categoryUpdater = new WebflowCategoryUpdater(searchQuery);
    
    // Expose to global scope
    window.WebflowCategoryUpdater = categoryUpdater;
    window.categoryUpdater = categoryUpdater;
    
    return categoryUpdater;
}

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCategoryUpdater);
} else {
    initializeCategoryUpdater();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebflowCategoryUpdater;
}