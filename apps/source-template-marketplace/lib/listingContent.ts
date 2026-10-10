import { load } from 'cheerio';
import { get } from 'node:https';
import sanitizeHtml from 'sanitize-html';

export type ListingContent = {
  overview: string;
  license: string;
  support: string;
  faq: { title: string; html: string }[];
  features: { title: string; html: string }[];
  source: string;
  fetchedAt: string;
};

export function cleanRichHtml(html: string, source: string) {
  const $ = load(html, null, false);
  $('.w-condition-invisible, script, style, iframe, form, input, button, svg').remove();
  $('h1,h2,h3,h4,h5,h6,p').each((_, el) => {
    if (!$(el).text().trim() && !$(el).find('img').length) $(el).remove();
  });
  $('a[href], img[src]').each((_, el) => {
    const attribute = el.tagName === 'a' ? 'href' : 'src';
    try {
      const url = new URL($(el).attr(attribute) || '', source);
      if (url.protocol === 'https:' || (attribute === 'href' && url.protocol === 'mailto:'))
        $(el).attr(attribute, url.href);
      else $(el).removeAttr(attribute);
    } catch {
      $(el).removeAttr(attribute);
    }
  });
  return sanitizeHtml($.html(), {
    allowedTags: [
      'p',
      'br',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'figure',
      'figcaption',
      'blockquote',
      'hr',
      'pre',
      'code',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      ol: ['start'],
      th: ['scope'],
      td: ['colspan', 'rowspan']
    },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_, attrs) => ({
        tagName: 'a',
        attribs: { ...attrs, target: '_blank', rel: 'noopener noreferrer' }
      }),
      img: (_, attrs) => ({
        tagName: 'img',
        attribs: { ...attrs, alt: attrs.alt || '', loading: 'lazy' }
      })
    }
  });
}

export function extractListingContent(html: string, source: string): ListingContent {
  const $ = load(html);
  $('.w-condition-invisible').remove();
  const overview = $('.long-description .w-richtext').first().html();
  if (!overview) throw new Error('Original description not found');
  const section = (name: string) =>
    cleanRichHtml($(`.w-tab-pane[data-w-tab="${name}"]`).first().html() || '', source);
  const accordions = (selector: string) =>
    $(selector)
      .toArray()
      .map((el) => {
        const button = $(el);
        return {
          title: button.find('.feature_accordion_title-row').text().trim(),
          html: cleanRichHtml(button.next('.feature_accordion_content').html() || '', source)
        };
      })
      .filter((row) => row.title && row.html);
  return {
    overview: cleanRichHtml(overview, source),
    license: section('License'),
    support: section('Support'),
    faq: accordions('.w-tab-pane[data-w-tab="FAQ"] .feature_accordion_button'),
    features: accordions('.feature_accordion_button').filter(
      (row) => !$('.w-tab-pane[data-w-tab="FAQ"]').text().includes(row.title)
    ),
    source,
    fetchedAt: new Date().toISOString()
  };
}

export async function fetchListingContent(slug: string): Promise<ListingContent> {
  if (!/^[a-z0-9][a-z0-9-]{0,180}$/.test(slug)) throw new Error('Invalid template slug');
  const source = `https://webflow.com/templates/html/${slug}`;
  // Webflow's CDN headers exceed Node fetch's default header limit. Keep the
  // larger limit scoped to this fixed-origin, read-only request.
  const html = await new Promise<string>((resolve, reject) => {
    const request = get(
      source,
      { maxHeaderSize: 128 * 1024, headers: { Accept: 'text/html' } },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error('Listing unavailable'));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > 4 * 1024 * 1024) request.destroy(new Error('Listing too large'));
          else chunks.push(chunk);
        });
        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        response.on('error', reject);
      }
    );
    request.setTimeout(15000, () => request.destroy(new Error('Listing timed out')));
    request.on('error', reject);
  });
  return extractListingContent(html, source);
}
