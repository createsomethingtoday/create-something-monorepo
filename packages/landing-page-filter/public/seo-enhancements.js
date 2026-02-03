/**
 * SEO Enhancements for Landing Page Category Filter
 * 
 * This script provides client-side SEO improvements for category and subcategory pages
 * while working within Webflow's constraints. Implements first principles solutions.
 * 
 * Used by: Landing Page Templates (full SEO content for "Landing Page" context)
 * For Free Templates page, use seo-enhancements-minimal.js instead.
 */

(function() {
  'use strict';
  
  // === CONFIGURATION ===
  var SEO_CONFIG = {
    DEBUG: true,
    BASE_TITLE: 'Landing Page Templates | Webflow',
    BASE_DESCRIPTION: 'Explore landing page templates in Webflow, built to drive conversions. Download and customize one-page landing page templates for your business.',
    CATEGORY_TITLE_TEMPLATE: '[Category] Landing Page Templates',
    CATEGORY_DESCRIPTION_TEMPLATE: 'Browse professionally designed [Category] landing page templates, fully customizable in Webflow. Build stunning, high-converting one-page websites — no code needed.',
    SUBCATEGORY_NOINDEX: true, // Add noindex to subcategory pages
    CANONICAL_SELF_REFERENCE: true, // Make canonical tags self-referencing
    SELECTORS: {
      titleBreadcrumb: '#title-breadcrumb',
      breadcrumbContainer: '.mp-breadcrumbs',
      dynamicBreadcrumb: '[data-dynamic-breadcrumb="true"]:not(.mp-breadcrumb-divider)',
      dynamicDivider: '[data-dynamic-breadcrumb="true"].mp-breadcrumb-divider',
      categoryTitle: '.h3',
      categoryDescription: '.u-text-gray600'
    }
  };

  // === CATEGORY SEO DATA ===
  var CATEGORY_SEO_DATA = {
    'architecture-design': {
      name: 'Architecture & Design',
      title: 'Architecture & Design Landing Page Templates',
      description: 'Unleash your creative vision with architecture and design landing page templates in Webflow, crafted for architects, interior designers, and design studios. Featuring immersive project galleries, intuitive navigation, and interactive visual elements, these templates are perfect for showcasing innovative spaces and compelling portfolios.'
    },
    'arts-entertainment': {
      name: 'Arts & Entertainment',
      title: 'Arts & Entertainment Landing Page Templates', 
      description: 'Elevate your brand with our arts and entertainment landing page templates in Webflow, crafted for artists, musicians, and event organizers. Designed to captivate audiences, these templates combine bold layouts, immersive visuals, and smooth social media integration. Ideal for promoting performances, exhibitions, and creative portfolios.'
    },
    'blog-editorial': {
      name: 'Blog & Editorial',
      title: 'Blog & Editorial Landing Page Templates',
      description: 'Inspire readers with blog and editorial landing page templates in Webflow, crafted for writers, journalists, and publishers. Featuring elegant typography, engaging blog-style layouts, and intuitive content management, these templates are perfect for personal blogs, online magazines, and editorial projects that demand both style and substance.'
    },
    'community-nonprofit': {
      name: 'Community & Nonprofit', 
      title: 'Community & Nonprofit Landing Page Templates',
      description: 'Empower your cause with our community and nonprofit landing page templates in Webflow, tailored for advocacy groups and charitable organizations. With impactful storytelling tools, integrated donation options, and volunteer sign-up capabilities, these templates are ideal for raising awareness, rallying support, and strengthening community connections.'
    },
    'documentation': {
      name: 'Documentation',
      title: 'Documentation Landing Page Templates',
      description: 'Streamline user guidance with documentation landing page templates in Webflow, ideal for tech companies and product teams. Featuring structured layouts, responsive design, and intuitive navigation, these templates are perfect for presenting user manuals, API documentation, and technical support content clearly and effectively.'
    },
    'education': {
      name: 'Education',
      title: 'Education Landing Page Templates',
      description: 'Transform learning experiences with education landing page templates in Webflow, designed for schools, tutors, and online course creators. Featuring vibrant visuals, interactive course catalogs, and seamless enrollment forms, these templates are perfect for showcasing educational programs and driving student engagement.'
    },
    'environment': {
      name: 'Environment',
      title: 'Environment Landing Page Templates', 
      description: 'Champion sustainability with our environment landing page templates in Webflow, designed for eco-conscious organizations and green initiatives. These templates combine striking visuals, compelling narrative sections, and built-in fundraising tools, ideal for advancing conservation efforts and inspiring environmental action.'
    },
    'food-drink': {
      name: 'Food & Drink',
      title: 'Food & Drink Landing Page Templates',
      description: 'Delight taste buds with food and drink landing page templates in Webflow, crafted for restaurants, cafes, and food bloggers. Featuring appetizing image galleries, interactive menus, and online reservation forms, these templates are perfect for showcasing culinary creations and attracting food enthusiasts.'
    },
    'hair-beauty': {
      name: 'Hair & Beauty',
      title: 'Hair & Beauty Landing Page Templates',
      description: 'Elevate your brand with hair and beauty landing page templates in Webflow, ideal for salons, stylists, and beauty brands. With sleek designs, vibrant lookbooks, and built-in appointment booking, these templates are perfect for showcasing services and highlighting the latest beauty trends.'
    },
    'home-services': {
      name: 'Home Services',
      title: 'Home Services Landing Page Templates',
      description: 'Enhance your business presence with home services landing page templates in Webflow, tailored for contractors, cleaners, and repair specialists. Designed to highlight service offerings, build trust through client testimonials, and simplify appointment scheduling, these templates are ideal for attracting new clients and growing your local business.'
    },
    'hr-hiring': {
      name: 'HR & Hiring',
      title: 'HR & Hiring Landing Page Templates',
      description: 'Streamline recruitment with HR and hiring landing page templates in Webflow, crafted for HR professionals and staffing agencies. Designed to present job openings clearly, collect candidate information efficiently, and highlight company culture, these templates are perfect for attracting top talent and optimizing your hiring process.'
    },
    'launch-coming-soon': {
      name: 'Launch & Coming Soon',
      title: 'Launch & Coming Soon Landing Page Templates',
      description: 'Create anticipation with our launch and coming soon landing page templates in Webflow, perfect for startups, product debuts, and upcoming events. Engage your audience with countdowns, teaser content, and lead capture forms, everything you need to build buzz and grow your early access list.'
    },
    'medical': {
      name: 'Medical',
      title: 'Medical Landing Page Templates',
      description: 'Enhance patient care with medical landing page templates in Webflow, designed for clinics, doctors, and healthcare providers. Showcase your services with intuitive appointment booking, clear treatment overviews, and real patient testimonials, ideal for establishing trust and improving patient engagement.'
    },
    'music-audio': {
      name: 'Music & Audio',
      title: 'Music & Audio Landing Page Templates',
      description: 'Amplify your sound with music and audio landing page templates in Webflow, tailored for musicians, bands, and producers. Share your latest tracks with immersive audio players, highlight upcoming shows, and drive sales with built-in merch options. Perfect for connecting with fans and growing your audience.'
    },
    'personal': {
      name: 'Personal',
      title: 'Personal Landing Page Templates',
      description: 'Showcase your unique story with personal landing page templates in Webflow, perfect for freelancers, artists, and entrepreneurs. Highlight your work through customized portfolios, share your journey with compelling bio sections, and make meaningful connections with built-in contact tools. All designed to elevate your personal brand.'
    },
    'portfolio-agency': {
      name: 'Portfolio & Agency',
      title: 'Portfolio & Agency Landing Page Templates',
      description: 'Elevate your projects with our portfolio and agency landing page templates in Webflow, tailored for creatives and design agencies. Showcase your best work with visually striking portfolios, build trust with client testimonials, and attract new business through compelling project presentations.'
    },
    'professional-services': {
      name: 'Professional Services',
      title: 'Professional Services Landing Page Templates',
      description: 'Enhance your practice with professional services landing page templates in Webflow, tailored for consultants, legal professionals, and financial advisors. Present your offerings with detailed service pages, build credibility through client testimonials, and simplify communication with secure contact forms.'
    },
    'real-estate': {
      name: 'Real Estate',
      title: 'Real Estate Landing Page Templates',
      description: 'Boost property visibility with real estate landing page templates in Webflow, ideal for agents and brokers. Highlight listings through interactive galleries, offer immersive virtual tours, and generate leads with built-in inquiry forms. Perfect for turning interest into sales.'
    },
    'retail-e-commerce': {
      name: 'Retail & E-Commerce',
      title: 'Retail & E-Commerce Landing Page Templates',
      description: 'Drive sales with retail and ecommerce landing page templates in Webflow, crafted for online shops and modern retailers. Showcase products with bold visuals, streamline the buyer journey with intuitive checkout, and build trust through customer reviews, perfect for maximizing conversions and enhancing the shopping experience.'
    },
    'technology': {
      name: 'Technology',
      title: 'Technology Landing Page Templates',
      description: 'Innovate your online presence with technology landing page templates in Webflow, ideal for startups and software developers. Designed with sleek layouts, interactive product demos, and compelling feature breakdowns, these templates are perfect for presenting cutting-edge solutions and capturing the attention of potential clients.'
    },
    'transportation': {
      name: 'Transportation',
      title: 'Transportation Landing Page Templates',
      description: 'Streamline your services with transportation landing page templates in Webflow, tailored for logistics firms and transit providers. With interactive route maps, detailed service schedules, and easy-to-use booking forms, these templates help boost customer engagement and promote efficient transportation solutions.'
    },
    'travel': {
      name: 'Travel',
      title: 'Travel Landing Page Templates',
      description: 'Ignite wanderlust with travel landing page templates in Webflow, perfect for travel agencies and tour operators. Showcase breathtaking destinations, outline detailed itineraries, and simplify trip planning with built-in booking tools, everything you need to captivate and convert adventure seekers.'
    },
    'ui-kit': {
      name: 'UI Kit',
      title: 'UI Kit Landing Page Templates',
      description: 'Accelerate your workflow with UI kit landing page templates in Webflow, ideal for designers and developers. Built with reusable components, consistent design systems, and interactive elements, these templates make it easy to craft cohesive user interfaces and speed up project delivery.'
    },
    'weddings-events': {
      name: 'Weddings & Events',
      title: 'Weddings & Events Landing Page Templates',
      description: 'Celebrate in style with weddings and events landing page templates in Webflow, crafted for planners and venues. With elegant photo galleries, RSVP functionality, and organized event schedules, these templates are perfect for showcasing unforgettable moments and keeping guests informed.'
    },
    'wellness': {
      name: 'Wellness',
      title: 'Wellness Landing Page Templates',
      description: 'Promote holistic health with our wellness landing page templates in Webflow, ideal for wellness centers and coaches. With calming design elements, clear service descriptions, and integrated booking tools, these templates are perfect for highlighting wellness programs and connecting with clients seeking balance and renewal.'
    }
  };
  
  // === UTILITIES ===
  function log(message, data) {
    if (SEO_CONFIG.DEBUG) {
      console.log('[SEO-Enhancements]', message, data || '');
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

  function convertToSlug(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[&]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getCategoryDataBySlug(categorySlug) {
    return CATEGORY_SEO_DATA[categorySlug] || null;
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
  function updatePageTitle() {
    var pageType = getCurrentPageType();
    var newTitle = SEO_CONFIG.BASE_TITLE;
    
    if (pageType.type === 'category') {
      var categoryName = formatCategoryName(pageType.category);
      newTitle = SEO_CONFIG.CATEGORY_TITLE_TEMPLATE.replace('[Category]', categoryName);
      log('Updated page title for category:', categoryName);
    } else if (pageType.type === 'subcategory') {
      var categoryName = formatCategoryName(pageType.category);
      var subcategoryName = formatCategoryName(pageType.subcategory);
      newTitle = categoryName + ' - ' + subcategoryName + ' Landing Page Templates | Webflow';
      log('Updated page title for subcategory:', subcategoryName);
    }
    
    document.title = newTitle;
  }
  
  function updateMetaDescription() {
    var pageType = getCurrentPageType();
    var metaDescription = document.querySelector('meta[name="description"]');
    
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    
    var newDescription = SEO_CONFIG.BASE_DESCRIPTION;
    
    if (pageType.type === 'category') {
      var categorySlug = convertToSlug(pageType.category);
      var categoryData = getCategoryDataBySlug(categorySlug);
      
      if (categoryData) {
        newDescription = categoryData.description;
        log('Updated meta description for category:', categoryData.name);
      } else {
        var categoryName = formatCategoryName(pageType.category);
        newDescription = SEO_CONFIG.CATEGORY_DESCRIPTION_TEMPLATE.replace('[Category]', categoryName);
        log('Updated meta description for category (fallback):', categoryName);
      }
    } else if (pageType.type === 'subcategory') {
      var categoryName = formatCategoryName(pageType.category);
      var subcategoryName = formatCategoryName(pageType.subcategory);
      newDescription = 'Browse professionally designed ' + categoryName + ' - ' + subcategoryName + ' landing page templates, fully customizable in Webflow. Build stunning, high-converting one-page websites — no code needed.';
      log('Updated meta description for subcategory:', subcategoryName);
    }
    
    metaDescription.setAttribute('content', newDescription);
  }
  
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
  
  function updateCategoryDescription() {
    var pageType = getCurrentPageType();
    var elements = {
      categoryTitle: document.querySelector(SEO_CONFIG.SELECTORS.categoryTitle),
      categoryDescription: document.querySelector(SEO_CONFIG.SELECTORS.categoryDescription)
    };

    log('Current page type:', pageType);
    log('Found elements:', Object.keys(elements).filter(key => elements[key]).join(', '));
    
    if (pageType.type === 'category') {
      var categorySlug = convertToSlug(pageType.category);
      var categoryData = getCategoryDataBySlug(categorySlug);
      
      if (categoryData) {
        log('Updating content for category:', categoryData.name);
        
        // Update page title (H1)
        if (elements.categoryTitle) {
          elements.categoryTitle.textContent = categoryData.title;
          log('✅ Updated page title:', categoryData.title);
        }
        
        // Update and show description with custom content
        if (elements.categoryDescription) {
          elements.categoryDescription.textContent = categoryData.description;
          elements.categoryDescription.style.display = 'block';
          log('✅ Updated and displayed custom description');
        }
      } else {
        log('⚠️ No category data found for slug:', categorySlug);
        // Show description but keep original content if no custom data available
        if (elements.categoryDescription) {
          elements.categoryDescription.style.display = 'block';
        }
      }
      
    } else if (pageType.type === 'subcategory') {
      // Subcategory - hide description
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
    updatePageTitle();
    updateMetaDescription();
    updateCanonicalUrl();
    addNoindexForSubcategories();
    updateCategoryDescription();
  }
  
  // === INITIALIZATION ===
  function init() {
    log('SEO Enhancements initializing...');
    
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
    
    log('SEO Enhancements initialized successfully');
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
  log('🚀 SEO Enhancements v1.0 starting...');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
