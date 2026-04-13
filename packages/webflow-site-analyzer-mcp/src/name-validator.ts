/**
 * Template Name Validator
 *
 * Ported from the Webflow submission form's client-side validation script.
 * Checks naming policy compliance + uniqueness via the Vercel API.
 */

// Primary tags — exact match forbidden
const PRIMARY_TAGS = ['Accessories', 'Accounting', 'Admin', 'Agency', 'Agriculture', 'App', 'Architecture', 'Artist', 'Attorney', 'Automotive', 'Band', 'Bank', 'Bar', 'Barber', 'Beauty', 'Beauty & Wellness', 'Blog', 'Book', 'Business', 'Cafe', 'Cars', 'Charity', 'Church', 'Coaching', 'Coffee Shop', 'College', 'Coming Soon', 'Conference', 'Construction', 'Consulting', 'Corporate', 'Countdown', 'Creative', 'CV', 'Dance', 'Dashboard', 'Delivery', 'Dentist', 'Design', 'Designer', 'Directory', 'DJ', 'Doctor', 'Documentation', 'Donation', 'Education', 'Entertainment', 'Error', 'Event', 'Farm', 'Fashion', 'Film', 'Finance', 'Fitness', 'Florist', 'Food', 'Food & Drink', 'Furniture', 'Game', 'Guesthouse', 'Gym', 'Health', 'Help center', 'Homeware', 'Hospital', 'Hostel', 'Hotel', 'Inn', 'Insurance', 'Interior design', 'Investment', 'IT company', 'Jewelry', 'Job Portal', 'Kids', 'Landing page', 'Law Firm', 'Learning', 'Lifestyle', 'Logistics', 'Magazine', 'Marketing', 'Marketplace', 'Massage', 'Medical', 'Mobile', 'Movie', 'Multi Layout', 'Music', 'Musician', 'News', 'Newsletter', 'Newspaper', 'Nonprofit', 'One Page', 'Other', 'Personal', 'Pets', 'Photography', 'Photography & Video', 'Podcast', 'Political', 'Portfolio', 'Profile', 'Radio', 'Real Estate', 'Recipe', 'Recruitment', 'Religion', 'Restaurant', 'Resume', 'Retail', 'SaaS', 'Salon', 'School', 'Shop', 'Small Business', 'Soccer', 'Social', 'Software', 'Spa', 'Sports', 'Startup', 'Support', 'Technology', 'Therapy', 'Tourism', 'Transport', 'Travel', 'UI Kit', 'Under Construction', 'University', 'Veterinary', 'Video', 'Wedding', 'Wellness', 'Winery'];

// Forbidden category names — exact match forbidden
const FORBIDDEN_CATEGORY_NAMES = ['Advocacy & Campaigns', 'Agency', 'Agriculture', 'App', 'Architecture', 'Architecture & Design', 'Art & Design Blog', 'Arts & Crafts Store', 'Bakery', 'Banking & Investment', 'Bar & Nightclub', 'Beauty & Wellness Store', 'Blog & Editorial', 'Blockchain, Cryptocurrency & NFTs', 'Book', 'Books & Publishers Store', 'Business & Finance Blog', 'Cafe & Coffee Shop', 'Cars', 'Catering & Delivery', 'Charity & Fundraising', 'Chiropractor & Physiotherapist', 'Classes & Courses', 'Cleaning', 'Clinic & Pharmacy', 'College / University', 'Coming Soon', 'Community & Non-Profits', 'Construction & Home Services', 'Consulting & Coaching', 'Creative Agency', 'Creators & Influencers', 'Culture, Performance & Entertainment', 'Dance', 'Dentist', 'Design Portfolio', 'Digital Products Store', 'Documentation', 'Documentation & Help Center', 'Doctor', 'Early Education', 'Education', 'Electronics Store', 'Environment', 'Event Production', 'Events', 'Events, Conferences & Meetups', 'Fashion & Clothing Store', 'Film & TV', 'Finance & Accounting', 'Fitness & Gym', 'Florist & Plants Store', 'Food & Drink', 'Food & Drinks Store', 'Food & Recipe Blog', 'Foundations & NGO', 'Freelancers & Consultants', 'Furniture', 'Gallery & Museum', 'Gaming', 'Government & Political', 'Hair & Beauty', 'Health & Nutrition', 'Health & Wellness', 'Home Construction', 'Home Decor Store', 'Home Services & Maintenance', 'Hospital', 'Hotels & Lodging', 'HR & Recruiting', 'Insurance', 'Interior Design', 'Jewelry & Accessories Store', 'Job Portal', 'Kids & Babies Store', 'Landing', 'Landscaping & Gardening', 'Law Firm & Attorney', 'Lifestyle Blog', 'Magazine', 'Makeup & Cosmetics', 'Marketing & Advertising', 'Medical', 'Mobile App', 'Music & Audio', 'Music Events & Festivals', 'Music Industry & Promotion', 'Musicians & Bands', 'Nature & Conservation', 'News', 'Newsletter', 'Online Education', 'Outdoor & Adventure', 'Personal Blog', 'Pets & Animals Store', 'Photography & Video Portfolio', 'Podcast & Radio', 'Political', 'Portfolio & Agency', 'Product Launch / Coming Soon', 'Professional Services', 'Property Management & HOA', 'Public services', 'Real Estate', 'Real Estate & Property Management', 'Recruiting', 'Religious & Spiritual', 'Renewable energy', 'Residential Design', 'Restaurant', 'Resume & Personal', 'Resume & CV', 'Retail & E-Commerce', 'Salon & Barbershop', 'Schools', 'Software & SaaS', 'Spa', 'Sports', 'Sports & Outdoors Store', 'Startup', 'Support/Help center', 'Sustainability', 'Tattoo', 'Tech', 'Technology', 'Therapy & Psychology', 'Tourism', 'Transport', 'Transportation & Automotive', 'Travel & Hospitality', 'Travel Blog', 'UI Kit', 'UI Kit & Landing Page Components', 'Veterinary', 'Volunteer & Community', 'Vows', 'Waitlist', 'Weddings', 'Weddings & Events', 'Winery'];

const DERIVATIVE_STEM_TERMS = new Set(['craft']);
const GENERIC_TRAILING_WORDS = new Set(['agency', 'blog', 'center', 'centre', 'components', 'page', 'pages', 'portfolio', 'production', 'service', 'services', 'shop', 'store']);
const IGNORED_DERIVED_TERMS = new Set(['arts']);

function normalizeForSearch(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function singularizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (lower.endsWith('s') && !lower.endsWith('ss') && word.length > 4) return word.slice(0, -1);
  return word;
}

function cleanDerivedPart(part: string): string {
  const words = part.trim().split(/\s+/).filter(Boolean).map(singularizeWord);
  while (words.length > 1 && GENERIC_TRAILING_WORDS.has(words[words.length - 1]!.toLowerCase())) {
    words.pop();
  }
  const cleaned = words.join(' ');
  const normalized = normalizeForSearch(cleaned);
  if (!normalized || normalized.length < 4 || IGNORED_DERIVED_TERMS.has(normalized)) return '';
  return cleaned;
}

interface ForbiddenEntry {
  label: string;
  normalized: string;
  mode: 'exact' | 'derivative';
  regex: RegExp;
}

function makeExactRegex(term: string): RegExp {
  const normalized = normalizeForSearch(term).replace(/\s+/g, '\\s+');
  return new RegExp('(?:^|[^a-z0-9])' + normalized + '(?:$|[^a-z0-9])', 'i');
}

function makeDerivativeRegex(term: string): RegExp {
  const normalized = normalizeForSearch(term).replace(/\s+/g, '\\s+');
  return new RegExp('(?:^|[^a-z0-9])' + normalized + '[a-z0-9-]*', 'i');
}

function buildForbiddenEntries(): ForbiddenEntry[] {
  const entries: ForbiddenEntry[] = [];
  const seen = new Set<string>();

  function add(label: string, matchText: string, mode: 'exact' | 'derivative') {
    const normalized = normalizeForSearch(matchText);
    const key = `${mode}::${normalized}`;
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    entries.push({
      label,
      normalized,
      mode,
      regex: mode === 'derivative' ? makeDerivativeRegex(matchText) : makeExactRegex(matchText),
    });
  }

  for (const term of PRIMARY_TAGS) add(term, term, 'exact');
  for (const term of FORBIDDEN_CATEGORY_NAMES) add(term, term, 'exact');

  for (const term of FORBIDDEN_CATEGORY_NAMES) {
    const parts = term.split(/\s*(?:&|\/|,)\s*/g).map(cleanDerivedPart).filter(Boolean);
    for (const part of parts) {
      const normalizedPart = normalizeForSearch(part);
      const mode = DERIVATIVE_STEM_TERMS.has(normalizedPart) ? 'derivative' : 'exact';
      add(part, part, mode);
    }
  }

  return entries.sort((a, b) => b.normalized.length - a.normalized.length);
}

const FORBIDDEN_ENTRIES = buildForbiddenEntries();

export interface NameValidationResult {
  name: string;
  compliant: boolean;
  issues: string[];
  uniquenessChecked: boolean;
  isUnique: boolean | null;
}

/**
 * Validate a template name against Webflow naming policy.
 * Mirrors the submission form's client-side validation exactly.
 */
export function validateTemplateName(name: string): Omit<NameValidationResult, 'uniquenessChecked' | 'isUnique'> {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  const issues: string[] = [];

  if (!trimmed) {
    issues.push('Name cannot be empty');
    return { name: trimmed, compliant: false, issues };
  }

  // Capitalization
  const firstWord = trimmed.split(/\s+/)[0] || '';
  if (firstWord[0] !== firstWord[0]?.toUpperCase()) {
    issues.push('Name must be capitalized');
  }

  // Emoji
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  if (emojiPattern.test(trimmed)) {
    issues.push('Name cannot contain emojis');
  }

  // "AI" term
  if (/\bai\b/i.test(trimmed)) {
    issues.push('Name cannot contain the term "AI"');
  }

  // Forbidden category/tag match
  const searchable = normalizeForSearch(trimmed);
  for (const entry of FORBIDDEN_ENTRIES) {
    if (entry.regex.test(searchable)) {
      issues.push(`Name cannot contain the term "${entry.label}"`);
      break; // One match is enough
    }
  }

  return { name: trimmed, compliant: issues.length === 0, issues };
}

/**
 * Check template name uniqueness via the Vercel API.
 * Returns null if the API is unavailable.
 */
export async function checkNameUniqueness(
  name: string,
  timeoutMs = 5000
): Promise<boolean | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://check-asset-name.vercel.app/api/checkTemplatename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templatename: name }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) return null;
    const data = await response.json() as { taken?: boolean };
    return !data.taken; // true = unique, false = taken
  } catch {
    return null; // API unavailable
  }
}

/**
 * Full validation: policy rules + uniqueness check.
 */
export async function validateTemplateNameFull(name: string): Promise<NameValidationResult> {
  const policyResult = validateTemplateName(name);
  let isUnique: boolean | null = null;
  let uniquenessChecked = false;

  // Only check uniqueness if policy validation passed
  if (policyResult.compliant) {
    isUnique = await checkNameUniqueness(name);
    uniquenessChecked = isUnique !== null;
    if (isUnique === false) {
      policyResult.issues.push('Name is already taken');
      policyResult.compliant = false;
    }
  }

  return {
    ...policyResult,
    uniquenessChecked,
    isUnique,
  };
}
