// Builds the site into dist/: copies site/ and renders one card per app in site/apps.json into index.html.
// apps.json is also served as is, for the app switcher in each tool.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Line glyphs drawn on a 24 unit grid, stroked by the stylesheet.
const GLYPHS = {
  puddle: '<path d="M12 3c3.5 4.2 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.2 12 3Z"/><path d="M9 14.5h6M10 17h4"/>',
  'mermaid-factory':
    '<rect x="3" y="4" width="7" height="5" rx="1"/><rect x="14" y="4" width="7" height="5" rx="1"/><rect x="8.5" y="15" width="7" height="5" rx="1"/><path d="M6.5 9v2.5h11V9M12 11.5V15"/>',
  'wellyboot-bi': '<path d="M4 20V10M9.3 20V4M14.6 20v-7M20 20V7M3 20h18"/>',
  noodleplanner: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4M8 14h3M8 17h6"/>',
  filmcolab: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10.5 5-3v9l-5-3"/>',
};
const HOME_DOMAIN = 'kevspowertools.com';
const FALLBACK_GLYPH = '<rect x="4" y="4" width="16" height="16" rx="3"/>';
const STATUSES = new Set(['live', 'soon']);

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function validateApps(data) {
  if (!data || !Array.isArray(data.apps) || data.apps.length === 0) throw new Error('apps.json needs a non-empty "apps" list');
  const ids = new Set();
  for (const app of data.apps) {
    for (const key of ['id', 'name', 'url', 'description', 'summary', 'status']) {
      if (typeof app[key] !== 'string' || app[key] === '') throw new Error(`app ${app.id ?? '?'} is missing "${key}"`);
    }
    if (ids.has(app.id)) throw new Error(`app id "${app.id}" appears twice`);
    ids.add(app.id);
    if (!STATUSES.has(app.status)) throw new Error(`app ${app.id} has status "${app.status}"; use live or soon`);
    if (new URL(app.url).protocol !== 'https:') throw new Error(`app ${app.id} url must be https`);
  }
  return data.apps;
}

// A tool on another site (one of Kev's own, outside kevspowertools.com) opens in a new tab.
export const isExternal = (url) => {
  const host = new URL(url).hostname;
  return host !== HOME_DOMAIN && !host.endsWith(`.${HOME_DOMAIN}`);
};

export function renderCard(app) {
  const glyph = `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[app.id] ?? FALLBACK_GLYPH}</svg>`;
  const host = new URL(app.url).host;
  if (app.status === 'soon') {
    return [
      '      <li>',
      `        <div class="card soon" data-tool="${escape(app.id)}">`,
      `          ${glyph}`,
      `          <h2>${escape(app.name)} <span class="badge">Coming soon</span></h2>`,
      `          <p>${escape(app.summary)}</p>`,
      '          <span class="host">Being set up</span>',
      '        </div>',
      '      </li>',
    ].join('\n');
  }
  return [
    '      <li>',
    isExternal(app.url)
      ? `        <a class="card external" href="${escape(app.url)}" target="_blank" rel="noopener noreferrer" data-tool="${escape(app.id)}">`
      : `        <a class="card" href="${escape(app.url)}" data-tool="${escape(app.id)}">`,
    `          ${glyph}`,
    `          <h2>${escape(app.name)}</h2>`,
    `          <p>${escape(app.summary)}</p>`,
    `          <span class="host">${escape(host)}</span>`,
    '        </a>',
    '      </li>',
  ].join('\n');
}

export function renderIndex(template, apps) {
  if (!template.includes('<!-- apps -->')) throw new Error('index.html has no <!-- apps --> marker');
  return template.replace('<!-- apps -->', apps.map(renderCard).join('\n'));
}

export function build(out = join(root, 'dist')) {
  const apps = validateApps(JSON.parse(readFileSync(join(root, 'site/apps.json'), 'utf8')));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(root, 'site'), out, { recursive: true });
  writeFileSync(join(out, 'index.html'), renderIndex(readFileSync(join(root, 'site/index.html'), 'utf8'), apps));
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Built ${build()}`);
}
