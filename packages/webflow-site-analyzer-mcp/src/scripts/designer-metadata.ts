/**
 * Designer Metadata Extraction Script
 * 
 * Extracts template metadata from Webflow Designer Preview:
 * - Pages and their structure
 * - CSS Classes (Style Selectors)
 * - Components with usage counts
 * - Interactions (animations)
 * - CMS Collections
 * - Assets
 * 
 * NOTE: Some features (Variables, Audit for unused classes) require
 * full Designer access and are not available in Preview mode.
 */

export interface DesignerMetadata {
  pages: PageInfo[];
  styleClasses: StyleClassInfo[];
  components: ComponentInfo[];
  interactions: InteractionInfo[];
  cmsCollections: CMSCollectionInfo[];
  assets: AssetInfo[];
  siteInfo: SiteInfo;
}

export interface PageInfo {
  name: string;
  type: 'static' | 'cms-template' | 'ecommerce' | 'utility' | 'user';
  category?: string;
}

export interface StyleClassInfo {
  name: string;
  isGlobal: boolean;  // "All H1 Headings" vs custom classes
}

export interface ComponentInfo {
  name: string;
  instanceCount: number;
  isUnused: boolean;
}

export interface InteractionInfo {
  trigger: string;
  targetElement: string;
  type: 'page-load' | 'element-trigger' | 'scroll' | 'other';
}

export interface CMSCollectionInfo {
  name: string;
  itemCount: number;
}

export interface AssetInfo {
  // Legacy field name retained for compatibility. This is the visible label
  // captured from the Designer Assets panel and may be truncated with an ellipsis.
  filename: string;
  type: 'image' | 'svg' | 'video' | 'other';
  captureSource?: 'designer-assets-panel';
  isTruncated?: boolean;
}

export interface SiteInfo {
  name: string;
  plan: string;
  breakpoints: string[];
}

/**
 * Script to extract pages from Webflow Designer (P key panel)
 */
export const extractPagesScript = `
(function() {
  const pages = [];
  const pagePatterns = {
    'Innerpages': 'static',
    'Template Pages': 'static',
    'CMS collection pages': 'cms-template',
    'Ecommerce pages': 'ecommerce',
    'Utility pages': 'utility',
    'User pages': 'user'
  };
  
  let currentCategory = 'static';
  
  document.querySelectorAll('*').forEach(el => {
    if (el.closest('#site-iframe-next')) return;
    const text = el.textContent?.trim() || '';
    
    // Check if this is a category header
    for (const [cat, type] of Object.entries(pagePatterns)) {
      if (text === cat) {
        currentCategory = cat;
      }
    }
    
    // Check if this is a page name (starts with emoji)
    if ((text.startsWith('📋') || text.startsWith('🖍') || text.startsWith('⭐') || 
         text.startsWith('🔐') || text.startsWith('👀')) && text.length < 50 && !text.includes('\\n')) {
      const pageName = text.replace(/^[📋🖍⭐🔐👀]/, '').trim();
      if (pageName) {
        pages.push({
          name: pageName,
          type: pagePatterns[currentCategory] || 'static',
          category: currentCategory
        });
      }
    }
    
    // Also catch pages without emoji
    if (text.match(/^(Products|Categories|Checkout|Order Confirmation|Search Results)/) && 
        !text.includes(' ') && text.length < 30) {
      pages.push({
        name: text,
        type: 'ecommerce',
        category: 'Ecommerce pages'
      });
    }
  });
  
  return pages.filter((p, i, arr) => 
    arr.findIndex(x => x.name === p.name) === i
  );
})()
`;

/**
 * Script to extract CSS classes from Style Selectors panel (G key)
 */
export const extractStyleClassesScript = `
(function() {
  const classes = [];
  const globalPatterns = ['All H1', 'All H2', 'All H3', 'All H4', 'All H5', 'All H6', 
                          'All Paragraphs', 'All Unordered', 'All List Items', 'Body (All'];
  
  document.querySelectorAll('*').forEach(el => {
    if (el.closest('#site-iframe-next')) return;
    const text = el.textContent?.trim() || '';
    
    // Look for class-like names in Style Selectors panel
    if (text.length > 2 && text.length < 60 && 
        (text.includes(' / ') || text.includes('-') || /^[A-Z]/.test(text)) &&
        !text.includes('Webflow') && !text.includes('Sign up') && !text.includes('Try it')) {
      
      const isGlobal = globalPatterns.some(p => text.includes(p));
      
      // Filter out UI elements
      if (!['Design', 'CMS', 'Insights', 'Share', 'Publish', 'Style', 'Settings', 
            'Interactions', 'Style selector', 'None', 'Desktop', 'This site was'].some(ui => text.includes(ui))) {
        classes.push({
          name: text,
          isGlobal
        });
      }
    }
  });
  
  return classes.filter((c, i, arr) => 
    arr.findIndex(x => x.name === c.name) === i
  );
})()
`;

/**
 * Script to extract components from Components panel (Shift+A)
 */
export const extractComponentsScript = `
(function() {
  const components = [];
  
  document.querySelectorAll('*').forEach(el => {
    if (el.closest('#site-iframe-next')) return;
    const text = el.textContent?.trim() || '';
    
    // Look for "Component Name X instances" pattern
    const match = text.match(/^(.+?)(\\d+)\\s*instances?$/);
    if (match) {
      components.push({
        name: match[1].trim(),
        instanceCount: parseInt(match[2], 10),
        isUnused: parseInt(match[2], 10) === 0
      });
    }
  });
  
  return components.filter((c, i, arr) => 
    arr.findIndex(x => x.name === c.name) === i
  );
})()
`;

/**
 * Script to extract interactions from Interactions panel (H key)
 */
export const extractInteractionsScript = `
(function() {
  const interactions = [];
  
  document.querySelectorAll('*').forEach(el => {
    if (el.closest('#site-iframe-next')) return;
    const text = el.textContent?.trim() || '';
    
    // Look for "Trigger Type Element Name" patterns
    if (text.includes('Page load') && text.includes(' / ')) {
      const parts = text.split('Page load');
      if (parts[1]) {
        interactions.push({
          trigger: 'Page load',
          targetElement: parts[1].trim().replace(' / <none>', '').replace('<none>', ''),
          type: 'page-load'
        });
      }
    }
    
    // Element triggers
    if (text.includes('On hover') || text.includes('On click') || text.includes('On scroll')) {
      interactions.push({
        trigger: text.split(' ')[0] + ' ' + text.split(' ')[1],
        targetElement: text.split(' ').slice(2).join(' '),
        type: 'element-trigger'
      });
    }
  });
  
  return interactions.filter((i, idx, arr) => 
    arr.findIndex(x => x.targetElement === i.targetElement && x.trigger === i.trigger) === idx
  );
})()
`;

/**
 * Script to extract CMS collections (CMS tab)
 */
export const extractCMSCollectionsScript = `
(function() {
  const collections = [];
  
  document.querySelectorAll('*').forEach(el => {
    if (el.closest('#site-iframe-next')) return;
    const text = el.textContent?.trim() || '';
    
    // Look for "📋CollectionName X items" pattern
    const match = text.match(/^📋(.+?)(\\d+)\\s*items?$/);
    if (match) {
      collections.push({
        name: match[1].trim(),
        itemCount: parseInt(match[2], 10)
      });
    }
  });
  
  return collections;
})()
`;

/**
 * Script to extract assets (J key)
 */
export const extractAssetsScript = `
(function() {
  const assets = [];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
  const svgExt = 'svg';
  const videoExts = ['mp4', 'webm'];
  
  document.querySelectorAll('*').forEach(el => {
    if (el.closest('#site-iframe-next')) return;
    const text = el.textContent?.trim() || '';
    
    // Look for visible asset labels like "nurt...e.jpg"
    if (text.match(/\\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm)$/i)) {
      const ext = text.split('.').pop()?.toLowerCase() || '';
      let type = 'other';
      if (imageExts.includes(ext)) type = 'image';
      else if (ext === svgExt) type = 'svg';
      else if (videoExts.includes(ext)) type = 'video';
      
      assets.push({
        filename: text,
        type,
        captureSource: 'designer-assets-panel',
        isTruncated: text.includes('…') || text.includes('...')
      });
    }
  });
  
  return assets.filter((a, i, arr) => 
    arr.findIndex(x => x.filename === a.filename) === i
  );
})()
`;

/**
 * Script to extract site info
 */
export const extractSiteInfoScript = `
(function() {
  const info = {
    name: '',
    plan: 'Unknown',
    breakpoints: []
  };
  
  // Get site name from title
  const title = document.title || '';
  if (title.includes(' - ')) {
    info.name = title.split(' - ').pop() || '';
  }
  
  // Get plan from settings
  document.querySelectorAll('*').forEach(el => {
    if (el.closest('#site-iframe-next')) return;
    const text = el.textContent?.trim() || '';
    
    if (text.includes('Starter') || text.includes('Basic') || text.includes('CMS') || 
        text.includes('Business') || text.includes('Enterprise')) {
      if (text.length < 20) {
        info.plan = text;
      }
    }
  });
  
  // Get breakpoints from aria-labels
  document.querySelectorAll('[aria-label]').forEach(el => {
    const label = el.getAttribute('aria-label') || '';
    if (label.includes('breakpoint') || label.includes('px and down')) {
      info.breakpoints.push(label);
    }
  });
  
  return info;
})()
`;

/**
 * Combined script that collects all metadata
 */
export const designerMetadataScript = `
(function() {
  // Collect all unique text elements not in iframe
  function getUITexts() {
    const texts = [];
    document.querySelectorAll('*').forEach(el => {
      if (!el.closest('#site-iframe-next') && !el.closest('script') && !el.closest('style')) {
        const text = el.textContent?.trim();
        if (text && text.length > 2 && text.length < 200) {
          texts.push(text);
        }
      }
    });
    return [...new Set(texts)];
  }
  
  // Get aria-labels
  function getAriaLabels() {
    const labels = [];
    document.querySelectorAll('[aria-label]').forEach(el => {
      if (!el.closest('#site-iframe-next')) {
        labels.push(el.getAttribute('aria-label'));
      }
    });
    return labels;
  }
  
  return {
    uiTexts: getUITexts(),
    ariaLabels: getAriaLabels(),
    title: document.title
  };
})()
`;
