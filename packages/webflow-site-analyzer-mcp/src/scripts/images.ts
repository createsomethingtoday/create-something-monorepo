/**
 * Image Analysis Script
 * 
 * Extracts image information including dimensions, alt text, loading strategy,
 * and optimization recommendations.
 */

export const imagesScript = `
(() => {
  const recommendations = [];
  
  /**
   * Detect image format from URL
   */
  function getImageFormat(src) {
    if (!src) return 'unknown';
    const url = src.toLowerCase();
    
    if (url.includes('.webp')) return 'webp';
    if (url.includes('.avif')) return 'avif';
    if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpeg';
    if (url.includes('.png')) return 'png';
    if (url.includes('.gif')) return 'gif';
    if (url.includes('.svg')) return 'svg';
    if (url.includes('data:image/')) {
      const match = url.match(/data:image\\/(\\w+)/);
      return match ? match[1] : 'data-uri';
    }
    
    // Webflow CDN images
    if (url.includes('uploads-ssl.webflow.com')) {
      return url.split('.').pop().split('?')[0] || 'unknown';
    }
    
    return 'unknown';
  }
  
  /**
   * Check if image is optimized
   */
  function isOptimized(img, format) {
    const issues = [];
    
    // Check for modern format
    if (!['webp', 'avif', 'svg'].includes(format)) {
      issues.push('Not using modern format (WebP/AVIF)');
    }
    
    // Check for lazy loading
    if (img.loading !== 'lazy') {
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight) {
        issues.push('Below fold but not lazy loaded');
      }
    }
    
    // Check for explicit dimensions
    if (!img.width && !img.height && !img.style.width && !img.style.height) {
      const computedStyle = window.getComputedStyle(img);
      if (computedStyle.width === 'auto' || computedStyle.height === 'auto') {
        issues.push('No explicit dimensions (causes layout shift)');
      }
    }
    
    // Check for oversized images
    if (img.naturalWidth > 0 && img.width > 0) {
      const ratio = img.naturalWidth / img.width;
      if (ratio > 2) {
        issues.push('Image is ' + Math.round(ratio) + 'x larger than displayed');
      }
    }
    
    return {
      isOptimized: issues.length === 0,
      issues
    };
  }
  
  // Process all images
  const images = Array.from(document.querySelectorAll('img')).map((img, idx) => {
    const format = getImageFormat(img.src || img.currentSrc);
    const rect = img.getBoundingClientRect();
    const optimization = isOptimized(img, format);
    
    return {
      src: img.src || img.currentSrc || '',
      alt: img.getAttribute('alt') || '',
      hasAltAttribute: img.hasAttribute('alt'),
      isDecorative: img.hasAttribute('alt') && img.getAttribute('alt') === '',
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      naturalWidth: img.naturalWidth || 0,
      naturalHeight: img.naturalHeight || 0,
      loading: img.loading || 'auto',
      format,
      fileSize: null, // Would need fetch to determine
      isOptimized: optimization.isOptimized,
      issues: optimization.issues
    };
  });
  
  // Count by format
  const byFormat = images.reduce((acc, img) => {
    acc[img.format] = (acc[img.format] || 0) + 1;
    return acc;
  }, {});
  
  // Calculate optimization score
  const optimizedCount = images.filter(img => img.isOptimized).length;
  const optimizationScore = images.length > 0 
    ? Math.round((optimizedCount / images.length) * 100) 
    : 100;
  
  // Generate recommendations
  const nonModernFormats = images.filter(img => 
    !['webp', 'avif', 'svg'].includes(img.format) && img.format !== 'unknown'
  );
  if (nonModernFormats.length > 0) {
    recommendations.push('Convert ' + nonModernFormats.length + ' image(s) to WebP for better compression');
  }
  
  const noLazyLoad = images.filter(img => img.loading !== 'lazy');
  const belowFoldNoLazy = noLazyLoad.filter(img => {
    const imgEl = document.querySelector('img[src="' + img.src + '"]');
    if (!imgEl) return false;
    return imgEl.getBoundingClientRect().top > window.innerHeight;
  });
  if (belowFoldNoLazy.length > 0) {
    recommendations.push('Add lazy loading to ' + belowFoldNoLazy.length + ' below-fold image(s)');
  }
  
  const oversized = images.filter(img => 
    img.naturalWidth > 0 && img.width > 0 && (img.naturalWidth / img.width) > 2
  );
  if (oversized.length > 0) {
    recommendations.push('Resize ' + oversized.length + ' oversized image(s) to match display dimensions');
  }
  
  const missingAlt = images.filter(img => !img.hasAltAttribute);
  if (missingAlt.length > 0) {
    recommendations.push('Add alt attributes to ' + missingAlt.length + ' image(s) for accessibility');
  }
  
  // Estimate total size (rough, based on dimensions and format)
  const estimateSize = (img) => {
    const pixels = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
    const bytesPerPixel = {
      'webp': 0.1,
      'avif': 0.08,
      'jpeg': 0.2,
      'png': 0.5,
      'gif': 0.3,
      'svg': 0.01, // SVGs are typically small
      'unknown': 0.2
    };
    return Math.round(pixels * (bytesPerPixel[img.format] || 0.2));
  };
  
  const totalEstimatedSize = images.reduce((sum, img) => sum + estimateSize(img), 0);
  
  return {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    totalImages: images.length,
    images,
    byFormat,
    totalEstimatedSize,
    optimizationScore,
    recommendations
  };
})()
`;
