'use client'

import { useState } from 'react'

type ValidationResult = {
  success: boolean
  categories: {
    category: string
    passed: boolean
    issues: {
      severity: string
      message: string
      details?: {
        howToFix?: string
        location?: string
      }
    }[]
    stats?: any
  }[]
  summary: {
    errors: number
    warnings: number
    infos: number
    passedCategories: number
    failedCategories: number
  }
}

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ValidationResult | null>(null)

  const validateProject = async () => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      // Get Webflow Designer API
      const webflow = (window as any).webflow
      if (!webflow) {
        throw new Error('Webflow Designer API not available. Please ensure this extension is running in Webflow Designer.')
      }

      // Collect project data
      const projectData = await collectProjectData(webflow)
      
      // Send to validation API
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designerData: projectData })
      })
      
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Validation failed')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  async function collectProjectData(webflow: any) {
    console.log('Starting project data collection with available API methods...')
    
    // First, let's see what methods are actually available
    console.log('Webflow API object methods:', Object.getOwnPropertyNames(webflow))
    console.log('Webflow API object:', webflow)
    
    const data: any = {
      variables: null,
      components: [],
      styles: [],
      pages: null,
      siteInfo: null,
      designerContext: null,
      collectionMetadata: {
        variableCollections: 0,
        totalComponents: 0,
        totalStyles: 0,
        totalPages: 0,
        totalFolders: 0,
        timestamp: new Date().toISOString()
      }
    }

    // Basic site info
    try {
      data.siteInfo = {
        name: 'Current Project',
        timestamp: new Date().toISOString()
      }
      console.log('Basic site info set')
    } catch (error) {
      console.warn('Could not set site info:', error)
    }

    // Variables - use available methods
    try {
      if (webflow.getVariableCollections) {
        const collections = await webflow.getVariableCollections() || []
        const variableData: any[] = []
        
        for (const collection of collections) {
          try {
            const collectionName = collection.name || `Collection ${collection.id}`
            const variables = collection.variables || []
            
            const variableList = []
            for (const variable of variables) {
              variableList.push({
                id: variable.id,
                name: variable.name || null,
                type: variable.type || null,
                value: variable.value || null
              })
            }
            
            variableData.push({
              id: collection.id,
              name: collectionName,
              variables: variableList,
              variableCount: variableList.length
            })
          } catch (collectionError) {
            console.warn('Error processing variable collection:', collectionError)
          }
        }
        
        if (variableData.length > 0) {
          data.variables = { collections: variableData }
          data.collectionMetadata.variableCollections = variableData.length
          console.log(`Variable collections collected: ${variableData.length}`)
        }
      }
    } catch (error) {
      console.warn('Could not fetch variable collections:', error)
    }

    // Components - use available methods with async getName()
    try {
      if (webflow.getComponents || webflow.getAllComponents) {
        const components = await (webflow.getAllComponents ? webflow.getAllComponents() : webflow.getComponents()) || []
        const componentData = []
        
        for (const component of components) {
          try {
            // Use async getName() method as shown in Webflow API docs
            const name = component.getName ? await component.getName() : (component.name || null)
            const id = component.getId ? await component.getId() : component.id
            
            if (name) {
              componentData.push({
                id: id,
                name: name,
                type: component.type || 'component'
              })
            }
          } catch (compError) {
            console.warn('Error processing component:', compError)
            // Fallback to direct property access
            try {
              if (component.name) {
                componentData.push({
                  id: component.id,
                  name: component.name,
                  type: component.type || 'component'
                })
              }
            } catch (fallbackError) {
              console.warn('Fallback component processing also failed:', fallbackError)
            }
          }
        }
        
        data.components = componentData
        data.collectionMetadata.totalComponents = componentData.length
        console.log(`Components collected: ${componentData.length}`, componentData)
      }
    } catch (error) {
      console.warn('Could not fetch components:', error)
    }

    // Styles - use available methods with async getName()
    try {
      if (webflow.getStyles || webflow.getAllStyles) {
        const styles = await (webflow.getAllStyles ? webflow.getAllStyles() : webflow.getStyles()) || []
        const styleData = []
        
        for (const style of styles) {
          try {
            // Use async getName() method as shown in Webflow API docs
            const name = style.getName ? await style.getName() : (style.name || null)
            const id = style.getId ? await style.getId() : style.id
            
            if (name && !name.startsWith('_')) {
              styleData.push({
                id: id,
                name: name,
                type: style.type || 'class'
              })
            }
          } catch (styleError) {
            console.warn('Error processing style:', styleError)
            // Fallback to direct property access
            try {
              if (style.name && !style.name.startsWith('_')) {
                styleData.push({
                  id: style.id,
                  name: style.name,
                  type: style.type || 'class'
                })
              }
            } catch (fallbackError) {
              console.warn('Fallback style processing also failed:', fallbackError)
            }
          }
        }
        
        data.styles = styleData
        data.collectionMetadata.totalStyles = styleData.length
        console.log(`Styles collected: ${styleData.length}`, styleData.slice(0, 5)) // Log first 5 for debugging
      }
    } catch (error) {
      console.warn('Could not fetch styles:', error)
    }

    // Pages - use correct method
    try {
      if (webflow.getPages) {
        const pages = await webflow.getPages() || []
        const pageData = []
        
        for (const page of pages) {
          try {
            pageData.push({
              id: page.id,
              name: page.name || page.title || null,
              slug: page.slug || null,
              isHomePage: page.isHome || page.isHomePage || false
            })
          } catch (pageError) {
            console.warn('Error processing page:', pageError)
          }
        }
        
        data.pages = {
          pages: pageData,
          folders: [], // Folders may not be available in basic API
          total: pageData.length
        }
        data.collectionMetadata.totalPages = pageData.length
        console.log(`Pages collected: ${pageData.length}`)
      }
    } catch (error) {
      console.warn('Could not fetch pages:', error)
    }

    // Designer Context - basic info
    try {
      data.designerContext = {
        timestamp: new Date().toISOString(),
        hasWebflowAPI: !!webflow
      }
    } catch (error) {
      console.warn('Could not collect designer context:', error)
    }

    console.log('Project data collection complete:', {
      variables: data.collectionMetadata.variableCollections,
      components: data.collectionMetadata.totalComponents,
      styles: data.collectionMetadata.totalStyles,
      pages: data.collectionMetadata.totalPages
    })

    return data
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #f9fafb, #e5e7eb)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: 36, 
            fontWeight: 800, 
            marginBottom: 8,
            background: 'linear-gradient(to right, #111827, #6b7280)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Webflow Way Validator
          </h1>
          <p style={{ color: '#6b7280', fontSize: 16 }}>
            Validate your project against Webflow best practices
          </p>
        </div>

        {/* Main Action Card */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 16, 
          padding: 32, 
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
          marginBottom: 24
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
              Ready to Validate
            </h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              Click below to analyze your current project
            </p>
            
            <button
              onClick={validateProject}
              disabled={loading}
              style={{
                padding: '14px 32px',
                borderRadius: 8,
                background: loading ? '#9ca3af' : '#111827',
                color: '#fff',
                border: 'none',
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#1f2937')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#111827')}
            >
              {loading ? 'Analyzing Project...' : 'Validate This Project'}
            </button>
          </div>

          {/* What Gets Validated */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
              WHAT WE VALIDATE
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#059669' }}>✓</span>
                <span style={{ fontSize: 14 }}>Webflow Variables setup</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#059669' }}>✓</span>
                <span style={{ fontSize: 14 }}>Component organization</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#059669' }}>✓</span>
                <span style={{ fontSize: 14 }}>Class naming conventions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#059669' }}>✓</span>
                <span style={{ fontSize: 14 }}>Typography consistency</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#059669' }}>✓</span>
                <span style={{ fontSize: 14 }}>Page structure</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#059669' }}>✓</span>
                <span style={{ fontSize: 14 }}>Best practices</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: 16,
            borderRadius: 8,
            marginBottom: 24
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Display */}
        {data && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}>
            {/* Summary Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: 16,
              marginBottom: 32,
              paddingBottom: 24,
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{data.summary.errors}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Errors</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{data.summary.warnings}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Warnings</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>{data.summary.infos}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Info</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{data.summary.passedCategories}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Passed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{data.summary.failedCategories}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Failed</div>
              </div>
            </div>

            {/* Category Results */}
            {data.categories.map((cat, idx) => (
              <div key={idx} style={{
                borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none',
                paddingTop: idx > 0 ? 24 : 0,
                marginTop: idx > 0 ? 24 : 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{cat.category}</h3>
                  <span style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: cat.passed ? '#dcfce7' : '#fee2e2',
                    color: cat.passed ? '#166534' : '#991b1b',
                    fontWeight: 500
                  }}>
                    {cat.passed ? '✓ PASS' : '⚠ NEEDS ATTENTION'}
                  </span>
                </div>

                {cat.issues.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cat.issues.map((issue, j) => (
                      <div key={j} style={{
                        padding: 12,
                        borderRadius: 6,
                        background: issue.severity === 'error' ? '#fef2f2' :
                                   issue.severity === 'warning' ? '#fffbeb' : '#f0f9ff',
                        border: `1px solid ${
                          issue.severity === 'error' ? '#fecaca' :
                          issue.severity === 'warning' ? '#fde68a' : '#bfdbfe'
                        }`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: issue.severity === 'error' ? '#dc2626' :
                                       issue.severity === 'warning' ? '#d97706' : '#2563eb',
                            color: '#fff',
                            flexShrink: 0
                          }}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{issue.message}</div>
                            {issue.details?.howToFix && (
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                                <strong>💡 How to fix:</strong> {issue.details.howToFix}
                              </div>
                            )}
                            {issue.details?.location && (
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                📍 {issue.details.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#059669', fontSize: 14 }}>
                    ✓ All checks passed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}