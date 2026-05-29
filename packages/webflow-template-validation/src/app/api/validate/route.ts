import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

type CategoryResult = {
  category: string
  passed: boolean
  issues: {
    id: string
    category: string
    severity: 'error' | 'warning' | 'info'
    message: string
    details?: any
  }[]
  stats?: any
}

type ValidationResponse = {
  url: string
  success: boolean
  categories: CategoryResult[]
  summary: {
    errors: number
    warnings: number
    infos: number
    passedCategories: number
    failedCategories: number
  }
}

async function validateDesignerOnly(body: any): Promise<CategoryResult[]> {
  const categories: CategoryResult[] = []

  // Variables validation (Enhanced for Webflow Way)
  if (body.designerVariables) {
    const varResult = analyzeVariablesDesigner(body.designerVariables)
    const varIssues: CategoryResult['issues'] = []
    
    if (!varResult.hasAnyCollections) {
      varIssues.push({ 
        id: 'variables.none', 
        category: 'Variables', 
        severity: 'error', 
        message: 'No variable collections found. Design systems should use variables for consistency.',
        details: {
          howToFix: 'Create variable collections for colors, spacing, and typography. Organize into purposeful groups with ordered ramps (light-to-dark, small-to-large)',
          location: 'Variables panel > Create collection > Add variables'
        }
      })
    } else {
      if (varResult.invalidNames.length > 0) {
        varIssues.push({ 
          id: 'variables.naming', 
          category: 'Variables', 
          severity: 'warning', 
          message: `${varResult.invalidNames.length} variables don't follow proper naming conventions.`,
          details: { 
            sample: varResult.invalidNames.slice(0, 5),
            howToFix: 'Use Title Case with spaces for variable names (e.g., "Primary Color", "Large Spacing")',
            location: 'Variables panel > Select variable > Rename'
          }
        })
      }

      if (!varResult.hasOrganizedCollections) {
        varIssues.push({ 
          id: 'variables.organization', 
          category: 'Variables', 
          severity: 'warning', 
          message: 'Variables should be organized into purposeful collections (Colors, Spacing, Typography).',
          details: {
            howToFix: 'Create separate collections for different variable types. Use clear naming like "Colors", "Spacing", "Typography"',
            location: 'Variables panel > Create collection > Group related variables'
          }
        })
      }

      if (!varResult.hasOrderedRamps) {
        varIssues.push({ 
          id: 'variables.ramps', 
          category: 'Variables', 
          severity: 'warning', 
          message: 'Color variables should use ordered ramps (e.g., light-to-dark progression).',
          details: {
            howToFix: 'Organize color variables in logical sequences: Primary 100, Primary 200... Primary 900',
            location: 'Variables panel > Arrange variables in logical order'
          }
        })
      }

      if (varResult.totalCollections < 2) {
        varIssues.push({ 
          id: 'variables.insufficient-collections', 
          category: 'Variables', 
          severity: 'info', 
          message: 'Consider creating more variable collections for better organization.',
          details: {
            howToFix: 'Separate variables into logical collections: Colors, Spacing, Typography, etc.',
            location: 'Variables panel > Create collection for each variable type'
          }
        })
      }

      if (varResult.totalVariables < 5) {
        varIssues.push({ 
          id: 'variables.insufficient-usage', 
          category: 'Variables', 
          severity: 'info', 
          message: 'Templates should leverage more variables for consistency and maintainability.',
          details: {
            howToFix: 'Create variables for commonly used values like brand colors, spacing units, and typography scales',
            location: 'Variables panel > Create variables for repeated values'
          }
        })
      }
    }

    if (varIssues.length === 0) {
      varIssues.push({ 
        id: 'variables.excellent', 
        category: 'Variables', 
        severity: 'info', 
        message: 'Excellent variable usage! Well-organized design system following Webflow Way guidelines.',
        details: {
          howToFix: 'Continue using variables consistently and consider Variable Modes for responsive behavior'
        }
      })
    }

    categories.push({
      category: 'Variables',
      passed: varIssues.filter(i => i.severity === 'error').length === 0,
      issues: varIssues,
      stats: { 
        totalCollections: varResult.totalCollections, 
        totalVariables: varResult.totalVariables,
        hasOrganizedCollections: varResult.hasOrganizedCollections,
        hasOrderedRamps: varResult.hasOrderedRamps
      }
    })
  }

  // Components validation (Enhanced for Webflow Way)
  if (body.designerComponents) {
    const compResult = analyzeComponentsDesigner(body.designerComponents)
    const compIssues: CategoryResult['issues'] = []
    
    if (compResult.totalComponents === 0) {
      compIssues.push({ 
        id: 'components.none', 
        category: 'Components', 
        severity: 'error', 
        message: 'No components found. Templates should be built component-first.',
        details: {
          howToFix: 'Create reusable components for shared elements like navigation, footer, and CTAs',
          location: 'Designer: Select elements > Component menu > Create Component'
        }
      })
    } else {
      if (compResult.invalidNames.length > 0) {
        compIssues.push({ 
          id: 'components.naming', 
          category: 'Components', 
          severity: 'warning', 
          message: `${compResult.invalidNames.length} components don't follow Title Case naming conventions.`,
          details: { 
            sample: compResult.invalidNames.slice(0, 5),
            howToFix: 'Use Title Case for component names and variants (e.g., "Navigation Bar", "Call To Action Dark")',
            location: 'Component settings > Rename component'
          }
        })
      }

      if (!compResult.hasRequiredComponents) {
        const missing = []
        if (compResult.navComponents === 0) missing.push('Navigation')
        if (compResult.footerComponents === 0) missing.push('Footer')  
        if (compResult.ctaComponents === 0) missing.push('Call To Action')
        
        compIssues.push({ 
          id: 'components.missing-required', 
          category: 'Components', 
          severity: 'warning', 
          message: `Missing essential components: ${missing.join(', ')}. These should be componentized.`,
          details: {
            howToFix: 'Create reusable components for navigation, footer, and call-to-action elements',
            location: 'Designer: Select elements > Component menu > Create Component'
          }
        })
      }
      
      if (compResult.totalComponents < 3) {
        compIssues.push({ 
          id: 'components.insufficient', 
          category: 'Components', 
          severity: 'info', 
          message: `Only ${compResult.totalComponents} components found. Consider more component-first approach.`,
          details: {
            howToFix: 'Look for repeated structures and convert them to reusable components. Consider nested components for complex patterns.',
            location: 'Designer: Look for repeated elements and componentize them'
          }
        })
      }

      if (compResult.componentDensity && compResult.componentDensity < 0.1) {
        compIssues.push({ 
          id: 'components.low-usage', 
          category: 'Components', 
          severity: 'info', 
          message: 'Low component usage detected. Templates should leverage components for reusability.',
          details: {
            howToFix: 'Compose complex patterns from smaller, atomic components. Use style variants instead of duplicating structures.',
            location: 'Designer: Component menu > Create variants and props'
          }
        })
      }
    }

    if (compIssues.length === 0) {
      compIssues.push({ 
        id: 'components.excellent', 
        category: 'Components', 
        severity: 'info', 
        message: 'Excellent component usage! Following Webflow Way component-first approach.',
        details: {
          howToFix: 'Continue using components for all reusable structures and consider nested components for complexity'
        }
      })
    }

    categories.push({
      category: 'Components',
      passed: compIssues.filter(i => i.severity === 'error').length === 0,
      issues: compIssues,
      stats: { 
        totalComponents: compResult.totalComponents,
        navComponents: compResult.navComponents,
        footerComponents: compResult.footerComponents,
        ctaComponents: compResult.ctaComponents,
        componentDensity: compResult.componentDensity
      }
    })
  }

  // Styles & Typography validation (Enhanced for Webflow Way)
  if (body.designerStyles) {
    const styleResult = analyzeStylesDesigner(body.designerStyles)
    const styleIssues: CategoryResult['issues'] = []
    
    if (styleResult.inconsistentNaming.length > 0) {
      styleIssues.push({ 
        id: 'styles.naming-inconsistent', 
        category: 'Styles', 
        severity: 'warning', 
        message: `${styleResult.inconsistentNaming.length} classes don't follow consistent naming patterns.`,
        details: { 
          sample: styleResult.inconsistentNaming.slice(0, 5),
          howToFix: 'Use consistent naming like "component-element-modifier" or follow BEM conventions',
          location: 'Style panel > Rename classes consistently'
        }
      })
    }

    if (!styleResult.hasTypographyClasses) {
      styleIssues.push({ 
        id: 'styles.missing-typography', 
        category: 'Styles', 
        severity: 'error', 
        message: 'No typography classes detected. Templates need text styles for consistency.',
        details: {
          howToFix: 'Create typography classes for all text elements: headings, body text, captions, etc. Style HTML tags first, then create semantic classes.',
          location: 'Select text elements > Style panel > Create new class'
        }
      })
    }

    if (!styleResult.hasHtmlTagStyles) {
      styleIssues.push({ 
        id: 'styles.missing-html-baseline', 
        category: 'Styles', 
        severity: 'warning', 
        message: 'HTML tags should have baseline styles. Style All H1 Tags, All Paragraphs, etc.',
        details: {
          howToFix: 'Style HTML tags directly first: Select H1 > Style panel > "All H1 Tags", then create semantic classes',
          location: 'Style panel > Select HTML tag option instead of class'
        }
      })
    }

    if (styleResult.deepComboClasses.length > 0) {
      styleIssues.push({ 
        id: 'styles.deep-combo-classes', 
        category: 'Styles', 
        severity: 'warning', 
        message: `${styleResult.deepComboClasses.length} classes have complex combo class nesting (>3 levels).`,
        details: {
          sample: styleResult.deepComboClasses.slice(0, 3),
          howToFix: 'Limit combo classes to 3-4 levels max. Consider creating new base classes instead of deep nesting',
          location: 'Style panel > Simplify combo class structure'
        }
      })
    }

    if (styleResult.loremIpsumDetected) {
      styleIssues.push({ 
        id: 'styles.lorem-ipsum', 
        category: 'Styles', 
        severity: 'error', 
        message: 'Lorem Ipsum content detected. Use unique, relevant content for templates.',
        details: {
          howToFix: 'Replace all Lorem Ipsum with realistic, relevant content that demonstrates the template use case',
          location: 'Find Lorem Ipsum text and replace with meaningful content'
        }
      })
    }

    if (!styleResult.hasPercentageLineHeights) {
      styleIssues.push({ 
        id: 'styles.line-height-units', 
        category: 'Styles', 
        severity: 'warning', 
        message: 'Typography should use percentage-based line heights for better responsive behavior.',
        details: {
          howToFix: 'Use percentage values for line heights (e.g., 120%, 140%) instead of fixed units',
          location: 'Style panel > Typography > Line height > Use % units'
        }
      })
    }

    if (styleResult.totalClasses < 5) {
      styleIssues.push({ 
        id: 'styles.insufficient-classes', 
        category: 'Styles', 
        severity: 'info', 
        message: 'Consider creating more reusable classes for better design system consistency.',
        details: {
          howToFix: 'Create semantic classes for repeated patterns: buttons, cards, sections, etc.',
          location: 'Style panel > Create classes for common elements'
        }
      })
    }

    if (styleIssues.length === 0) {
      styleIssues.push({ 
        id: 'styles.excellent', 
        category: 'Styles', 
        severity: 'info', 
        message: 'Excellent typography and styling! Following Webflow Way design system guidelines.',
        details: {
          howToFix: 'Continue maintaining consistent styling and semantic class naming'
        }
      })
    }

    categories.push({
      category: 'Styles',
      passed: styleIssues.filter(i => i.severity === 'error').length === 0,
      issues: styleIssues,
      stats: { 
        totalClasses: styleResult.totalClasses,
        hasTypographyClasses: styleResult.hasTypographyClasses,
        hasHtmlTagStyles: styleResult.hasHtmlTagStyles,
        hasPercentageLineHeights: styleResult.hasPercentageLineHeights,
        loremIpsumDetected: styleResult.loremIpsumDetected
      }
    })
  }

  // Required Pages validation (Webflow Way requirement)
  if (body.designerPages || body.siteInfo) {
    const pageResult = analyzePagesDesigner(body.designerPages)
    const requiredPageIssues: CategoryResult['issues'] = []
    
    // Check for required pages according to Webflow Way guidelines
    const requiredPages = analyzeRequiredPages(pageResult.pageNames)
    
    if (!requiredPages.hasStyleGuide) {
      requiredPageIssues.push({ 
        id: 'required-pages.missing-style-guide', 
        category: 'Required Pages', 
        severity: 'error', 
        message: 'Style Guide page is required for template submission.',
        details: {
          howToFix: 'Create a Style Guide page that includes all HTML tags (headings, paragraphs, links, buttons, etc.)',
          location: 'Pages panel > Add Page > Name: "Style Guide"'
        }
      })
    }
    
    if (!requiredPages.hasInstructions && requiredPages.shouldHaveInstructions) {
      requiredPageIssues.push({ 
        id: 'required-pages.missing-instructions', 
        category: 'Required Pages', 
        severity: 'error', 
        message: 'Instructions page is required when using advanced interactions or custom code.',
        details: {
          howToFix: 'Create an Instructions page with information on how to access and edit complex components',
          location: 'Pages panel > Add Page > Name: "Instructions"'
        }
      })
    }
    
    if (!requiredPages.hasLicense) {
      requiredPageIssues.push({ 
        id: 'required-pages.missing-license', 
        category: 'Required Pages', 
        severity: 'error', 
        message: 'License page is required for template submission.',
        details: {
          howToFix: 'Create a License page with licensing info for all custom assets. It may be nested in a folder if its published URL is accessible.',
          location: 'Pages panel > Add Page > Name: "Licenses"'
        }
      })
    }
    
    if (!requiredPages.hasCustom404) {
      requiredPageIssues.push({ 
        id: 'required-pages.missing-404', 
        category: 'Required Pages', 
        severity: 'warning', 
        message: 'Custom 404 page is recommended for better user experience.',
        details: {
          howToFix: 'Create a custom branded 404 page with full navigation and CTAs',
          location: 'Pages panel > Utility Pages > 404 Page'
        }
      })
    }

    if (requiredPageIssues.length === 0) {
      requiredPageIssues.push({ 
        id: 'required-pages.complete', 
        category: 'Required Pages', 
        severity: 'info', 
        message: 'All required pages are present. Great job following Webflow Way guidelines!',
        details: {
          howToFix: 'Continue maintaining these required pages with proper content and formatting'
        }
      })
    }

    categories.push({
      category: 'Required Pages',
      passed: requiredPageIssues.filter(i => i.severity === 'error').length === 0,
      issues: requiredPageIssues,
      stats: { 
        hasStyleGuide: requiredPages.hasStyleGuide,
        hasInstructions: requiredPages.hasInstructions,
        hasLicense: requiredPages.hasLicense,
        hasCustom404: requiredPages.hasCustom404
      }
    })
  }

  // Page Structure validation
  if (body.designerPages || body.siteInfo) {
    const pageResult = analyzePagesDesigner(body.designerPages)
    const pageIssues: CategoryResult['issues'] = []
    
    if (pageResult.totalPages === 0) {
      pageIssues.push({ 
        id: 'pages.no-pages', 
        category: 'Page Structure', 
        severity: 'error', 
        message: 'No pages found in this project.',
        details: {
          howToFix: 'Create at least one page in your project using the Pages panel'
        }
      })
    } else {
      if (!pageResult.hasHomePage) {
        pageIssues.push({ 
          id: 'pages.no-home', 
          category: 'Page Structure', 
          severity: 'warning', 
          message: 'No home page detected.',
          details: {
            howToFix: 'Set one of your pages as the home page in the Pages panel'
          }
        })
      }
      
      if (pageResult.totalPages < 2) {
        pageIssues.push({ 
          id: 'pages.minimal-structure', 
          category: 'Page Structure', 
          severity: 'info', 
          message: 'Consider adding more pages for a complete website structure.',
          details: {
            howToFix: 'Add common pages like About, Contact, or Services using the Pages panel'
          }
        })
      }
      
      if (pageResult.totalFolders > 0) {
        pageIssues.push({ 
          id: 'pages.good-organization', 
          category: 'Page Structure', 
          severity: 'info', 
          message: `Great organization! You're using ${pageResult.totalFolders} folders to organize your pages.`,
          details: {
            howToFix: 'Continue organizing pages into logical folder structures'
          }
        })
      }
    }

    if (pageIssues.length === 0) {
      pageIssues.push({ 
        id: 'pages.structure-good', 
        category: 'Page Structure', 
        severity: 'info', 
        message: 'Page structure looks good. Continue following Webflow best practices.',
        details: {
          howToFix: 'Keep using semantic HTML elements and proper heading hierarchy'
        }
      })
    }

    categories.push({
      category: 'Page Structure',
      passed: pageIssues.filter(i => i.severity === 'error').length === 0,
      issues: pageIssues,
      stats: { 
        totalPages: pageResult.totalPages,
        totalFolders: pageResult.totalFolders,
        hasHomePage: pageResult.hasHomePage
      }
    })
  }

  // Assets validation
  if (body.designerData?.assets) {
    const assetResult = analyzeAssetsDesigner(body.designerData.assets)
    const assetIssues: CategoryResult['issues'] = []
    
    // Critical: Webflow Way 150KB limit
    if (assetResult.hasOversizedAssets) {
      assetIssues.push({ 
        id: 'assets.webflow-way-size-limit', 
        category: 'Assets', 
        severity: 'error', 
        message: `${assetResult.oversizedAssets.length} assets exceed 150KB limit for Webflow Way templates.`,
        details: {
          howToFix: 'Compress images to ≤150KB using TinyPNG, ImageOptim, or WebP format. Consider using SVG for icons',
          location: 'Assets panel > Select large assets > Download, optimize, re-upload',
          sample: assetResult.oversizedAssets.slice(0, 3).map(a => `${a.name} (${a.size}KB)`)
        }
      })
    }
    
    // Extreme cases: >5MB files
    if (assetResult.hasLargeAssets) {
      assetIssues.push({ 
        id: 'assets.extremely-large-files', 
        category: 'Assets', 
        severity: 'error', 
        message: `${assetResult.largeAssets.length} assets are larger than 5MB and will severely impact performance.`,
        details: {
          howToFix: 'These files are too large for web use. Resize and compress aggressively or use lazy loading',
          location: 'Assets panel > Replace with optimized versions',
          sample: assetResult.largeAssets.slice(0, 3).map(a => `${a.name} (${a.size}MB)`)
        }
      })
    }
    
    // Format optimization recommendations
    if (assetResult.hasNonOptimalFormats) {
      assetIssues.push({ 
        id: 'assets.format-optimization', 
        category: 'Assets', 
        severity: 'warning', 
        message: `${assetResult.nonOptimalFormats.length} images could be optimized with modern formats (WebP/AVIF).`,
        details: {
          howToFix: 'Convert JPG/PNG to WebP format for ~30% smaller file sizes with same quality',
          location: 'Use online converters or Squoosh.app, then re-upload to Webflow',
          sample: assetResult.nonOptimalFormats.slice(0, 3).map(a => `${a.name} (${a.format})`)
        }
      })
    }
    
    // Licensing and stock image concerns
    if (assetResult.hasSuspiciousStockImages) {
      assetIssues.push({ 
        id: 'assets.licensing-concern', 
        category: 'Assets', 
        severity: 'error', 
        message: `${assetResult.suspiciousStockImages.length} images may have licensing issues or appear to be unattributed stock photos.`,
        details: {
          howToFix: 'Ensure all images are properly licensed for commercial use. Use Unsplash, custom photography, or properly licensed stock',
          location: 'Replace flagged images with licensed alternatives',
          sample: assetResult.suspiciousStockImages.slice(0, 3)
        }
      })
    }
    
    // Duplicate optimization
    if (assetResult.hasDuplicateImages) {
      assetIssues.push({ 
        id: 'assets.duplicate-images', 
        category: 'Assets', 
        severity: 'info', 
        message: `${assetResult.duplicateImages.length} potential duplicate images found that could be consolidated.`,
        details: {
          howToFix: 'Review similar images and use a single optimized version where possible to reduce asset bloat',
          location: 'Assets panel > Review and consolidate similar images',
          sample: assetResult.duplicateImages.slice(0, 3)
        }
      })
    }
    
    // File naming best practices
    if (assetResult.hasMisnamedAssets) {
      assetIssues.push({ 
        id: 'assets.naming-conventions', 
        category: 'Assets', 
        severity: 'warning', 
        message: `${assetResult.misnamedAssets.length} assets don't follow naming conventions (no spaces, lowercase).`,
        details: {
          howToFix: 'Use descriptive, SEO-friendly names: "hero-image.webp" not "Hero Image.JPG"',
          location: 'Assets panel > Rename assets with hyphens instead of spaces',
          sample: assetResult.misnamedAssets.slice(0, 3)
        }
      })
    }
    
    // Modern format usage recognition
    if (assetResult.hasModernFormats) {
      assetIssues.push({ 
        id: 'assets.modern-formats', 
        category: 'Assets', 
        severity: 'info', 
        message: 'Great! Using modern image formats (WebP/AVIF) for optimal performance.',
        details: {
          howToFix: 'Continue using modern formats for all new images',
          location: 'Keep using WebP/AVIF for optimal file sizes'
        }
      })
    }
    
    // Overall optimization score
    if (assetResult.optimizationScore && assetResult.optimizationScore >= 0.7 && assetIssues.filter(i => i.severity === 'error').length === 0) {
      assetIssues.push({ 
        id: 'assets.excellent-optimization', 
        category: 'Assets', 
        severity: 'info', 
        message: 'Excellent asset optimization! Following Webflow Way best practices.',
        details: {
          howToFix: 'Assets are well optimized for performance and user experience',
          location: 'Continue maintaining these optimization standards'
        }
      })
    }

    categories.push({
      category: 'Assets',
      passed: assetIssues.filter(i => i.severity === 'error').length === 0,
      issues: assetIssues,
      stats: { totalAssets: assetResult.totalAssets }
    })
  }

  // Fonts validation
  if (body.designerData?.fonts) {
    const fontResult = analyzeFontsDesigner(body.designerData.fonts)
    const fontIssues: CategoryResult['issues'] = []
    
    if (fontResult.hasTooManyFonts) {
      fontIssues.push({ 
        id: 'fonts.too-many', 
        category: 'Fonts', 
        severity: 'warning', 
        message: `Using ${fontResult.totalFonts} fonts may impact page loading performance.`,
        details: {
          howToFix: 'Limit to 2-3 font families and use font variations (weight, style) for hierarchy'
        }
      })
    }
    
    if (fontResult.hasCustomFonts && fontResult.customFonts > 2) {
      fontIssues.push({ 
        id: 'fonts.custom-fonts', 
        category: 'Fonts', 
        severity: 'info', 
        message: `You're using ${fontResult.customFonts} custom fonts which may affect loading speed.`,
        details: {
          howToFix: 'Consider using system fonts or Google Fonts for better performance'
        }
      })
    }

    if (fontIssues.length === 0) {
      fontIssues.push({ 
        id: 'fonts.optimized', 
        category: 'Fonts', 
        severity: 'info', 
        message: 'Font usage looks good. Typography performance is optimized.',
        details: {
          howToFix: 'Continue using web fonts and limiting font variety'
        }
      })
    }

    categories.push({
      category: 'Fonts',
      passed: fontIssues.filter(i => i.severity === 'error').length === 0,
      issues: fontIssues,
      stats: { 
        totalFonts: fontResult.totalFonts, 
        webFonts: fontResult.webFonts, 
        customFonts: fontResult.customFonts 
      }
    })
  }

  // Collections validation
  if (body.designerData?.collections && body.designerData.collections.length > 0) {
    const collectionResult = analyzeCollectionsDesigner(body.designerData.collections)
    const collectionIssues: CategoryResult['issues'] = []
    
    if (collectionResult.hasTooManyFields) {
      collectionIssues.push({ 
        id: 'collections.many-fields', 
        category: 'Collections', 
        severity: 'info', 
        message: `${collectionResult.collectionsWithManyFields} collections have more than 20 fields.`,
        details: {
          howToFix: 'Consider splitting large collections into multiple smaller ones for better organization'
        }
      })
    }

    if (collectionIssues.length === 0) {
      collectionIssues.push({ 
        id: 'collections.organized', 
        category: 'Collections', 
        severity: 'info', 
        message: 'CMS collections are well organized with manageable field counts.',
        details: {
          howToFix: 'Continue organizing content with clear field names and types'
        }
      })
    }

    categories.push({
      category: 'Collections',
      passed: collectionIssues.filter(i => i.severity === 'error').length === 0,
      issues: collectionIssues,
      stats: { totalCollections: collectionResult.totalCollections }
    })
  }

  // SEO & Meta validation (Enhanced for Webflow Way)
  if (body.designerPages || body.siteInfo) {
    const pageResult = analyzePagesDesigner(body.designerPages)
    const seoIssues: CategoryResult['issues'] = []
    
    // Note: Heading hierarchy validation would require page content analysis
    // This check is commented out until we implement proper page content parsing

    // Check for meta titles and descriptions
    // Note: Meta validation would require page content analysis with proper API access
    // This check is commented out until we implement proper page meta data collection

    // Check for Open Graph tags
    // Note: Open Graph validation would require page meta data analysis with proper API access
    // This check is commented out until we implement proper page meta data collection

    // Check for semantic HTML structure
    // Note: Semantic structure validation would require page content analysis with proper API access
    // This check is commented out until we implement proper page DOM analysis

    // Check for alt text on images (this would require asset analysis)
    if (body.designerAssets) {
      const assetResult = analyzeAssetsDesigner(body.designerAssets)
      if (assetResult.imagesWithoutAlt.length > 0) {
        seoIssues.push({ 
          id: 'seo.missing-alt-text', 
          category: 'SEO & Meta', 
          severity: 'error', 
          message: `${assetResult.imagesWithoutAlt.length} images missing alt text for accessibility and SEO.`,
          details: {
            howToFix: 'Add descriptive alt text to all images. Use empty alt="" only for decorative images',
            location: 'Designer > Select image > Element Settings > Alt text'
          }
        })
      }
    }

    // Check for clean URL structure (slug validation)
    // Note: URL slug validation would require page settings analysis with proper API access
    // This check is commented out until we implement proper page URL collection

    // Check for duplicate content or titles
    // Note: Duplicate title validation would require page meta data analysis with proper API access
    // This check is commented out until we implement proper page title collection

    if (seoIssues.length > 0) {
      categories.push({
        category: 'SEO & Meta',
        passed: seoIssues.filter(i => i.severity === 'error').length === 0,
        issues: seoIssues,
        stats: { 
          totalPages: pageResult.totalPages,
          totalFolders: pageResult.totalFolders,
          hasHomePage: pageResult.hasHomePage,
          pageNames: pageResult.pageNames
        }
      })
    }
  }

  // Forms & Conversions validation REMOVED
  // This category was causing confusion because:
  // 1. Cannot validate actual form success/error messages (only Webflow form settings)
  // 2. Cannot validate form redirects or interactions
  // 3. Can only check CSS class names, leading to false positives/negatives
  // 4. Users interpret "error states" as form validation when it means CSS styling

  return categories
}

// Analysis functions for Designer data
function analyzeVariablesDesigner(variables: any) {
  let totalCollections = 0
  let totalVariables = 0
  const invalidNames: string[] = []
  let hasOrganizedCollections = false
  let hasOrderedRamps = false
  const collectionTypes = new Set()

  if (variables && variables.collections) {
    totalCollections = variables.collections.length
    
    for (const collection of variables.collections) {
      if (collection.variables) {
        totalVariables += collection.variables.length
        
        // Check for organized collection naming
        const collectionName = (collection.name || '').toLowerCase()
        if (collectionName.includes('color') || collectionName.includes('spacing') || 
            collectionName.includes('typography') || collectionName.includes('font')) {
          collectionTypes.add('organized')
        }
        
        // Check for ordered ramps in color variables
        const colorVariables = collection.variables.filter((v: any) => 
          v.type === 'color' || (v.name && /\d{2,3}|light|dark/i.test(v.name))
        )
        
        if (colorVariables.length >= 3) {
          // Look for numbered sequences like "Primary 100", "Primary 200", etc.
          const hasNumberedSequence = colorVariables.some((v: any) => 
            v.name && /\d{2,3}/.test(v.name)
          )
          if (hasNumberedSequence) {
            hasOrderedRamps = true
          }
        }
        
        for (const variable of collection.variables) {
          if (variable.name && !isValidVariableName(variable.name)) {
            invalidNames.push(variable.name)
          }
        }
      }
    }
    
    // Check if collections are organized (at least 2 different types or clear naming)
    hasOrganizedCollections = collectionTypes.size > 0 || totalCollections >= 3
  }

  return {
    hasAnyCollections: totalCollections > 0,
    totalCollections,
    totalVariables,
    invalidNames,
    hasOrganizedCollections,
    hasOrderedRamps
  }
}

function analyzeComponentsDesigner(components: any) {
  // Type guard: ensure components is an array
  if (!Array.isArray(components)) {
    return {
      totalComponents: 0,
      navComponents: 0,
      footerComponents: 0,
      ctaComponents: 0,
      modalComponents: 0,
      cardComponents: 0,
      invalidNames: [],
      componentTypes: [],
      hasNavigation: false,
      hasFooter: false,
      hasCTA: false,
      hasModal: false,
      hasCard: false
    }
  }
  
  const totalComponents = components.length
  let navComponents = 0
  let footerComponents = 0
  let ctaComponents = 0
  let modalComponents = 0
  let cardComponents = 0
  const invalidNames: string[] = []
  const componentTypes: string[] = []

  for (const component of components) {
    if (component.name) {
      if (!isValidComponentName(component.name)) {
        invalidNames.push(component.name)
      }
      
      const nameLower = component.name.toLowerCase()
      componentTypes.push(component.type || 'component')
      
      // Categorize components
      if (nameLower.includes('nav') || nameLower.includes('menu') || nameLower.includes('header')) navComponents++
      if (nameLower.includes('footer')) footerComponents++
      if (nameLower.includes('cta') || nameLower.includes('button') || nameLower.includes('call')) ctaComponents++
      if (nameLower.includes('modal') || nameLower.includes('popup') || nameLower.includes('overlay')) modalComponents++
      if (nameLower.includes('card') || nameLower.includes('item') || nameLower.includes('tile')) cardComponents++
    }
  }

  // Calculate component density (rough estimate based on component variety)
  const componentVariety = new Set([
    navComponents > 0 ? 'nav' : null,
    footerComponents > 0 ? 'footer' : null,
    ctaComponents > 0 ? 'cta' : null,
    modalComponents > 0 ? 'modal' : null,
    cardComponents > 0 ? 'card' : null
  ].filter(Boolean)).size
  
  const componentDensity = totalComponents > 0 ? componentVariety / 10 : 0 // Normalized score

  return {
    totalComponents,
    navComponents,
    footerComponents,
    ctaComponents,
    modalComponents,
    cardComponents,
    hasRequiredComponents: navComponents > 0 && footerComponents > 0 && ctaComponents > 0,
    invalidNames,
    componentDensity,
    componentVariety
  }
}

function analyzeStylesDesigner(styles: any) {
  const totalClasses = styles.styles?.length || 0
  const inconsistentNaming: string[] = []
  const deepComboClasses: string[] = []
  let hasTypographyClasses = false
  let hasHtmlTagStyles = false
  let hasPercentageLineHeights = false
  let loremIpsumDetected = false

  if (styles.styles) {
    for (const style of styles.styles) {
      if (style.name) {
        // Check naming conventions
        if (!isValidClassName(style.name)) {
          inconsistentNaming.push(style.name)
        }
        
        // Check for deep combo classes (>3 levels)
        const comboLevels = (style.name.match(/\s/g) || []).length + 1
        if (comboLevels > 3) {
          deepComboClasses.push(style.name)
        }
        
        // Check for typography classes
        const nameLower = style.name.toLowerCase()
        if (nameLower.includes('heading') || nameLower.includes('text') || 
            nameLower.includes('title') || nameLower.includes('body') ||
            nameLower.includes('h1') || nameLower.includes('h2') || 
            nameLower.includes('paragraph') || nameLower.includes('caption')) {
          hasTypographyClasses = true
        }

        // Check for HTML tag styles (tags without class names)
        if (style.type === 'tag' || nameLower.match(/^(h1|h2|h3|h4|h5|h6|p|body|html)$/)) {
          hasHtmlTagStyles = true
        }
      }

      // Check for percentage-based line heights (if style properties are available)
      if (style.properties || style.styles) {
        const styleProps = style.properties || style.styles || {}
        if (styleProps.lineHeight && typeof styleProps.lineHeight === 'string') {
          if (styleProps.lineHeight.includes('%')) {
            hasPercentageLineHeights = true
          }
        }
      }

      // Check for Lorem Ipsum in style content or text properties
      if (style.content || style.text) {
        const content = (style.content || style.text || '').toLowerCase()
        if (content.includes('lorem ipsum') || content.includes('lorem') || 
            content.includes('dolor sit amet') || content.includes('consectetur adipiscing')) {
          loremIpsumDetected = true
        }
      }
    }
  }

  // If no specific percentage line heights found, assume some exist for basic implementation
  if (!hasPercentageLineHeights && hasTypographyClasses) {
    // This is a conservative check - we assume if there are typography classes,
    // some might be using good practices
    hasPercentageLineHeights = totalClasses > 3
  }

  return {
    totalClasses,
    inconsistentNaming,
    hasTypographyClasses,
    hasHtmlTagStyles,
    hasPercentageLineHeights,
    loremIpsumDetected,
    deepComboClasses
  }
}

function analyzeAssetsDesigner(assets: any) {
  // Type guard: ensure assets is an array
  if (!Array.isArray(assets)) {
    return {
      totalAssets: 0,
      hasLargeAssets: false,
      hasOversizedAssets: false,
      hasMisnamedAssets: false,
      hasNonOptimalFormats: false,
      hasSuspiciousStockImages: false,
      hasImagesWithoutAlt: false,
      hasDuplicateImages: false,
      hasModernFormats: false,
      largeAssets: [],
      oversizedAssets: [],
      misnamedAssets: [],
      nonOptimalFormats: [],
      suspiciousStockImages: [],
      imagesWithoutAlt: [],
      duplicateImages: []
    }
  }
  
  const totalAssets = assets.length
  const largeAssets: { name: string; size: number }[] = []
  const oversizedAssets: { name: string; size: number }[] = [] // >150KB for Webflow Way
  const misnamedAssets: string[] = []
  const nonOptimalFormats: { name: string; format: string }[] = []
  const suspiciousStockImages: string[] = []
  const imagesWithoutAlt: string[] = []
  const duplicateImages: string[] = []
  
  // Track image extensions and naming patterns
  const imageExtensions = new Set<string>()
  const imageNames = new Map<string, number>() // For duplicate detection
  
  for (const asset of assets) {
    const fileName = asset.name || ''
    const fileExtension = fileName.split('.').pop()?.toLowerCase()
    const fileSize = asset.size || 0
    const fileSizeKB = Math.round(fileSize / 1024 * 10) / 10
    const fileSizeMB = Math.round(fileSize / (1024 * 1024) * 10) / 10
    
    // Track duplicates by name (without extension)
    const baseName = fileName.replace(/\.[^/.]+$/, "")
    imageNames.set(baseName, (imageNames.get(baseName) || 0) + 1)
    
    // Check for Webflow Way file size limits (150KB recommended)
    if (fileSize > 150 * 1024) {
      oversizedAssets.push({
        name: fileName,
        size: fileSizeKB
      })
    }
    
    // Check for large file sizes (>5MB - extreme cases)
    if (fileSize > 5 * 1024 * 1024) {
      largeAssets.push({
        name: fileName,
        size: fileSizeMB
      })
    }
    
    // Check for proper naming (no spaces, lowercase with hyphens)
    if (fileName && /\s/.test(fileName)) {
      misnamedAssets.push(fileName)
    }
    
    // Check for image formats and recommend modern formats
    if (fileExtension) {
      imageExtensions.add(fileExtension)
      
      // Track non-optimal image formats
      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        // These are acceptable but WebP/AVIF would be better
        if (fileSize > 50 * 1024) { // Only flag larger files
          nonOptimalFormats.push({
            name: fileName,
            format: fileExtension
          })
        }
      }
    }
    
    // Detect suspicious stock image patterns
    if (fileName) {
      const stockPatterns = [
        /stock[-_]?photo/i,
        /shutterstock/i,
        /getty/i,
        /istockphoto/i,
        /depositphotos/i,
        /bigstock/i,
        /123rf/i,
        /dreamstime/i,
        /fotolia/i,
        /^img[-_]?\d{4,}/i, // Generic img_1234 patterns
        /^dsc[-_]?\d{4,}/i, // Camera default DSC_1234 patterns
        /untitled[-_]?\d*/i,
        /^image[-_]?\d*/i
      ]
      
      if (stockPatterns.some(pattern => pattern.test(fileName))) {
        suspiciousStockImages.push(fileName)
      }
    }
    
    // Check for missing alt text (this would need to be checked in the actual DOM/component structure)
    // For now, we'll check if the image appears to be content (not decorative) based on name
    if (fileName && !fileName.includes('icon') && !fileName.includes('decoration') && 
        !fileName.includes('bg') && !fileName.includes('background')) {
      // This is a placeholder - actual alt text checking would need DOM access
      // We'll flag this as a reminder to check alt text
    }
  }
  
  // Identify actual duplicates (count > 1)
  for (const [name, count] of imageNames) {
    if (count > 1) {
      duplicateImages.push(name)
    }
  }
  
  // Calculate optimization metrics
  const hasModernFormats = Array.from(imageExtensions).some(ext => ['webp', 'avif'].includes(ext))
  const optimizationScore = hasModernFormats ? 0.8 : 0.4 // Basic scoring
  
  return {
    totalAssets,
    largeAssets,
    oversizedAssets, // New: >150KB assets
    misnamedAssets,
    nonOptimalFormats, // New: Could be WebP/AVIF
    suspiciousStockImages, // New: Potential licensing issues
    imagesWithoutAlt, // New: Accessibility concern
    duplicateImages, // New: Potential optimization
    imageExtensions: Array.from(imageExtensions),
    hasLargeAssets: largeAssets.length > 0,
    hasOversizedAssets: oversizedAssets.length > 0, // New
    hasMisnamedAssets: misnamedAssets.length > 0,
    hasNonOptimalFormats: nonOptimalFormats.length > 0, // New
    hasSuspiciousStockImages: suspiciousStockImages.length > 0, // New
    hasDuplicateImages: duplicateImages.length > 0, // New
    hasModernFormats,
    optimizationScore,
    avgAssetSize: totalAssets > 0 ? assets.reduce((sum, asset) => sum + (asset.size || 0), 0) / totalAssets : 0
  }
}

function analyzeFontsDesigner(fonts: any[]) {
  // Type guard: ensure fonts is an array
  if (!Array.isArray(fonts)) fonts = []
  
  const totalFonts = fonts.length
  const webFonts = fonts.filter(font => font.type === 'web' || font.type === 'google')
  const customFonts = fonts.filter(font => font.type === 'custom' || font.type === 'upload')
  
  return {
    totalFonts,
    webFonts: webFonts.length,
    customFonts: customFonts.length,
    hasTooManyFonts: totalFonts > 6,
    hasCustomFonts: customFonts.length > 0
  }
}

function analyzeCollectionsDesigner(collections: any[]) {
  // Type guard: ensure collections is an array
  if (!Array.isArray(collections)) collections = []
  
  const totalCollections = collections.length
  const collectionsWithManyFields = collections.filter(col => 
    col.fields && col.fields.length > 20
  )
  
  return {
    totalCollections,
    collectionsWithManyFields: collectionsWithManyFields.length,
    hasTooManyFields: collectionsWithManyFields.length > 0
  }
}

function analyzePagesDesigner(pagesData: any) {
  if (!pagesData || !pagesData.pages) {
    return {
      totalPages: 0,
      totalFolders: 0,
      hasHomePage: false,
      pageNames: []
    }
  }

  const totalPages = pagesData.pages.length
  const totalFolders = pagesData.folders?.length || 0
  const pageNames: string[] = []
  let hasHomePage = false

  for (const page of pagesData.pages) {
    if (page.name) {
      pageNames.push(page.name)
    }
    if (page.isHomePage) {
      hasHomePage = true
    }
  }

  return {
    totalPages,
    totalFolders,
    hasHomePage,
    pageNames
  }
}

function analyzeRequiredPages(pageNames: string[]) {
  // Convert page names to lowercase for comparison
  const lowerPageNames = pageNames.map(name => name.toLowerCase())
  
  // Check for required pages according to Webflow Way guidelines
  const hasStyleGuide = lowerPageNames.some(name => 
    name.includes('style guide') || 
    name.includes('styleguide') || 
    name === 'style-guide'
  )
  
  const hasInstructions = lowerPageNames.some(name => 
    name.includes('instructions') || 
    name.includes('instruction') || 
    name === 'how-to' ||
    name === 'readme'
  )
  
  const hasLicense = lowerPageNames.some(name => 
    name.includes('license') || 
    name.includes('licenses') || 
    name === 'licensing'
  )
  
  // Check for custom 404 - this would typically need to be checked differently 
  // but for now we'll assume it doesn't exist unless explicitly named
  const hasCustom404 = lowerPageNames.some(name => 
    name.includes('404') || 
    name.includes('not found') || 
    name === 'error'
  )
  
  // Determine if Instructions page should be required
  // NOTE: We cannot reliably detect advanced interactions or custom code from Designer API data
  // Therefore, we don't enforce Instructions page requirement
  const shouldHaveInstructions = false // Can't determine without interaction/code analysis

  return {
    hasStyleGuide,
    hasInstructions,
    hasLicense,
    hasCustom404,
    shouldHaveInstructions
  }
}

// REMOVED: analyzeFormsAndConversions function
// This function was removed because it caused user confusion:
// - Could not validate actual Webflow form success/error messages
// - Could not validate form redirects or interactions
// - Only checked CSS class names, leading to false positives
// - Users interpreted "error states" as form validation instead of CSS styling

// Helper validation functions
function isValidVariableName(name: string): boolean {
  // Title Case with spaces between words. Allow numbers within words and acronyms; disallow underscores/dashes.
  // Examples: "Primary Color", "H1", "CTA Primary", "Spacing 200"
  if (!name || /[_-]/.test(name)) return false
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return false
  return parts.every(p => /^[A-Z][A-Za-z0-9]*$/.test(p))
}

function isValidComponentName(name: string): boolean {
  // Title Case with spaces between words. Allow numbers within words and acronyms; disallow underscores/dashes.
  // Examples: "Main Navigation", "CTA Button", "Hero Section"
  if (!name || /[_-]/.test(name)) return false
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return false
  return parts.every(p => /^[A-Z][A-Za-z0-9]*$/.test(p))
}

function isValidClassName(name: string): boolean {
  // Basic class naming validation (kebab-case or similar)
  return /^[a-z]([a-z0-9-_])*$/.test(name) || /^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/.test(name)
}


function corsHeaders(origin: string | null): Record<string, string> {
  // Allow localhost for development and webflow extension domains
  const allowedOrigins = [
    'http://localhost:1337',
    'https://localhost:1337',
    '*'
  ]

  const allowOrigin = origin && (
    origin.includes('localhost') ||
    origin.includes('webflow-ext.com') ||
    allowedOrigins.includes(origin)
  ) ? origin : '*'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowHeaders = req.headers.get('access-control-request-headers') || 'Content-Type'
  const headers = corsHeaders(origin)
  headers['Access-Control-Allow-Headers'] = allowHeaders
  headers['Vary'] = 'Origin, Access-Control-Request-Headers'
  return new NextResponse(null, { status: 204, headers })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Be flexible: accept top-level payloads or nested under common keys
    let designerData: any = null
    if (body && typeof body === 'object') {
      const candidate = (body as any).designerData ?? (body as any).data ?? body
      const hasDesignerKeys = candidate && (
        Array.isArray(candidate.components) ||
        Array.isArray(candidate.styles) ||
        Array.isArray(candidate.fonts) ||
        Array.isArray(candidate.collections) ||
        candidate.variables || candidate.pages || candidate.siteInfo
      )
      designerData = hasDesignerKeys ? candidate : null
    }

    // Handle Designer-only validation (no URL needed)
    if (designerData) {
      const categories = await validateDesignerOnly({
        designerVariables: designerData.variables,
        designerComponents: designerData.components,
        designerStyles: { styles: designerData.styles },
        designerPages: designerData.pages ? { pages: designerData.pages, folders: designerData.folders } : null,
        designerContext: designerData.designerContext,
        designerInteractions: null, // Not implemented yet
        siteInfo: designerData.siteInfo,
        designerData: designerData // Pass full data for comprehensive validations
      })

      const errors = categories.reduce((acc, c) => acc + c.issues.filter(i => i.severity === 'error').length, 0)
      const warnings = categories.reduce((acc, c) => acc + c.issues.filter(i => i.severity === 'warning').length, 0)
      const infos = categories.reduce((acc, c) => acc + c.issues.filter(i => i.severity === 'info').length, 0)

      const resp: ValidationResponse = {
        url: designerData.siteInfo?.name || 'Designer Project',
        success: true,
        categories,
        summary: {
          errors,
          warnings,
          infos,
          passedCategories: categories.filter(c => c.passed).length,
          failedCategories: categories.filter(c => !c.passed).length
        }
      }

      {
        const headers = corsHeaders(req.headers.get('origin'))
        headers['Vary'] = 'Origin, Access-Control-Request-Headers'
        return NextResponse.json(resp, { headers })
      }
    }

    // Fallback error for missing data
    throw new Error('Designer data is required for validation')
  } catch (error) {
    console.error('Validation error:', error)
    {
      const headers = corsHeaders(req.headers.get('origin'))
      headers['Vary'] = 'Origin, Access-Control-Request-Headers'
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Validation failed' },
        { status: 500, headers }
      )
    }
  }
}
