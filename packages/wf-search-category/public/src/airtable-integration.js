/**
 * Airtable Integration for Webflow Search Agent
 * Handles dynamic category fetching from Airtable database
 */

class AirtableIntegration {
    constructor() {
        // Use full serverless API endpoint
        this.apiEndpoint = 'https://wf-search-category.pages.dev/api/airtable';
        
        // Cache for performance
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.lastFetch = null;
        
        console.log('🔗 Airtable Integration initialized with serverless API');
        console.log(`🔗 API Endpoint: ${this.apiEndpoint}`);
    }

    /**
     * Fetch relevant categories from Airtable based on search query
     * Now fetches all categories and lets AI determine relevance
     */
    async fetchRelevantCategories(searchQuery) {
        try {
            console.log(`🔍 Fetching all categories for AI analysis of: "${searchQuery}"`);
            
            // For search queries, just return all categories and let AI handle filtering
            const allCategories = await this.fetchAllCategories();
            console.log(`✅ Fetched ${allCategories.length} categories for AI analysis`);
            return allCategories;

        } catch (error) {
            console.error('❌ Airtable fetch error:', error);
            return this.getFallbackCategories(searchQuery);
        }
    }

    /**
     * Build Airtable filter formula for searching (legacy - now using fetchAllCategories)
     */
    buildFilterFormula(searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const queryWords = query.split(' ').filter(word => word.length > 1);
        
        const conditions = [];
        
        // Search in Name field (primary field)
        conditions.push(`SEARCH(LOWER("${query}"), LOWER({Name}))`);
        
        // Search in Category Group Display Names field (with emoji prefix)
        conditions.push(`SEARCH(LOWER("${query}"), LOWER({🪣Category Group Display Names}))`);
        
        // Search in Description field
        conditions.push(`SEARCH(LOWER("${query}"), LOWER({ℹ️Description (Short)}))`);
        
        // Search for individual words
        queryWords.forEach(word => {
            if (word.length > 2) {
                conditions.push(`SEARCH(LOWER("${word}"), LOWER({Name}))`);
                conditions.push(`SEARCH(LOWER("${word}"), LOWER({🪣Category Group Display Names}))`);
            }
        });
        
        return `OR(${conditions.join(', ')})`;
    }

    /**
     * Format Airtable records into standardized category objects
     */
    formatCategories(records) {
        return records
            .map(record => {
                const fields = record.fields;
                
                // Extract keywords from multiple potential fields
                const keywordSources = [
                    fields['🪣Category Group Display Names'], // This is an array
                    fields['ℹ️Description (Short)'],
                    fields['Name']
                ];
                
                // Combine and deduplicate keywords from all sources
                let allKeywords = [];
                keywordSources.forEach(source => {
                    if (source) {
                        const extractedKeywords = this.parseKeywords(source);
                        allKeywords = allKeywords.concat(extractedKeywords);
                    }
                });
                
                // Remove duplicates and sort
                const uniqueKeywords = [...new Set(allKeywords.map(k => k.toLowerCase()))]
                    .map(k => k.charAt(0).toUpperCase() + k.slice(1))
                    .sort();
                
                // Construct URL from CMS slug using Webflow subcategory format
                const slug = fields['🥞CMS Slug'];
                const categoryUrl = slug ? `https://webflow.com/templates/subcategory/${slug}` : '#';
                
                return {
                    id: record.id,
                    name: fields['Name'] || 'Unnamed Category',
                    url: categoryUrl,
                    description: fields['ℹ️Description (Short)'] || `${fields['Name']} templates for your website`,
                    keywords: uniqueKeywords,
                    relevanceScore: 0, // Will be set during analysis
                    icon: this.getCategoryIcon(fields['🪣Category Group Display Names']),
                    assetType: fields['🆎Asset Type'] || 'Template',
                    categoryGroup: fields['🪣Category Group Display Names'],
                    slug: fields['🥞CMS Slug'],
                    // Include counts for additional context
                    totalAssets: fields['#️⃣👛Total'] || 0,
                    publishedAssets: fields['#️⃣👛Published'] || 0
                };
            })
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Parse keywords from Airtable field (handles various formats)
     */
    parseKeywords(keywordsField) {
        if (!keywordsField) return [];
        
        if (Array.isArray(keywordsField)) {
            return keywordsField.filter(keyword => keyword && keyword.trim().length > 0);
        }
        
        if (typeof keywordsField === 'string') {
            // Handle multiple separators: commas, newlines, semicolons, pipes, and various whitespace
            return keywordsField
                .split(/[,\n\r;|]+/)
                .map(keyword => keyword.trim())
                .filter(keyword => keyword.length > 0)
                .map(keyword => {
                    // Clean up any extra quotes or brackets
                    return keyword.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
                })
                .filter(keyword => keyword.length > 0);
        }
        
        return [];
    }

    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        return this.lastFetch && (Date.now() - this.lastFetch) < this.cacheExpiry;
    }

    /**
     * Clear cache manually
     */
    clearCache() {
        this.cache.clear();
        this.lastFetch = null;
        console.log('🗑️ Cache cleared');
    }

    /**
     * Fallback categories if Airtable is unavailable
     */
    getFallbackCategories(searchQuery) {
        console.log('⚠️ Using fallback categories');
        
        // Load from existing category-mappings.json as backup
        const fallbackData = {
            "party": [
                {
                    id: "party-supplies",
                    name: "Party Supplies & Decorations",
                    description: "Templates and designs for celebrations, birthdays, and special events",
                    url: "/category/party-supplies",
                    keywords: ["party", "celebration", "birthday", "event", "decorations", "supplies"],
                    relevanceScore: 0.95,
                    icon: "🎉"
                },
                {
                    id: "event-planning",
                    name: "Event Planning Templates",
                    description: "Professional templates for event planning and coordination",
                    url: "/category/event-planning",
                    keywords: ["party", "event", "planning", "coordination", "organize"],
                    relevanceScore: 0.90,
                    icon: "📋"
                },
                {
                    id: "birthday-designs",
                    name: "Birthday Party Designs",
                    description: "Specialized designs and layouts for birthday celebrations",
                    url: "/category/birthday-designs",
                    keywords: ["party", "birthday", "celebration", "designs", "invitations"],
                    relevanceScore: 0.85,
                    icon: "🎂"
                }
            ],
            "business": [
                {
                    id: "corporate-templates",
                    name: "Corporate Templates",
                    description: "Professional business templates for corporate use",
                    url: "/category/corporate-templates",
                    keywords: ["business", "corporate", "professional", "company", "enterprise"],
                    relevanceScore: 0.95,
                    icon: "🏢"
                },
                {
                    id: "professional-services",
                    name: "Professional Services",
                    description: "Templates for service-based businesses and consultants",
                    url: "/category/professional-services",
                    keywords: ["business", "professional", "services", "consultant", "agency"],
                    relevanceScore: 0.90,
                    icon: "💼"
                },
                {
                    id: "startup-resources",
                    name: "Startup Resources",
                    description: "Templates and resources specifically designed for startups",
                    url: "/category/startup-resources",
                    keywords: ["business", "startup", "entrepreneur", "resources", "launch"],
                    relevanceScore: 0.85,
                    icon: "🚀"
                }
            ],
            "food": [
                {
                    id: "restaurant-templates",
                    name: "Restaurant Templates",
                    description: "Complete website templates for restaurants and cafes",
                    url: "/category/restaurant-templates",
                    keywords: ["food", "restaurant", "cafe", "dining", "menu"],
                    relevanceScore: 0.95,
                    icon: "🍽️"
                },
                {
                    id: "recipe-layouts",
                    name: "Recipe Layouts",
                    description: "Beautiful layouts for recipe blogs and cooking websites",
                    url: "/category/recipe-layouts",
                    keywords: ["food", "recipe", "cooking", "blog", "culinary"],
                    relevanceScore: 0.90,
                    icon: "📖"
                },
                {
                    id: "menu-designs",
                    name: "Menu Designs",
                    description: "Professional menu design templates for restaurants",
                    url: "/category/menu-designs",
                    keywords: ["food", "menu", "restaurant", "design", "dining"],
                    relevanceScore: 0.88,
                    icon: "📋"
                }
            ]
        };

        const queryLower = searchQuery.toLowerCase().trim();
        
        // Find matching fallback categories
        for (const [key, categories] of Object.entries(fallbackData)) {
            if (queryLower.includes(key) || key.includes(queryLower)) {
                return categories;
            }
        }
        
        // If no match, return a generic set
        return fallbackData.business || [];
    }

    /**
     * Fetch all categories (for admin/management purposes)
     */
    async fetchAllCategories() {
        try {
            console.log('📡 Fetching categories via serverless API...');
            
            // Check cache first
            const cacheKey = 'all_categories';
            if (this.cache.has(cacheKey) && this.isCacheValid()) {
                console.log('📦 Using cached categories');
                return this.cache.get(cacheKey);
            }
            
            const response = await fetch(this.apiEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                if (errorData.fallback) {
                    console.log('⚠️ Airtable serverless API requested fallback');
                    return [];
                }
                throw new Error(`Serverless API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            
            if (!data.categories || !Array.isArray(data.categories)) {
                throw new Error('Invalid response format from serverless API');
            }
            
            console.log(`🗄️ Fetched ${data.categories.length} total categories from Airtable serverless API`);
            
            // Format the categories properly with CMS slugs and URLs
            const formattedCategories = this.formatCategoriesFromServerless(data.categories);
            
            // Cache the results
            this.cache.set(cacheKey, formattedCategories);
            this.lastFetch = Date.now();
            
            return formattedCategories;

        } catch (error) {
            console.error('❌ Error fetching categories via serverless API:', error);
            return [];
        }
    }

    /**
     * Format categories from serverless API response with proper slug and URL mapping
     */
    formatCategoriesFromServerless(serverlessCategories) {
        return serverlessCategories
            .map(category => {
                // Extract keywords from multiple potential fields
                const keywordSources = [
                    category['🪣Category Group Display Names'],
                    category['ℹ️Description (Short)'],
                    category['Name'] || category.name
                ];
                
                // Combine and deduplicate keywords from all sources
                let allKeywords = [];
                keywordSources.forEach(source => {
                    if (source) {
                        const extractedKeywords = this.parseKeywords(source);
                        allKeywords = allKeywords.concat(extractedKeywords);
                    }
                });
                
                // Remove duplicates and sort
                const uniqueKeywords = [...new Set(allKeywords.map(k => k.toLowerCase()))]
                    .map(k => k.charAt(0).toUpperCase() + k.slice(1))
                    .sort();
                
                // Get CMS slug from the 🥞CMS Slug field
                const cmsSlug = category['🥞CMS Slug'];
                
                // Construct URL from CMS slug using Webflow subcategory format
                const categoryUrl = cmsSlug 
                    ? `https://webflow.com/templates/subcategory/${cmsSlug}` 
                    : '#';
                
                return {
                    id: category.id,
                    name: category.name || category.Name || 'Unnamed Category',
                    url: categoryUrl,
                    description: category['ℹ️Description (Short)'] || `${category.name || category.Name} templates for your website`,
                    keywords: uniqueKeywords,
                    relevanceScore: 0.5, // AI will set this during analysis
                    icon: this.getCategoryIcon(category['🪣Category Group Display Names']),
                    assetType: category['🆎Asset Type'] || 'Template',
                    categoryGroup: category['🪣Category Group Display Names'],
                    slug: cmsSlug,
                    // Include counts for additional context
                    totalAssets: category['#️⃣👛Total'] || 0,
                    publishedAssets: category['#️⃣👛Published'] || 0
                };
            })
            .filter(category => category.slug) // Only return categories with valid CMS slugs
            .sort((a, b) => b.publishedAssets - a.publishedAssets); // Sort by published assets count
    }

    /**
     * Get appropriate icon for category group
     */
    getCategoryIcon(categoryGroup) {
        if (!categoryGroup) return '📁';
        
        const iconMap = {
            'Architecture & Design': '🏗️',
            'Blog & Editorial': '📝',
            'Community & Non-Profits': '🤝',
            'Construction & Home Services': '🔨',
            'Home Services': '🏠',
            'Business': '💼',
            'Technology': '💻',
            'Health & Wellness': '⚕️',
            'Food & Restaurant': '🍽️',
            'Fashion & Beauty': '👗',
            'Art & Creative': '🎨',
            'Education': '📚',
            'Sports & Fitness': '🏃',
            'Travel': '✈️',
            'Entertainment': '🎬',
            'Photography': '📸',
            'Music': '🎵',
            'Finance': '💰',
            'Real Estate': '🏘️',
            'Legal': '⚖️'
        };
        
        // Handle both string and array formats
        const groupName = Array.isArray(categoryGroup) ? categoryGroup[0] : categoryGroup;
        return iconMap[groupName] || '📁';
    }

    /**
     * Test connection to Airtable
     */
    async testConnection() {
        try {
            console.log('🔄 Testing Airtable serverless API connection...');
            
            const response = await fetch(this.apiEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.categories && Array.isArray(data.categories)) {
                    console.log(`✅ Airtable serverless API connection successful - ${data.categories.length} categories available`);
                    return true;
                } else {
                    console.warn('⚠️ Airtable serverless API returned unexpected format');
                    return false;
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Airtable serverless API connection failed:', response.status, errorData.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Airtable connection error:', error);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AirtableIntegration;
} else {
    window.AirtableIntegration = AirtableIntegration;
}