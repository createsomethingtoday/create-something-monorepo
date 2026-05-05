/**
 * SEO Extraction Script
 * 
 * Extracts SEO-relevant data including meta tags, headings, links,
 * images, and structured data.
 */

export const seoScript = `
(() => {
  const issues = [];
  const recommendations = [];
  
  // ==========================================================================
  // Meta Tags
  // ==========================================================================
  
  const title = document.title || '';
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const description = descriptionMeta?.getAttribute('content') || '';
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const canonical = canonicalLink?.getAttribute('href') || null;
  
  // All meta tags
  const metaTags = Array.from(document.querySelectorAll('meta')).map(meta => ({
    name: meta.getAttribute('name'),
    property: meta.getAttribute('property'),
    content: meta.getAttribute('content') || ''
  })).filter(m => m.name || m.property);
  
  // Open Graph
  const openGraph = {};
  document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
    const key = meta.getAttribute('property').replace('og:', '');
    openGraph[key] = meta.getAttribute('content');
  });
  
  // Twitter Card
  const twitterCard = {};
  document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
    const key = meta.getAttribute('name').replace('twitter:', '');
    twitterCard[key] = meta.getAttribute('content');
  });
  
  // ==========================================================================
  // Heading Structure
  // ==========================================================================
  
  const headings = [];
  let order = 0;
  
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    document.querySelectorAll(tag).forEach(el => {
      headings.push({
        tag,
        text: (el.textContent || '').trim().slice(0, 200),
        level: parseInt(tag.charAt(1)),
        order: order++
      });
    });
  });
  
  // Sort by document order
  headings.sort((a, b) => a.order - b.order);
  
  const h1Count = headings.filter(h => h.tag === 'h1').length;
  
  // ==========================================================================
  // Links
  // ==========================================================================
  
  const links = Array.from(document.querySelectorAll('a[href]'));
  const hostname = window.location.hostname;
  
  let internalLinks = 0;
  let externalLinks = 0;
  const brokenLinks = [];
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    
    try {
      const url = new URL(href, window.location.origin);
      if (url.hostname === hostname || url.hostname === '') {
        internalLinks++;
      } else {
        externalLinks++;
      }
    } catch {
      // Invalid URL
      brokenLinks.push(href);
    }
  });
  
  // ==========================================================================
  // Images
  // ==========================================================================
  
  const images = Array.from(document.querySelectorAll('img'));
  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;
  let decorativeImages = 0;
  
  images.forEach(img => {
    if (img.hasAttribute('alt')) {
      imagesWithAlt++;
      if (img.getAttribute('alt') === '') {
        decorativeImages++;
      }
    } else {
      imagesWithoutAlt++;
    }
  });
  
  // ==========================================================================
  // Technical SEO
  // ==========================================================================
  
  // Robots meta
  const robotsMeta = document.querySelector('meta[name="robots"]');
  const hasRobotsMeta = !!robotsMeta;
  const robotsContent = robotsMeta?.getAttribute('content') || '';
  const isIndexable = !robotsContent.includes('noindex');
  
  // Structured Data
  const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
  const hasStructuredData = structuredDataScripts.length > 0;
  const structuredDataTypes = [];
  
  structuredDataScripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '{}');
      if (data['@type']) {
        structuredDataTypes.push(data['@type']);
      }
    } catch {
      // Invalid JSON-LD
    }
  });
  
  // ==========================================================================
  // Issues & Recommendations
  // ==========================================================================
  
  // Title issues
  if (!title) {
    issues.push({ severity: 'error', code: 'MISSING_TITLE', message: 'Page has no title tag' });
  } else if (title.length < 30) {
    issues.push({ severity: 'warning', code: 'SHORT_TITLE', message: 'Title is too short (< 30 chars)', element: title });
  } else if (title.length > 60) {
    issues.push({ severity: 'warning', code: 'LONG_TITLE', message: 'Title is too long (> 60 chars)', element: title });
  }
  
  // Description issues
  if (!description) {
    issues.push({ severity: 'error', code: 'MISSING_DESCRIPTION', message: 'Page has no meta description' });
  } else if (description.length < 70) {
    issues.push({ severity: 'warning', code: 'SHORT_DESCRIPTION', message: 'Meta description is too short (< 70 chars)' });
  } else if (description.length > 160) {
    issues.push({ severity: 'warning', code: 'LONG_DESCRIPTION', message: 'Meta description is too long (> 160 chars)' });
  }
  
  // H1 issues
  if (h1Count === 0) {
    issues.push({ severity: 'error', code: 'MISSING_H1', message: 'Page has no H1 heading' });
  } else if (h1Count > 1) {
    issues.push({ severity: 'warning', code: 'MULTIPLE_H1', message: 'Page has multiple H1 headings (' + h1Count + ')' });
  }
  
  // Canonical issues
  if (!canonical) {
    issues.push({ severity: 'info', code: 'MISSING_CANONICAL', message: 'Page has no canonical URL' });
    recommendations.push('Add a canonical URL to prevent duplicate content issues');
  }
  
  // Image issues
  if (imagesWithoutAlt > 0) {
    issues.push({ 
      severity: 'warning', 
      code: 'IMAGES_WITHOUT_ALT', 
      message: imagesWithoutAlt + ' image(s) missing alt attribute'
    });
  }
  
  // Open Graph issues
  if (!openGraph.title || !openGraph.description || !openGraph.image) {
    issues.push({ 
      severity: 'warning', 
      code: 'INCOMPLETE_OG', 
      message: 'Open Graph tags are incomplete (missing ' + 
        [!openGraph.title && 'title', !openGraph.description && 'description', !openGraph.image && 'image']
          .filter(Boolean).join(', ') + ')' 
    });
    recommendations.push('Complete Open Graph tags for better social sharing');
  }
  
  // Structured data recommendations
  if (!hasStructuredData) {
    recommendations.push('Add structured data (JSON-LD) for rich search results');
  }
  
  // ==========================================================================
  // Calculate Score
  // ==========================================================================
  
  let score = 100;
  
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'error': score -= 15; break;
      case 'warning': score -= 5; break;
      case 'info': score -= 2; break;
    }
  });
  
  score = Math.max(0, score);
  
  return {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    title,
    description,
    canonical,
    metaTags,
    openGraph,
    twitterCard,
    headings,
    h1Count,
    internalLinks,
    externalLinks,
    brokenLinks,
    imagesWithAlt,
    imagesWithoutAlt,
    decorativeImages,
    hasRobotsMeta,
    isIndexable,
    hasStructuredData,
    structuredDataTypes,
    score,
    issues,
    recommendations
  };
})()
`;
