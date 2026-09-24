import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { parse } from 'parse5';

const FONT_DIR = new URL('../../assets/fonts/', import.meta.url);
const COOKIE_FACES = [
  ['Fira Code Nerd Font Propo', 'FiraCodeNerdFontPropo-Retina.woff2'],
  ['Fira Code Nerd Font Mono', 'FiraCodeNerdFontMono-Retina.woff2'],
  ['Geist Pixel Line', 'GeistPixel-Line.woff2'],
];
const EXPECTED_BY_FAMILY = Object.fromEntries(
  COOKIE_FACES.map(([family, file]) => [
    family,
    createHash('sha256').update(fs.readFileSync(new URL(file, FONT_DIR))).digest('hex'),
  ]),
);

export function assertFontCss(css, subject) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const faces = [...clean.matchAll(/@font-face\s*\{([^}]+)\}/gi)].map(([, block]) => {
    const descriptor = (name) => block.match(new RegExp(`\\b${name}\\s*:\\s*([^;]+)`, 'i'))?.[1].trim();
    const family = descriptor('font-family')?.replace(/["']/g, '');
    assert.ok(EXPECTED_BY_FAMILY[family], `${subject}: unexpected font-family ${family}`);
    assert.equal(descriptor('font-style'), 'normal', subject);
    assert.equal(descriptor('font-weight')?.replace(/\s+/g, ' '), '400', subject);
    assert.doesNotMatch(block, /\blocal\s*\(/i, `${subject}: installed fonts must not override embedded bytes`);
    const encoded = block.match(/\bsrc\s*:\s*url\(\s*["']?data:font\/woff2;base64,([A-Za-z0-9+/=]+)["']?\s*\)/i)?.[1];
    assert.ok(encoded, `${subject}: missing embedded WOFF2 source`);
    const bytes = Buffer.from(encoded, 'base64');
    assert.equal(bytes.toString('latin1', 0, 4), 'wOF2', subject);
    const digest = createHash('sha256').update(bytes).digest('hex');
    assert.equal(digest, EXPECTED_BY_FAMILY[family], `${subject}: ${family} bytes changed`);
    return family;
  }).sort();
  assert.deepEqual(faces, Object.keys(EXPECTED_BY_FAMILY).sort(), `${subject}: Cookie font faces missing or duplicated`);
}

// Parse HTML instead of scanning script/comment strings. parse5 also decodes
// srcdoc exactly once, so each nested viewer must satisfy the contract itself.
export function inspectDocuments(html, subject = 'artifact') {
  const document = { subject, styles: [], scripts: [], resources: [], children: [] };
  const remote = (value) => /^(?:https?:)?\/\//i.test(value || '');
  function cssResources(css) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of clean.matchAll(/(?:url\(\s*|@import\s+)["']?((?:https?:)?\/\/[^"')\s;]+)/gi)) document.resources.push(match[1]);
  }
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
    const text = (node.childNodes || []).filter((child) => child.nodeName === '#text').map((child) => child.value).join('');
    if (node.tagName === 'style') { document.styles.push(text); cssResources(text); }
    if (node.tagName === 'script') document.scripts.push(text);
    if (attrs.style) cssResources(attrs.style);
    for (const name of ['src', 'poster', 'data']) if (remote(attrs[name])) document.resources.push(attrs[name]);
    if (attrs.srcset) for (const match of attrs.srcset.matchAll(/(?:^|[\s,])((?:https?:)?\/\/[^\s,]+)/g)) document.resources.push(match[1]);
    if (['image', 'use', 'feImage'].includes(node.tagName) || (node.tagName === 'link' && /\b(stylesheet|preconnect|dns-prefetch|preload|modulepreload|prefetch|icon)\b/.test(attrs.rel || ''))) {
      if (remote(attrs.href)) document.resources.push(attrs.href);
    }
    if (node.tagName === 'iframe' && attrs.srcdoc != null) document.children.push(...inspectDocuments(attrs.srcdoc, `${subject}/srcdoc[${document.children.length}]`));
    for (const child of node.childNodes || []) visit(child);
  }
  visit(parse(html));
  return [document, ...document.children];
}

export function assertOfflineArtifact(html, subject) {
  const documents = inspectDocuments(html, subject);
  let viewers = 0;
  for (const document of documents) {
    assert.deepEqual(document.resources, [], `${document.subject}: external subresource`);
    const viewer = document.scripts.some((script) => /Archify\.readerLayout/.test(script));
    if (viewer) {
      assertFontCss(document.styles.join('\n'), document.subject);
      viewers += 1;
    }
  }
  assert.ok(viewers > 0, `${subject}: expected a viewer document`);
  return viewers;
}
