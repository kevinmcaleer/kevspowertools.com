import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, isExternal, renderCard, renderIndex, validateApps } from '../scripts/build.mjs';

const apps = JSON.parse(readFileSync(new URL('../site/apps.json', import.meta.url), 'utf8'));
const app = (over = {}) => ({
  id: 'x', name: 'X', url: 'https://x.kevspowertools.com/', description: 'd', summary: 's', status: 'live', ...over,
});

test('apps.json lists the tools, with NoodlePlanner and FilmColab on their own sites', () => {
  const list = validateApps(apps);
  assert.deepEqual(list.map((a) => a.id), ['puddle', 'mermaid-factory', 'wellyboot-bi', 'noodleplanner', 'filmcolab']);
  const host = (id) => new URL(list.find((a) => a.id === id).url).host;
  for (const id of ['puddle', 'mermaid-factory', 'wellyboot-bi']) assert.match(host(id), /^[a-z-]+\.kevspowertools\.com$/);
  assert.equal(host('noodleplanner'), 'www.noodleplanner.com');
  assert.equal(host('filmcolab'), 'www.filmcolab.com');
  assert.equal(list.find((a) => a.id === 'wellyboot-bi').status, 'soon');
});

test('a tool on another site opens in a new tab', () => {
  assert.equal(isExternal('https://x.kevspowertools.com/'), false);
  assert.equal(isExternal('https://kevspowertools.com/'), false);
  assert.equal(isExternal('https://www.filmcolab.com/'), true);
  assert.equal(isExternal('https://evilkevspowertools.com/'), true);
  const html = renderCard(app({ url: 'https://www.noodleplanner.com/' }));
  assert.match(html, /class="card external"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(renderCard(app()), /target=/);
});

test('validateApps rejects a missing field, a duplicate id, an unknown status and plain http', () => {
  assert.throws(() => validateApps({ apps: [] }), /non-empty/);
  assert.throws(() => validateApps({ apps: [app({ summary: '' })] }), /missing "summary"/);
  assert.throws(() => validateApps({ apps: [app(), app()] }), /appears twice/);
  assert.throws(() => validateApps({ apps: [app({ status: 'beta' })] }), /live or soon/);
  assert.throws(() => validateApps({ apps: [app({ url: 'http://x.kevspowertools.com/' })] }), /https/);
});

test('a live app is a link card showing its host', () => {
  const html = renderCard(app());
  assert.match(html, /<a class="card" href="https:\/\/x\.kevspowertools\.com\/"/);
  assert.match(html, /<span class="host">x\.kevspowertools\.com<\/span>/);
  assert.doesNotMatch(html, /Coming soon/);
});

test('a coming soon app is not a link', () => {
  const html = renderCard(app({ status: 'soon' }));
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /href=/);
  assert.match(html, /Coming soon/);
});

test('names and summaries are escaped', () => {
  const html = renderCard(app({ name: '<b>', summary: 'a & "b"' }));
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /a &amp; &quot;b&quot;/);
});

test('renderIndex needs the apps marker', () => {
  assert.throws(() => renderIndex('<ul></ul>', []), /marker/);
});

test('the built page has a card per app and serves apps.json unchanged', () => {
  const out = build(mkdtempSync(join(tmpdir(), 'kpt-')));
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.equal((html.match(/class="card/g) ?? []).length, apps.apps.length);
  assert.match(html, /href="https:\/\/puddle\.kevspowertools\.com\/"/);
  assert.match(html, /href="https:\/\/mermaid\.kevspowertools\.com\/"/);
  assert.match(html, /href="https:\/\/www\.noodleplanner\.com\/" target="_blank"/);
  assert.match(html, /href="https:\/\/www\.filmcolab\.com\/" target="_blank"/);
  assert.doesNotMatch(html, /href="https:\/\/wellyboot/);
  assert.doesNotMatch(html, /<script/);
  assert.equal(readFileSync(join(out, 'apps.json'), 'utf8'), readFileSync(new URL('../site/apps.json', import.meta.url), 'utf8'));
});
