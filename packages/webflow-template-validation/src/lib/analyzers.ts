import * as cheerio from 'cheerio'

export interface FetchedAssets {
  html: string
  cssTexts: string[]
}

export async function fetchSiteAssets(url: string, maxStylesheets: number = 5): Promise<FetchedAssets> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const stylesheets: string[] = []
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      try {
        const abs = new URL(href, url).toString()
        stylesheets.push(abs)
      } catch {}
    }
  })

  // Include inline <style> blocks as a pseudo stylesheet
  const inlineStyles: string[] = []
  $('style').each((_, el) => {
    const css = $(el).html() || ''
    if (css.trim().length > 0) inlineStyles.push(css)
  })

  const toFetch = stylesheets.slice(0, maxStylesheets)
  const cssTexts: string[] = [...inlineStyles]
  if (toFetch.length > 0) {
    const cssRes = await Promise.allSettled(
      toFetch.map(href => fetch(href, { cache: 'no-store' }))
    )
    const texts = await Promise.all(
      cssRes.map(async r => {
        if (r.status === 'fulfilled' && r.value.ok) return r.value.text()
        return ''
      })
    )
    texts.forEach(t => { if (t) cssTexts.push(t) })
  }

  return { html, cssTexts }
}

export interface NamingAnalysisResult {
  dominantScheme: string | null
  schemeCounts: Record<string, number>
  outliers: { className: string; scheme: string | null; sampleElements: string[] }[]
  comboClassViolations: { classList: string; count: number; element: string; suggestion?: string }[]
}

const regexes = {
  snake: /^[a-z0-9]+(?:_[a-z0-9]+)+$/,
  kebab: /^[a-z0-9]+(?:-[a-z0-9]+)+$/,
  camel: /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+$/,
  pascal: /^[A-Z][a-z0-9]*(?:[A-Z][a-z0-9]*)+$/,
  bem: /^[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$/
}

function detectScheme(className: string): string | null {
  if (regexes.bem.test(className)) return 'BEM'
  if (regexes.snake.test(className)) return 'snake_case'
  if (regexes.kebab.test(className)) return 'kebab-case'
  if (regexes.camel.test(className)) return 'camelCase'
  if (regexes.pascal.test(className)) return 'PascalCase'
  return null
}

export function analyzeNaming(html: string): NamingAnalysisResult {
  const $ = cheerio.load(html)
  const schemeCounts: Record<string, number> = { BEM: 0, snake_case: 0, 'kebab-case': 0, camelCase: 0, PascalCase: 0, unknown: 0 }
  const outliers: NamingAnalysisResult['outliers'] = []
  const comboClassViolations: NamingAnalysisResult['comboClassViolations'] = []

  const classNameSet = new Set<string>()

  // Minimal CSS class selector escaper for Cheerio selectors in Node
  const escapeClassForSelector = (className: string): string => {
    return className.replace(/([!"#$%&'()*+,\./:;<=>?@\[\\\]^`{|}~])/g, '\\$1')
  }

  $('*[class]').each((_, el) => {
    const classes = ($(el).attr('class') || '').trim().split(/\s+/).filter(Boolean)

    // Combo class count per element
    if (classes.length > 4) {
      const elementId = $(el).attr('id')
      const elementContext = elementId ? `id="${elementId}"` : $(el).attr('class')?.split(' ').slice(0, 2).join(' ')
      
      comboClassViolations.push({
        classList: classes.join(' '),
        count: classes.length,
        element: `<${(el as any).tagName}${elementContext ? ` ${elementContext}` : ''}> - Reduce to max 4 combo classes`,
        suggestion: `Consider consolidating classes or using CSS custom properties. Current: ${classes.length} classes.`
      })
    }

    for (const c of classes) {
      if (!classNameSet.has(c)) {
        classNameSet.add(c)
        const scheme = detectScheme(c)
        if (scheme) schemeCounts[scheme] = (schemeCounts[scheme] || 0) + 1
        else schemeCounts['unknown'] = (schemeCounts['unknown'] || 0) + 1
      }
    }
  })

  // Determine dominant scheme
  let dominant: string | null = null
  let max = 0
  for (const [scheme, count] of Object.entries(schemeCounts)) {
    if (scheme === 'unknown') continue
    if (count > max) { max = count; dominant = scheme }
  }

  // Identify outlier class names (that don't match dominant scheme)
  if (dominant) {
    for (const c of classNameSet) {
      const scheme = detectScheme(c)
      if (scheme && scheme !== dominant) {
        // Find up to 2 sample elements using this class
        const els = $(`.${escapeClassForSelector(c)}`).slice(0, 2).toArray().map(e => `<${(e as any).tagName}>`)
        outliers.push({ className: c, scheme, sampleElements: els })
      }
    }
  }

  return { dominantScheme: dominant, schemeCounts, outliers, comboClassViolations }
}

export interface TypographyAnalysisResult {
  placeholderMatches: { text: string; context: string; location?: string }[]
  lineHeight: { percentCount: number; nonPercentCount: number; samples: string[]; recommendation?: string }
  bodyFontDefined: boolean
}

const PLACEHOLDER_PATTERNS = [
  /lorem\s+ipsum/i,
  /your\s+(text|content)\s+here/i,
  /placeholder/i,
  /type\s+here/i,
  /headline\s+goes\s+here/i,
  /subtitle\s+goes\s+here/i
]

export function analyzeTypography(html: string, cssTexts: string[]): TypographyAnalysisResult {
  const $ = cheerio.load(html)
  const textNodes: string[] = []
  $('body *').each((_, el) => {
    const t = $(el).text().trim()
    if (t) textNodes.push(t)
  })

  const placeholderMatches: TypographyAnalysisResult['placeholderMatches'] = []
  $('body *').each((index, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    if (text) {
      for (const re of PLACEHOLDER_PATTERNS) {
        if (re.test(text)) {
          const tagName = (el as any).tagName?.toLowerCase()
          const className = $el.attr('class')
          const elementInfo = className ? `${tagName}.${className.split(' ').slice(0, 2).join('.')}` : tagName
          
          placeholderMatches.push({ 
            text: text.slice(0, 120), 
            context: 'text',
            location: `Found in <${elementInfo}> - Replace with actual content`
          })
          break
        }
      }
    }
  })

  // CSS line-height analysis
  let percentCount = 0
  let nonPercentCount = 0
  const samples: string[] = []
  const cssCombined = cssTexts.join('\n')
  const declRe = /line-height\s*:\s*([^;}{]+)/gi
  let m: RegExpExecArray | null
  while ((m = declRe.exec(cssCombined))) {
    const val = m[1].trim()
    if (val.endsWith('%')) percentCount++
    else nonPercentCount++
    if (samples.length < 5) samples.push(`line-height: ${val}`)
  }

  // Body font defined?
  const bodyFontRe = /(^|[{}\s])body\s*{[^}]*font-family\s*:\s*[^;}]+/i
  const bodyFontDefined = bodyFontRe.test(cssCombined)

  return { placeholderMatches, lineHeight: { percentCount, nonPercentCount, samples }, bodyFontDefined }
}

export interface StylesAnalysisResult {
  baselineTags: { tag: string; present: boolean }[]
  statesPresent: { hover: boolean; active: boolean; focus: boolean }
  usesCSSVariables: boolean
}

const BASELINE_TAGS = ['h1','h2','h3','h4','h5','h6','p','ul','ol','blockquote','figure','figcaption','a']

export function analyzeStyles(cssTexts: string[]): StylesAnalysisResult {
  const cssCombined = cssTexts.join('\n')
  const baselineTags = BASELINE_TAGS.map(tag => {
    const re = new RegExp(`(^|[{}\\s])${tag}\\b`) // naive presence check
    return { tag, present: re.test(cssCombined) }
  })

  const statesPresent = {
    hover: /:hover\b/.test(cssCombined),
    active: /:active\b/.test(cssCombined),
    focus: /:focus\b/.test(cssCombined)
  }

  const usesCSSVariables = /var\s*\(/.test(cssCombined)

  return { baselineTags, statesPresent, usesCSSVariables }
}

// ===== Accessibility analysis =====

export interface AccessibilityAnalysisResult {
  h1Count: number
  headingHierarchyIssues: Array<{ level: number; position: number; issue: string; text?: string }>
  missingAltTexts: Array<{ src: string; context: string; position?: number }>
  hasMultipleH1s: boolean
  hasSkippedHeadings: boolean
  missingAltCount: number
}

function isWebflowBackgroundVideoPosterImage($img: cheerio.Cheerio<any>): boolean {
  return $img.attr('alt') === '' && $img.closest('.w-background-video, [data-video-urls][data-poster-url]').length > 0
}

export function analyzeAccessibility(html: string): AccessibilityAnalysisResult {
  const $ = cheerio.load(html)
  
  // H1 validation
  const h1Elements = $('h1').toArray()
  const h1Count = h1Elements.length
  const hasMultipleH1s = h1Count > 1

  // Heading hierarchy validation
  const headings = $('h1, h2, h3, h4, h5, h6').toArray()
  const headingHierarchyIssues: AccessibilityAnalysisResult['headingHierarchyIssues'] = []
  let hasSkippedHeadings = false

  let lastLevel = 0
  headings.forEach((heading, index) => {
    const tagName = (heading as any).tagName.toLowerCase()
    const currentLevel = parseInt(tagName.substring(1), 10)
    const text = $(heading).text().trim().substring(0, 60)
    const className = $(heading).attr('class')
    const locationInfo = className ? ` (class: ${className.split(' ').slice(0, 2).join(' ')})` : ''
    
    if (index === 0 && currentLevel !== 1) {
      headingHierarchyIssues.push({
        level: currentLevel,
        position: index + 1,
        issue: `First heading should be H1, found H${currentLevel}${locationInfo}`,
        text: text
      })
      hasSkippedHeadings = true
    } else if (index > 0 && currentLevel > lastLevel + 1) {
      headingHierarchyIssues.push({
        level: currentLevel,
        position: index + 1,
        issue: `Skipped from H${lastLevel} to H${currentLevel}${locationInfo}. Add H${lastLevel + 1} first.`,
        text: text
      })
      hasSkippedHeadings = true
    }
    
    lastLevel = currentLevel
  })

  // Alt text validation
  const images = $('img').toArray()
  const missingAltTexts: AccessibilityAnalysisResult['missingAltTexts'] = []
  
  images.forEach((img, index) => {
    const $img = $(img)
    const alt = $img.attr('alt')
    const src = $img.attr('src') || 'unknown'
    
    if (alt === undefined || (alt.trim() === '' && !isWebflowBackgroundVideoPosterImage($img))) {
      const context = $img.closest('[class]').attr('class') || 'unknown'
      const parentElement = $img.parent().get(0)?.tagName?.toLowerCase() || 'unknown'
      const elementPosition = index + 1
      
      missingAltTexts.push({ 
        src: src.substring(0, 80), 
        context: `Image ${elementPosition}: ${parentElement} > img${context !== 'unknown' ? ` (class: ${context.split(' ').slice(0, 2).join(' ')})` : ''}`,
        position: elementPosition
      })
    }
  })

  return {
    h1Count,
    headingHierarchyIssues,
    missingAltTexts,
    hasMultipleH1s,
    hasSkippedHeadings,
    missingAltCount: missingAltTexts.length
  }
}
