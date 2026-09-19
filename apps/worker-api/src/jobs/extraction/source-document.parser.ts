import { SOURCE_FETCH_LIMITS } from './source-fetcher.types';

export interface ParsedSourceDocument {
  text: string;
  title?: string;
  description?: string;
  siteName?: string;
  canonicalHintUrl?: string;
  hasPasswordInput: boolean;
}

interface RewriterElement {
  getAttribute(name: string): string | null;
  remove(): unknown;
}

interface RewriterTextChunk {
  text: string;
}

function cleanWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncateUnicode(value: string, maximum: number): string {
  const characters = Array.from(value);
  if (characters.length <= maximum) return value;
  return characters.slice(0, maximum).join('');
}

function cleanMetadata(
  value: string | null,
  maximum: number,
): string | undefined {
  if (!value) return undefined;
  const cleaned = cleanWhitespace(value);
  if (!cleaned) return undefined;
  return truncateUnicode(cleaned, maximum);
}

function resolveCanonicalHint(
  value: string | undefined,
  finalUrl: string,
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, finalUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (url.username || url.password) return undefined;
    url.hash = '';
    return url.href;
  } catch {
    return undefined;
  }
}

class RemoveElementHandler {
  element(element: RewriterElement) {
    element.remove();
  }
}

class TitleHandler {
  private chunks: string[] = [];

  text(chunk: RewriterTextChunk) {
    this.chunks.push(chunk.text);
  }

  value(): string | undefined {
    return cleanMetadata(this.chunks.join(''), 512);
  }
}

class MetadataHandler {
  description?: string;
  siteName?: string;

  element(element: RewriterElement) {
    const name = element.getAttribute('name')?.trim().toLowerCase();
    const property = element.getAttribute('property')?.trim().toLowerCase();
    const content = element.getAttribute('content');

    if (
      !this.description &&
      (name === 'description' || property === 'og:description')
    ) {
      this.description = cleanMetadata(content, 2_048);
    }

    if (
      !this.siteName &&
      (name === 'application-name' || property === 'og:site_name')
    ) {
      this.siteName = cleanMetadata(content, 512);
    }
  }
}

class CanonicalHandler {
  href?: string;

  element(element: RewriterElement) {
    const rel = element.getAttribute('rel')?.toLowerCase().split(/\s+/) ?? [];
    if (!this.href && rel.includes('canonical')) {
      this.href = cleanMetadata(element.getAttribute('href'), 4_096);
    }
  }
}

class PasswordInputHandler {
  found = false;

  element(element: RewriterElement) {
    if (element.getAttribute('type')?.toLowerCase() === 'password') {
      this.found = true;
    }
  }
}

class DocumentTextHandler {
  readonly chunks: string[] = [];

  text(chunk: RewriterTextChunk) {
    this.chunks.push(chunk.text);
  }
}

async function parseHtml(
  body: Uint8Array,
  contentType: string,
  finalUrl: string,
  maximumCharacters: number,
): Promise<ParsedSourceDocument> {
  const title = new TitleHandler();
  const metadata = new MetadataHandler();
  const canonical = new CanonicalHandler();
  const password = new PasswordInputHandler();
  const remove = new RemoveElementHandler();

  let cleaned = new HTMLRewriter()
    .on('title', title)
    .on('meta', metadata)
    .on('link', canonical)
    .on('input', password)
    .on('script', remove)
    .on('style', remove)
    .on('nav', remove)
    .on('header', remove)
    .on('footer', remove)
    .on('aside', remove)
    .on('[hidden]', remove)
    .on('[aria-hidden="true"]', remove)
    .transform(
      new Response(
        body.buffer.slice(
          body.byteOffset,
          body.byteOffset + body.byteLength,
        ) as ArrayBuffer,
        {
          headers: { 'content-type': contentType },
        },
      ),
    );

  const text = new DocumentTextHandler();
  cleaned = new HTMLRewriter().onDocument(text).transform(cleaned);
  await cleaned.arrayBuffer();

  const normalized = cleanWhitespace(text.chunks.join('\n'));
  return {
    text: truncateUnicode(normalized, maximumCharacters),
    title: title.value(),
    description: metadata.description,
    siteName: metadata.siteName,
    canonicalHintUrl: resolveCanonicalHint(canonical.href, finalUrl),
    hasPasswordInput: password.found,
  };
}

export async function parseSourceDocument(
  body: Uint8Array,
  contentType: string,
  finalUrl: string,
  maximumCharacters: number = SOURCE_FETCH_LIMITS.maxExtractedCharacters,
): Promise<ParsedSourceDocument> {
  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';

  if (mediaType === 'text/plain') {
    const normalized = cleanWhitespace(new TextDecoder().decode(body));
    return {
      text: truncateUnicode(normalized, maximumCharacters),
      hasPasswordInput: false,
    };
  }

  if (mediaType === 'text/html' || mediaType === 'application/xhtml+xml') {
    return parseHtml(body, contentType, finalUrl, maximumCharacters);
  }

  throw new Error('Unsupported source parser content type');
}
