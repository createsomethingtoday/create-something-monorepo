#!/usr/bin/env npx tsx
/**
 * Test script with cookie injection to bypass login.
 * 
 * Steps:
 * 1. Log into Zoom in your regular browser
 * 2. Export cookies using a browser extension (EditThisCookie, Cookie-Editor, etc.)
 * 3. Save cookies as JSON to cookies.json in this directory
 * 4. Run this script
 * 
 * Cookie format (array of objects):
 * [
 *   { "name": "cookie_name", "value": "cookie_value", "domain": ".zoom.us", "path": "/" },
 *   ...
 * ]
 */

import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const COOKIES_FILE = path.join(process.cwd(), 'cookies.json');
const ZOOM_CLIPS_LIST_URL = 'https://zoom.us/clips';
const ZOOM_CLIP_URL = 'https://zoom.us/clips/share/q5Gcj9YHRguEHYFA0PA_3Q';

interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function loadCookies(): Promise<Cookie[]> {
  if (!fs.existsSync(COOKIES_FILE)) {
    console.error(`\n❌ Cookies file not found: ${COOKIES_FILE}`);
    console.error('\nTo create it:');
    console.error('1. Log into Zoom in your browser');
    console.error('2. Install "EditThisCookie" or "Cookie-Editor" extension');
    console.error('3. Export all cookies for zoom.us');
    console.error('4. Save as cookies.json in this directory\n');
    process.exit(1);
  }

  const raw = fs.readFileSync(COOKIES_FILE, 'utf-8');
  const cookies = JSON.parse(raw);
  
  // Normalize cookie format (different extensions export differently)
  return cookies.map((c: any) => ({
    name: c.name,
    value: c.value,
    domain: c.domain || '.zoom.us',
    path: c.path || '/',
    expires: c.expirationDate || c.expires,
    httpOnly: c.httpOnly ?? false,
    secure: c.secure ?? true,
    sameSite: c.sameSite || 'Lax'
  }));
}

async function injectCookies(page: Page, cookies: Cookie[]): Promise<void> {
  // Filter to zoom.us cookies only
  const zoomCookies = cookies.filter(c => 
    c.domain?.includes('zoom.us') || c.domain?.includes('zoom.com')
  );
  
  console.log(`Injecting ${zoomCookies.length} Zoom cookies...`);
  
  for (const cookie of zoomCookies) {
    try {
      await page.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      });
    } catch (e) {
      // Some cookies may fail, that's ok
    }
  }
}

async function main() {
  console.log('\n🍪 Zoom Clips - Cookie Injection Mode\n');
  console.log('=' .repeat(60));
  
  // Load cookies
  const cookies = await loadCookies();
  console.log(`✓ Loaded ${cookies.length} cookies from ${COOKIES_FILE}`);
  
  // Check for API key
  if (!process.env.STEEL_API_KEY) {
    console.error('❌ STEEL_API_KEY not found in environment');
    process.exit(1);
  }
  console.log('✓ Steel API key found');
  
  try {
    // Create Steel client
    const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
    
    console.log('\n📡 Creating Steel browser session...');
    const session = await client.sessions.create({
      timeout: 3600000 // 1 hour
    });
    
    // Connect Puppeteer
    const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`;
    const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to zoom.us first (needed to set cookies for the domain)
    console.log('Navigating to zoom.us to set cookies...');
    await page.goto('https://zoom.us', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Inject cookies
    await injectCookies(page, cookies);
    
    // Now navigate to clips page
    console.log('\n📋 Navigating to Zoom Clips...');
    await page.goto(ZOOM_CLIPS_LIST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check if we're logged in
    const isLoggedIn = !currentUrl.includes('signin') && !currentUrl.includes('login');
    
    console.log('\n' + '=' .repeat(60));
    if (isLoggedIn) {
      console.log('✅ SUCCESS! Logged in via cookies!');
    } else {
      console.log('❌ Still redirected to login. Cookies may be expired or incomplete.');
    }
    console.log('=' .repeat(60));
    
    const liveViewUrl = (session as any).sessionViewerUrl || `https://app.steel.dev/sessions/${session.id}`;
    console.log(`\n🔗 Live View URL:\n   ${liveViewUrl}\n`);
    
    if (isLoggedIn) {
      console.log('You should now see your Zoom Clips in the live view!');
      console.log('Navigate to a clip and expand the transcript.');
    } else {
      console.log('The cookies may have expired. Try exporting fresh cookies.');
    }
    
    await prompt('\nPress Enter when done to close session...');
    
    // Cleanup
    await browser.close();
    await client.sessions.release(session.id);
    console.log('\n✅ Session closed.');
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
