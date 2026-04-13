import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const SUBMIT_API_TOKEN = process.env.VALIDATION_SUBMIT_TOKEN
const AIRTABLE_BASE_ID = 'appMoIgXMTTTNIc3p'
const AIRTABLE_TABLE_ID = 'tblRwzpWoLgE9MrUm'

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https:\/\/([a-z0-9-]+\.)*webflow\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*webflow\.io$/i,
  /^https:\/\/([a-z0-9-]+\.)*webflow-ext\.com$/i
]

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = resolveCorsOrigin(origin)

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Submit-Token',
    'Access-Control-Max-Age': '86400'
  }

  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin
  }

  return headers
}

function resolveCorsOrigin(origin: string | null): string | null {
  if (!origin) return null
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin)) ? origin : null
}

function ensureOriginAllowed(origin: string | null) {
  if (origin && !resolveCorsOrigin(origin)) {
    throw new RequestError('Origin not allowed', 403)
  }
}

function getSubmitToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }

  return req.headers.get('x-submit-token')?.trim() || null
}

function escapeAirtableFormulaString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function buildResponse(req: NextRequest, body: Record<string, unknown>, status: number) {
  const headers = corsHeaders(req.headers.get('origin'))
  headers['Vary'] = 'Origin, Access-Control-Request-Headers'
  return NextResponse.json(body, { status, headers })
}

function formatValidationResults(validationResults: any): string {
  const { summary, categories } = validationResults

  let formatted = `# Validation Results\n\n`
  formatted += `**Submitted:** ${new Date().toLocaleString()}\n\n`
  formatted += `## Summary\n`
  formatted += `- Errors: ${summary.totalErrors || summary.errors || 0}\n`
  formatted += `- Warnings: ${summary.totalWarnings || summary.warnings || 0}\n`
  formatted += `- Categories Passed: ${summary.passedCategories}/${summary.passedCategories + summary.failedCategories}\n\n`

  // Group issues by category
  const failedCategories = categories.filter((cat: any) => !cat.passed || cat.issues.some((i: any) => i.severity === 'error'))

  if (failedCategories.length > 0) {
    formatted += `## Issues by Category\n\n`

    failedCategories.forEach((category: any) => {
      const errors = category.issues.filter((i: any) => i.severity === 'error')
      const warnings = category.issues.filter((i: any) => i.severity === 'warning')

      if (errors.length > 0 || warnings.length > 0) {
        formatted += `### ${category.category}\n`

        if (errors.length > 0) {
          formatted += `**Errors:**\n`
          errors.forEach((issue: any) => {
            formatted += `- ${issue.message}\n`
          })
          formatted += `\n`
        }

        if (warnings.length > 0) {
          formatted += `**Warnings:**\n`
          warnings.forEach((issue: any) => {
            formatted += `- ${issue.message}\n`
          })
          formatted += `\n`
        }
      }
    })
  } else {
    formatted += `## All validations passed! ✓\n`
  }

  return formatted
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (origin && !resolveCorsOrigin(origin)) {
    return new NextResponse(null, { status: 403 })
  }
  const allowHeaders = req.headers.get('access-control-request-headers') || 'Content-Type'
  const headers = corsHeaders(origin)
  headers['Access-Control-Allow-Headers'] = allowHeaders
  headers['Vary'] = 'Origin, Access-Control-Request-Headers'
  return new NextResponse(null, { status: 204, headers })
}

export async function POST(req: NextRequest) {
  try {
    ensureOriginAllowed(req.headers.get('origin'))

    if (!SUBMIT_API_TOKEN) {
      throw new RequestError('Submission API token not configured', 503)
    }

    const providedToken = getSubmitToken(req)
    if (!providedToken || providedToken !== SUBMIT_API_TOKEN) {
      throw new RequestError('Unauthorized submission request', 401)
    }

    const body = await req.json()
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : ''

    if (!body.validationResults) {
      throw new RequestError('Validation results are required', 400)
    }

    if (!siteId) {
      throw new RequestError('Site ID is required to submit validation results', 400)
    }

    if (!AIRTABLE_API_KEY) {
      throw new RequestError('Airtable API key not configured', 503)
    }

    // Log the siteId being searched
    console.log('Searching Airtable for Site ID:', siteId)

    // Search for the template record by Site ID (UID field)
    const searchParams = new URLSearchParams({
      filterByFormula: `{ℹ️UID}='${escapeAirtableFormulaString(siteId)}'`
    })
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?${searchParams.toString()}`

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      }
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('Airtable search error:', errorText)
      throw new Error('Failed to search Airtable for template')
    }

    const searchData = await searchResponse.json()
    console.log('Airtable search results:', searchData.records?.length || 0, 'records found')

    if (!searchData.records || searchData.records.length === 0) {
      throw new RequestError(`Template not found in Airtable. Please submit your template for review first. (Searched for Site ID: ${siteId})`, 404)
    }

    const recordId = searchData.records[0].id
    const formattedResults = formatValidationResults(body.validationResults)

    // Update the Validation notes field
    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'ℹ️Validation notes': formattedResults
        }
      })
    })

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text()
      console.error('Airtable update error:', errorData)
      throw new Error('Failed to update validation results in Airtable')
    }

    return buildResponse(
      req,
      {
        success: true,
        message: 'Validation results submitted successfully to Airtable',
        submittedAt: new Date().toISOString(),
        recordId
      },
      200
    )
  } catch (error) {
    console.error('Submission error:', error)
    const status = error instanceof RequestError ? error.status : 500
    return buildResponse(
      req,
      {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed'
      },
      status
    )
  }
}
