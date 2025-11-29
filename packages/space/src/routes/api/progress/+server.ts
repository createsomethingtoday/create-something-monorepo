import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

/**
 * Progress Persistence API
 *
 * Handles saving/loading/clearing user progress in KV storage
 */

export const GET: RequestHandler = async ({ url, platform }) => {
  const key = url.searchParams.get('key')

  if (!key) {
    return json({ error: 'Missing key parameter' }, { status: 400 })
  }

  try {
    const cache = platform?.env?.CACHE

    if (!cache) {
      return json({ error: 'KV storage not available' }, { status: 503 })
    }

    const value = await cache.get(key)

    if (!value) {
      return json({ error: 'Progress not found' }, { status: 404 })
    }

    const state = JSON.parse(value)

    return json({ state }, { status: 200 })
  } catch (error) {
    console.error('Error loading progress:', error)
    return json({ error: 'Failed to load progress' }, { status: 500 })
  }
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const { key, state, ttl } = (await request.json()) as { key?: string; state?: unknown; ttl?: number }

    if (!key || !state) {
      return json({ error: 'Missing key or state' }, { status: 400 })
    }

    const cache = platform?.env?.CACHE

    if (!cache) {
      return json({ error: 'KV storage not available' }, { status: 503 })
    }

    await cache.put(key, JSON.stringify(state), {
      expirationTtl: ttl || 604800 // Default 7 days
    })

    return json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error saving progress:', error)
    return json({ error: 'Failed to save progress' }, { status: 500 })
  }
}

export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const { key } = (await request.json()) as { key?: string }

    if (!key) {
      return json({ error: 'Missing key parameter' }, { status: 400 })
    }

    const cache = platform?.env?.CACHE

    if (!cache) {
      return json({ error: 'KV storage not available' }, { status: 503 })
    }

    await cache.delete(key)

    return json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error clearing progress:', error)
    return json({ error: 'Failed to clear progress' }, { status: 500 })
  }
}
