import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('compose.yaml never requires a variable, so plain `docker compose up` works without a .env', () => {
  // Compose interpolates every service, profiles that are off included.
  const lines = read('compose.yaml').split('\n').filter((l) => !l.trimStart().startsWith('#'));
  assert.doesNotMatch(lines.join('\n'), /\$\{[A-Z_]+:?\?/);
});

test('apps.json is readable from the cross-origin isolated tools', () => {
  const conf = read('deploy/nginx.conf');
  const block = conf.slice(conf.indexOf('location = /apps.json'), conf.indexOf('}', conf.indexOf('location = /apps.json')));
  assert.match(block, /Access-Control-Allow-Origin "\*"/);
  assert.match(block, /Cross-Origin-Resource-Policy "cross-origin"/);
  assert.match(block, /Cache-Control "public, max-age=\d+"/);
});

test('.env is ignored and the example holds no token', () => {
  assert.match(read('.gitignore'), /^\.env$/m);
  assert.match(read('.env.example'), /^CLOUDFLARE_TUNNEL_TOKEN=$/m);
});
