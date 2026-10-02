/**
 * Allowlist sanitizer for product descriptions. Keep in sync with
 * web/src/utils/richText.js.
 *
 * Only formatting tags survive and they never carry attributes, so no
 * scripts, event handlers, styles or links can be stored.
 */
const TAG_MAP: Record<string, string> = {
  h1: 'h2',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h4',
  h6: 'h4',
  p: 'p',
  div: 'p',
  br: 'br',
  strong: 'strong',
  b: 'strong',
  em: 'em',
  i: 'em',
  u: 'u',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
};

const DROP_WITH_CONTENT =
  /<(script|style|iframe|object|embed|noscript|template|textarea|select|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const ANY_TAG = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(value);
}

const BLOCK_TAGS = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol']);
const HEADING_TAGS = ['h2', 'h3', 'h4'];
const EMPTY_ELEMENT = /<(p|h2|h3|h4|li|ul|ol|strong|em|u)>\s*<\/\1>/g;

const escapeText = (text: string) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Keeps allowlisted tags (without attributes) and repairs nesting, e.g. the
 * `<p><ul>…</ul></p>` that contentEditable list commands produce.
 */
export function sanitizeRichText(html: string): string {
  const source = html.replace(/<!--[\s\S]*?-->/g, '').replace(DROP_WITH_CONTENT, '');
  const out: string[] = [];
  const stack: string[] = [];
  const closeUntil = (name: string) => {
    while (stack.length) {
      const top = stack.pop() as string;
      out.push(`</${top}>`);
      if (top === name) return;
    }
  };

  let cursor = 0;
  for (const match of source.matchAll(ANY_TAG)) {
    const index = match.index ?? 0;
    out.push(escapeText(source.slice(cursor, index)));
    cursor = index + match[0].length;

    const name = TAG_MAP[match[1].toLowerCase()];
    if (!name) continue;
    const closing = match[0].startsWith('</');

    if (name === 'br') {
      if (!closing) out.push('<br>');
      continue;
    }
    if (closing) {
      if (stack.includes(name)) closeUntil(name);
      continue;
    }

    const liIndex = stack.lastIndexOf('li');
    if (BLOCK_TAGS.has(name)) {
      const openBlock = ['p', ...HEADING_TAGS]
        .map((tag) => ({ tag, index: stack.lastIndexOf(tag) }))
        .filter((entry) => entry.index > liIndex)
        .sort((a, b) => a.index - b.index)[0];
      if (openBlock) closeUntil(openBlock.tag);
    }
    if (name === 'li') {
      const listIndex = Math.max(stack.lastIndexOf('ul'), stack.lastIndexOf('ol'));
      if (liIndex > listIndex) closeUntil('li');
    }

    out.push(`<${name}>`);
    stack.push(name);
  }
  out.push(escapeText(source.slice(cursor)));
  while (stack.length) out.push(`</${stack.pop()}>`);

  let result = out.join('');
  let previous: string;
  do {
    previous = result;
    result = result.replace(EMPTY_ELEMENT, '');
  } while (result !== previous);
  return result.trim();
}

/** Plain-text descriptions are stored as-is; HTML is sanitized. */
export function cleanDescription(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return looksLikeHtml(value) ? sanitizeRichText(value) : value.trim();
}
