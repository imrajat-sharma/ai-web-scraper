import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_TEXT_CHARS = 12000;

const BLOCK_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, br, blockquote, pre, td, th, tr, div, section, article, address, dd, dt, figcaption, caption';

const STRIP_SELECTOR =
  'script, style, noscript, template, svg, iframe, canvas, form, button, input, select, textarea, nav, aside, [role="navigation"], [role="banner"], [role="contentinfo"], [aria-hidden="true"]';

const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i;

function fail(message, status = 502) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function parseUrl(raw) {
  let candidate = String(raw).trim();
  if (!candidate) throw fail('Please provide a URL.', 400);
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw fail('That does not look like a valid URL.', 400);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw fail('Only http:// and https:// URLs are supported.', 400);
  }
  if (PRIVATE_HOST_PATTERN.test(parsed.hostname)) {
    throw fail('That host is not allowed from the server.', 400);
  }
  return parsed;
}

export async function scrapePage(rawUrl) {
  const url = parseUrl(rawUrl);

  let res;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      throw fail('The site took too long to respond (timed out after 15s).');
    }
    throw fail(`Could not reach that URL: ${e.cause?.code || e.message}`);
  }

  if (!res.ok) {
    throw fail(`The site responded with HTTP ${res.status} ${res.statusText}.`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType && !/html|xml|text\/plain/i.test(contentType)) {
    throw fail(`That URL returned "${contentType}" instead of a web page.`);
  }

  const html = (await res.text()).slice(0, MAX_HTML_BYTES);
  return extractContent(html, res.url || url.href);
}

export function extractContent(html, sourceUrl) {
  const $ = cheerio.load(html);

  $(STRIP_SELECTOR).remove();

  const title = (
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text() ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();

  const description = (
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();

  const main = $('main').first();
  const article = $('article').first();
  const root = main.length ? main : article.length ? article : $('body').first();

  root.find(BLOCK_SELECTOR).each((_, el) => {
    $(el).append('\n');
  });

  const text = root
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!text) {
    throw fail('No readable text found on that page (it may require JavaScript).');
  }

  const truncated = text.length > MAX_TEXT_CHARS;
  const cleaned = truncated ? text.slice(0, MAX_TEXT_CHARS) : text;

  return {
    url: sourceUrl,
    title,
    description,
    text: cleaned,
    charCount: cleaned.length,
    truncated,
  };
}
