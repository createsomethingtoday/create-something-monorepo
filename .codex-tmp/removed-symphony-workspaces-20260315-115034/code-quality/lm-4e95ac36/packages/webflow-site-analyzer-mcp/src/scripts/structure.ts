/**
 * Page Structure Extraction Script
 * 
 * Extracts the hierarchical structure of a page including sections,
 * navbar, footer, and Webflow-specific components.
 */

export const structureScript = `
(() => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  const documentHeight = document.documentElement.scrollHeight;
  
  let idCounter = 0;
  
  /**
   * Check if element is a Webflow component
   */
  function getWebflowInfo(el) {
    const classes = Array.from(el.classList || []);
    
    return {
      isNavbar: classes.some(c => c.includes('navbar') || c.includes('w-nav')),
      isFooter: classes.some(c => c.includes('footer')),
      isHero: classes.some(c => c.includes('hero')),
      webflowSymbol: el.getAttribute('data-w-id') || null
    };
  }
  
  /**
   * Extract section hierarchy
   */
  function extractSection(el, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return null;
    
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    
    // Skip hidden elements
    if (style.display === 'none' || style.visibility === 'hidden') {
      return null;
    }
    
    // Skip tiny elements
    if (rect.width < 50 || rect.height < 50) {
      return null;
    }
    
    const wfInfo = getWebflowInfo(el);
    
    // Find significant children (sections, divs with content)
    const significantTags = ['section', 'header', 'footer', 'main', 'article', 'aside', 'nav'];
    const children = [];
    
    Array.from(el.children).forEach(child => {
      const childTag = child.tagName.toLowerCase();
      const childClasses = Array.from(child.classList || []);
      
      // Include if it's a significant tag or has Webflow classes
      const isSignificant = significantTags.includes(childTag) ||
        childClasses.some(c => c.includes('section') || c.includes('container') || c.includes('wrapper')) ||
        child.hasAttribute('data-w-id');
      
      if (isSignificant) {
        const extracted = extractSection(child, depth + 1, maxDepth);
        if (extracted) {
          children.push(extracted);
        }
      }
    });
    
    return {
      id: el.id || ('section-' + (++idCounter)),
      tag: el.tagName.toLowerCase(),
      className: Array.from(el.classList || []).join(' ').slice(0, 200),
      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      depth,
      children,
      ...wfInfo
    };
  }
  
  // Start from body
  const body = document.body;
  const sections = [];
  let navbar = null;
  let footer = null;
  let mainContent = null;
  
  // Find top-level sections
  const topLevelSelectors = [
    'header', 'nav', 'main', 'footer',
    'section', '[role="banner"]', '[role="main"]', '[role="contentinfo"]',
    '.w-nav', '.section', '.hero-section'
  ];
  
  const topElements = document.querySelectorAll(topLevelSelectors.join(', '));
  const processed = new Set();
  
  topElements.forEach(el => {
    // Skip if already processed as child
    if (processed.has(el)) return;
    
    // Skip if parent is also in our list
    let parent = el.parentElement;
    while (parent && parent !== body) {
      if (processed.has(parent)) return;
      parent = parent.parentElement;
    }
    
    const section = extractSection(el, 0, 3);
    if (section) {
      processed.add(el);
      
      // Categorize special sections
      if (section.isNavbar && !navbar) {
        navbar = section;
      } else if (section.isFooter && !footer) {
        footer = section;
      } else if (section.tag === 'main' && !mainContent) {
        mainContent = section;
      }
      
      sections.push(section);
    }
  });
  
  // Sort sections by Y position
  sections.sort((a, b) => a.position.y - b.position.y);
  
  return {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    viewport,
    documentHeight,
    sections,
    navbar,
    footer,
    mainContent
  };
})()
`;
