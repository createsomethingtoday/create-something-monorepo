/**
 * OpenAI Integration for Webflow Search Agent
 * Uses AI to intelligently match search queries to relevant categories
 */

class OpenAIIntegration {
    constructor() {
        // Full serverless API endpoints
        this.selectApiEndpoint = 'https://wf-search-category.pages.dev/api/categories-select';
        this.suggestApiEndpoint = 'https://wf-search-category.pages.dev/api/categories-suggest';
        
        // Cache for performance
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours for AI responses
        this.lastFetch = null;
        
        console.log('🤖 OpenAI Integration initialized with serverless API');
    }

    /**
     * Use AI to intelligently find relevant categories from Airtable data
     */
    async findRelevantCategories(searchQuery, availableCategories) {
        try {
            console.log(`🧠 Using AI to analyze query: "${searchQuery}"`);
            
            // Check cache first
            const cacheKey = `${searchQuery.toLowerCase().trim()}_${availableCategories.length}`;
            if (this.cache.has(cacheKey) && this.isCacheValid()) {
                console.log('🧠📦 Using cached AI results');
                return this.cache.get(cacheKey);
            }

            // Prepare simplified category data for AI analysis (name + description only)
            const categoryData = availableCategories.map(cat => ({
                id: cat.id,
                name: cat.name,
                description: cat.description
            }));

            // Create AI prompt
            const prompt = this.buildAIPrompt(searchQuery, categoryData);

            const response = await fetch(this.selectApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    searchQuery,
                    availableCategories: categoryData
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('OpenAI API Error Details:', errorText);
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            
            // Handle serverless API response format
            let relevantCategories;
            if (data.categories && Array.isArray(data.categories)) {
                // Direct categories from serverless API - merge AI results with full Airtable data
                relevantCategories = data.categories
                    .map(aiResult => {
                        // Find the full category data from the original availableCategories
                        const fullCategory = availableCategories.find(cat => cat.id === aiResult.id);
                        if (fullCategory) {
                            return {
                                ...fullCategory,
                                relevance: aiResult.relevance || 0.8,
                                relevanceScore: aiResult.relevance || 0.8,
                                aiReason: aiResult.reason || 'AI selected category'
                            };
                        }
                        return null;
                    })
                    .filter(cat => cat !== null); // Remove any categories that couldn't be matched
            } else if (data.choices && data.choices[0]) {
                // OpenAI direct response format (fallback)
                const aiResponse = data.choices[0].message.content;
                relevantCategories = this.parseAIResponse(aiResponse, availableCategories);
            } else {
                throw new Error('Invalid response format from serverless API');
            }
            
            // Cache the results
            this.cache.set(cacheKey, relevantCategories);
            this.lastFetch = Date.now();
            
            console.log(`✅ AI found ${relevantCategories.length} relevant categories`);
            return relevantCategories;

        } catch (error) {
            console.error('❌ OpenAI error:', error);
            // Fallback to keyword matching if AI fails
            return this.fallbackCategoryMatching(searchQuery, availableCategories);
        }
    }

    /**
     * Build an effective prompt for AI category matching
     */
    buildAIPrompt(searchQuery, categoryData) {
        // Simplified category data formatting (name + description only)
        const formattedCategories = categoryData.map((cat, index) => {
            return `${index + 1}. "${cat.name}" (ID: ${cat.id})
   Description: ${cat.description}`;
        }).join('\n\n');

        return `
SEARCH QUERY: "${searchQuery}"

WEBSITE TEMPLATE CATEGORIES TO ANALYZE:
${formattedCategories}

TASK: You are helping someone find relevant website templates. Analyze the search query "${searchQuery}" and identify which categories would be most useful.

ANALYSIS GUIDELINES:
- Look for EXACT matches in category names and descriptions
- Consider semantic similarity (e.g., "party" relates to "wedding", "celebration", "event")  
- Think about website use cases (someone searching "party" might need event planning, wedding, celebration templates)
- Consider related business contexts (party planning, event coordination, etc.)

RESPONSE FORMAT: Return ONLY a valid JSON array with up to 6 most relevant categories, ordered by relevance:
[
  {"id": "rec123...", "relevance": 0.95, "reason": "Contains 'party' keyword and focuses on celebrations"},
  {"id": "rec456...", "relevance": 0.85, "reason": "Event planning category matches party organization needs"}
]

Be generous with matches - if names or descriptions contain related terms, include the category. Someone searching "${searchQuery}" is looking for practical website templates.
        `.trim();
    }

    /**
     * Parse AI response and match with original category data
     */
    parseAIResponse(aiResponse, availableCategories) {
        try {
            // Extract JSON from AI response
            const jsonMatch = aiResponse.match(/\[(.*?)\]/s);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }

            const aiResults = JSON.parse(`[${jsonMatch[1]}]`);
            
            // Match AI results with full category data
            const relevantCategories = aiResults
                .map(aiResult => {
                    const fullCategory = availableCategories.find(cat => cat.id === aiResult.id);
                    if (fullCategory) {
                        return {
                            ...fullCategory,
                            relevanceScore: aiResult.relevance,
                            aiReason: aiResult.reason
                        };
                    }
                    return null;
                })
                .filter(cat => cat !== null)
                .sort((a, b) => b.relevanceScore - a.relevanceScore);

            return relevantCategories;

        } catch (error) {
            console.error('Error parsing AI response:', error);
            console.log('AI Response:', aiResponse);
            
            // Fallback: try to extract category names from response
            return this.extractCategoriesFromText(aiResponse, availableCategories);
        }
    }

    /**
     * Extract category names from AI text response as fallback
     */
    extractCategoriesFromText(aiResponse, availableCategories) {
        const mentionedCategories = [];
        
        availableCategories.forEach(category => {
            const categoryName = category.name.toLowerCase();
            const responseText = aiResponse.toLowerCase();
            
            if (responseText.includes(categoryName)) {
                mentionedCategories.push({
                    ...category,
                    relevanceScore: 0.7, // Default score for text extraction
                    aiReason: 'Mentioned in AI response'
                });
            }
        });

        return mentionedCategories.slice(0, 6); // Limit to 6 categories
    }

    /**
     * Fallback to simple keyword matching if AI fails
     */
    fallbackCategoryMatching(searchQuery, availableCategories) {
        console.log('⚠️ Using enhanced fallback keyword matching');
        
        const query = searchQuery.toLowerCase().trim();
        const queryWords = query.split(' ').filter(word => word.length > 1);
        
        const scoredCategories = availableCategories.map(category => {
            let score = 0;
            
            // Check category name (highest weight)
            if (category.name && category.name.toLowerCase().includes(query)) {
                score += 0.9;
            }
            
            // Check description
            if (category.description && category.description.toLowerCase().includes(query)) {
                score += 0.7;
            }
            
            // Check keywords array (most important for matching)
            if (category.keywords && Array.isArray(category.keywords)) {
                const keywordString = category.keywords.join(' ').toLowerCase();
                
                // Exact query match in keywords
                if (keywordString.includes(query)) {
                    score += 0.95;
                }
                
                // Individual keyword matches
                category.keywords.forEach(keyword => {
                    const keywordLower = keyword.toLowerCase();
                    if (keywordLower === query) {
                        score += 1.0; // Exact keyword match
                    } else if (keywordLower.includes(query) || query.includes(keywordLower)) {
                        score += 0.8; // Partial keyword match
                    }
                });
                
                // Individual query word matches
                queryWords.forEach(word => {
                    category.keywords.forEach(keyword => {
                        const keywordLower = keyword.toLowerCase();
                        if (keywordLower === word) {
                            score += 0.4; // Exact word match
                        } else if (keywordLower.includes(word) || word.includes(keywordLower)) {
                            score += 0.2; // Partial word match
                        }
                    });
                });
            }
            
            // Check category group (handle both string and array formats)
            const categoryGroupText = Array.isArray(category.categoryGroup) 
                ? category.categoryGroup.join(' ').toLowerCase()
                : (category.categoryGroup || '').toString().toLowerCase();
            if (categoryGroupText.includes(query)) {
                score += 0.6;
            }
            
            // Semantic similarity bonuses for common searches
            const semanticMatches = {
                'party': ['event', 'wedding', 'celebration', 'birthday', 'anniversary'],
                'wedding': ['party', 'event', 'celebration', 'marriage', 'bride'],
                'business': ['corporate', 'professional', 'company', 'enterprise', 'office'],
                'food': ['restaurant', 'cafe', 'dining', 'menu', 'recipe', 'culinary'],
                'design': ['creative', 'art', 'agency', 'portfolio', 'graphics']
            };
            
            if (semanticMatches[query]) {
                const keywordString = Array.isArray(category.keywords) 
                    ? category.keywords.join(' ').toLowerCase()
                    : (category.keywords || '').toString().toLowerCase();
                const nameString = (category.name || '').toString().toLowerCase();
                const descString = (category.description || '').toString().toLowerCase();
                const categoryGroupString = Array.isArray(category.categoryGroup)
                    ? category.categoryGroup.join(' ').toLowerCase()
                    : (category.categoryGroup || '').toString().toLowerCase();
                const fullText = `${keywordString} ${nameString} ${descString} ${categoryGroupString}`;
                
                semanticMatches[query].forEach(semanticWord => {
                    if (fullText.includes(semanticWord)) {
                        score += 0.3;
                    }
                });
            }
            
            // Clamp to [0,1]
            score = Math.max(0, Math.min(1, score));
            return { ...category, relevance: score, relevanceScore: score };
        });
        
        const results = scoredCategories
            .filter(cat => cat.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 8); // Get more results for fallback
            
        console.log(`🔍 Fallback found ${results.length} matches for "${query}"`);
        results.forEach(cat => {
            console.log(`   • ${cat.name} (score: ${cat.relevanceScore.toFixed(2)})`);
        });
        
        return results.slice(0, 6); // Return top 6
    }

    /**
     * Generate AI-powered category suggestions using serverless API with intelligent fallback
     */
    async generateCategorySuggestions(searchQuery, businessContext = 'general') {
        try {
            console.log(`🤖 Attempting serverless API for query: "${searchQuery}"`);
            
            // Check cache first
            const cacheKey = `${searchQuery.toLowerCase().trim()}_${businessContext}`;
            if (this.cache.has(cacheKey) && this.isCacheValid()) {
                console.log('🤖📦 Using cached results');
                return this.cache.get(cacheKey);
            }

            const response = await fetch(this.suggestApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    searchQuery,
                    businessContext
                })
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            
            if (data.categories && Array.isArray(data.categories)) {
                console.log(`✅ Serverless API returned ${data.categories.length} categories`);
                
                // Cache the results
                this.cache.set(cacheKey, data.categories);
                this.lastFetch = Date.now();
                
                return data.categories;
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.warn('⚠️ Serverless API unavailable, using intelligent fallback:', error.message);
            return this.getWebflowCategorySuggestions(searchQuery);
        }
    }

    /**
     * Intelligent Webflow category suggestions using predefined categories
     */
    getWebflowCategorySuggestions(searchQuery) {
        console.log(`🧠 Using intelligent Webflow category selection for: "${searchQuery}"`);
        
        // Predefined Webflow template categories
        const webflowCategories = [
            "Accounting", "Agency", "Animals", "App", "Architecture", "Art", "Auto", "Band", "Beauty", 
            "Blog", "Business", "Charity", "Church", "Clothing", "Community", "Consulting", "Corporate", 
            "Creative", "Dance", "Dating", "Design", "Developer", "Directory", "E-commerce", "Education", 
            "Entertainment", "Event", "Fashion", "Finance", "Fitness", "Food", "Freelancer", "Gallery", 
            "Game", "Government", "Health", "Home", "Hotel", "Insurance", "Interior", "Jewelry", "Job", 
            "Landing", "Law", "Magazine", "Marketing", "Medical", "Music", "News", "Nonprofit", "One Page", 
            "Personal", "Photography", "Podcast", "Political", "Portfolio", "Product", "Real Estate", 
            "Restaurant", "Retail", "SaaS", "School", "Service", "Social", "Software", "Startup", 
            "Technology", "Travel", "Video", "Wedding", "Wellness"
        ];

        const query = searchQuery.toLowerCase().trim();
        
        // Enhanced semantic mapping for better category matching
        const semanticMap = {
            'party': ['Event', 'Wedding', 'Entertainment', 'Celebration'],
            'celebration': ['Event', 'Wedding', 'Party', 'Entertainment'],
            'wedding': ['Wedding', 'Event', 'Photography', 'Entertainment'],
            'business': ['Business', 'Corporate', 'Consulting', 'Agency', 'Professional'],
            'corporate': ['Corporate', 'Business', 'Consulting', 'Professional'],
            'professional': ['Business', 'Corporate', 'Consulting', 'Service'],
            'food': ['Restaurant', 'Food', 'Cafe', 'Catering'],
            'restaurant': ['Restaurant', 'Food', 'Hospitality'],
            'cafe': ['Restaurant', 'Food', 'Coffee'],
            'design': ['Design', 'Creative', 'Agency', 'Portfolio', 'Art'],
            'creative': ['Creative', 'Design', 'Agency', 'Portfolio', 'Art'],
            'portfolio': ['Portfolio', 'Creative', 'Design', 'Photography'],
            'shop': ['E-commerce', 'Retail', 'Product', 'Store'],
            'store': ['E-commerce', 'Retail', 'Product', 'Shop'],
            'ecommerce': ['E-commerce', 'Retail', 'Product'],
            'health': ['Health', 'Medical', 'Wellness', 'Fitness'],
            'medical': ['Medical', 'Health', 'Wellness', 'Healthcare'],
            'fitness': ['Fitness', 'Health', 'Wellness', 'Gym'],
            'wellness': ['Wellness', 'Health', 'Fitness', 'Spa'],
            'photo': ['Photography', 'Portfolio', 'Creative', 'Gallery'],
            'photography': ['Photography', 'Portfolio', 'Creative', 'Wedding'],
            'music': ['Music', 'Band', 'Entertainment', 'Audio'],
            'band': ['Band', 'Music', 'Entertainment'],
            'travel': ['Travel', 'Hotel', 'Tourism', 'Vacation'],
            'hotel': ['Hotel', 'Travel', 'Hospitality'],
            'education': ['Education', 'School', 'Learning', 'Training'],
            'school': ['School', 'Education', 'Learning'],
            'law': ['Law', 'Legal', 'Business', 'Professional'],
            'legal': ['Law', 'Legal', 'Business'],
            'real estate': ['Real Estate', 'Property', 'Business'],
            'property': ['Real Estate', 'Property', 'Business'],
            'tech': ['Technology', 'Software', 'SaaS', 'Startup', 'App'],
            'technology': ['Technology', 'Software', 'SaaS', 'Startup'],
            'software': ['Software', 'Technology', 'SaaS', 'App'],
            'app': ['App', 'Software', 'Technology', 'Mobile'],
            'startup': ['Startup', 'Technology', 'Business', 'SaaS'],
            'saas': ['SaaS', 'Software', 'Technology', 'Startup'],
            'nonprofit': ['Nonprofit', 'Charity', 'Community', 'Social'],
            'charity': ['Charity', 'Nonprofit', 'Community'],
            'church': ['Church', 'Religious', 'Community'],
            'fashion': ['Fashion', 'Clothing', 'Style', 'Beauty'],
            'clothing': ['Clothing', 'Fashion', 'Retail'],
            'beauty': ['Beauty', 'Fashion', 'Wellness', 'Spa'],
            'art': ['Art', 'Creative', 'Gallery', 'Portfolio'],
            'gallery': ['Gallery', 'Art', 'Photography', 'Creative'],
            'blog': ['Blog', 'News', 'Magazine', 'Personal'],
            'news': ['News', 'Blog', 'Magazine', 'Media'],
            'magazine': ['Magazine', 'News', 'Blog', 'Media'],
            'marketing': ['Marketing', 'Agency', 'Business', 'Digital'],
            'agency': ['Agency', 'Marketing', 'Creative', 'Business'],
            'consulting': ['Consulting', 'Business', 'Professional', 'Service'],
            'finance': ['Finance', 'Business', 'Accounting', 'Banking'],
            'accounting': ['Accounting', 'Finance', 'Business'],
            'insurance': ['Insurance', 'Finance', 'Business'],
            'home': ['Home', 'Interior', 'Real Estate', 'Design'],
            'interior': ['Interior', 'Home', 'Design', 'Architecture'],
            'architecture': ['Architecture', 'Design', 'Construction', 'Interior']
        };

        let matchedCategories = [];

        // Direct exact matches first (highest priority)
        for (const category of webflowCategories) {
            if (category.toLowerCase() === query || query.includes(category.toLowerCase())) {
                matchedCategories.push({
                    name: category,
                    slug: category.toLowerCase().replace(/\s+/g, '-'),
                    url: `https://webflow.com/templates/subcategory/${category.toLowerCase().replace(/\s+/g, '-')}`,
                    relevance: 0.95,
                    reason: `Direct match for "${category}"`
                });
            }
        }

        // Semantic matches (high priority)
        for (const [searchTerm, categories] of Object.entries(semanticMap)) {
            if (query.includes(searchTerm) || searchTerm.includes(query)) {
                for (const category of categories) {
                    if (webflowCategories.includes(category) && !matchedCategories.find(c => c.name === category)) {
                        matchedCategories.push({
                            name: category,
                            slug: category.toLowerCase().replace(/\s+/g, '-'),
                            url: `https://webflow.com/templates/subcategory/${category.toLowerCase().replace(/\s+/g, '-')}`,
                            relevance: 0.8,
                            reason: `Related to "${searchTerm}"`
                        });
                    }
                }
            }
        }

        // Partial word matches (medium priority)
        if (matchedCategories.length < 6) {
            const queryWords = query.split(' ').filter(word => word.length > 2);
            for (const word of queryWords) {
                for (const category of webflowCategories) {
                    if (category.toLowerCase().includes(word) && !matchedCategories.find(c => c.name === category)) {
                        matchedCategories.push({
                            name: category,
                            slug: category.toLowerCase().replace(/\s+/g, '-'),
                            url: `https://webflow.com/templates/subcategory/${category.toLowerCase().replace(/\s+/g, '-')}`,
                            relevance: 0.6,
                            reason: `Contains "${word}"`
                        });
                    }
                }
            }
        }

        // Default popular categories if no matches (fallback)
        if (matchedCategories.length === 0) {
            const defaultCategories = ['Business', 'Portfolio', 'Agency', 'Creative', 'Landing'];
            matchedCategories = defaultCategories.map(category => ({
                name: category,
                slug: category.toLowerCase(),
                url: `https://webflow.com/templates/subcategory/${category.toLowerCase()}`,
                relevance: 0.4,
                reason: 'Popular category'
            }));
        }

        // Sort by relevance and limit to 6
        const results = matchedCategories
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 6);

        console.log(`🧠 Selected ${results.length} Webflow categories:`);
        results.forEach(cat => {
            console.log(`   • ${cat.name} (relevance: ${cat.relevance.toFixed(2)}) - ${cat.reason}`);
        });

        return results;
    }

    /**
     * Legacy fallback suggestions for backward compatibility
     */
    getFallbackSuggestions(searchQuery) {
        const templates = {
            business: [
                { id: 'corporate', name: 'Corporate Templates', icon: '🏢', keywords: ['business', 'corporate', 'company'] },
                { id: 'startup', name: 'Startup Templates', icon: '🚀', keywords: ['startup', 'new business', 'entrepreneur'] },
                { id: 'consulting', name: 'Consulting Services', icon: '💼', keywords: ['consulting', 'professional', 'services'] }
            ],
            creative: [
                { id: 'portfolio', name: 'Portfolio Templates', icon: '🎨', keywords: ['portfolio', 'creative', 'artist'] },
                { id: 'photography', name: 'Photography Templates', icon: '📸', keywords: ['photography', 'photos', 'gallery'] },
                { id: 'design-agency', name: 'Design Agency', icon: '✨', keywords: ['design', 'agency', 'creative'] }
            ],
            ecommerce: [
                { id: 'online-store', name: 'Online Store Templates', icon: '🛒', keywords: ['store', 'shop', 'ecommerce'] },
                { id: 'marketplace', name: 'Marketplace Templates', icon: '🏪', keywords: ['marketplace', 'multi-vendor'] },
                { id: 'product-showcase', name: 'Product Showcase', icon: '📦', keywords: ['products', 'catalog', 'showcase'] }
            ]
        };

        // Try to match query to template category
        const query = searchQuery.toLowerCase();
        for (const [category, items] of Object.entries(templates)) {
            for (const item of items) {
                if (item.keywords.some(keyword => query.includes(keyword))) {
                    return templates[category].map(template => ({
                        ...template,
                        description: `Professional ${template.name.toLowerCase()} for your website`,
                        url: `/category/${template.id}`,
                        relevanceScore: 0.8
                    }));
                }
            }
        }

        // Default business templates
        return templates.business.map(template => ({
            ...template,
            description: `Professional ${template.name.toLowerCase()} for your website`,
            url: `/category/${template.id}`,
            relevanceScore: 0.6
        }));
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
        console.log('🤖🗑️ AI cache cleared');
    }

    /**
     * Test serverless API connection
     */
    async testConnection() {
        try {
            const response = await fetch(this.suggestApiEndpoint, { method: 'GET' });
            if (response.ok) {
                console.log('✅ Serverless API connection successful');
                return true;
            }
            console.error('❌ Serverless API connection failed:', response.status);
            return false;
        } catch (error) {
            console.error('❌ Serverless API connection error:', error);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenAIIntegration;
} else {
    window.OpenAIIntegration = OpenAIIntegration;
}