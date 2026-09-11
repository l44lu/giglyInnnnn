import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parses a standard CSP policy string into a dictionary of directive -> string[] sources.
 */
function parseCsp(cspString) {
  const directives = new Map();
  const tokens = cspString
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const parts = token.split(/\s+/);
    const directiveName = parts[0].toLowerCase();
    const sources = parts.slice(1);
    directives.set(directiveName, sources);
  }

  return directives;
}

describe('Step 9C-9.2: Frontend Content Security Policy (CSP) Verification', () => {
  const indexPath = path.resolve(__dirname, '../../index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Match the meta tag and extract the double-quoted content attribute
  const metaCspMatch = indexHtml.match(
    /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"[^>]*>/i,
  );

  test('1. index.html contains a valid Content-Security-Policy meta tag', () => {
    assert.ok(
      metaCspMatch,
      'Expected to find <meta http-equiv="Content-Security-Policy" content="..."> in index.html',
    );
  });

  const cspPolicy = metaCspMatch ? metaCspMatch[1] : '';
  const parsedCsp = parseCsp(cspPolicy);

  test('2. default-src is strictly restricted to \'self\'', () => {
    const defaultSrc = parsedCsp.get('default-src');
    assert.ok(defaultSrc, 'default-src directive must be present');
    assert.deepEqual(
      defaultSrc,
      ["'self'"],
      "default-src must strictly be ['self']",
    );
  });

  test('3. script-src is strictly restricted to \'self\' with NO unsafe-eval or wildcards', () => {
    const scriptSrc = parsedCsp.get('script-src');
    assert.ok(scriptSrc, 'script-src directive must be present');
    assert.ok(
      scriptSrc.includes("'self'"),
      "script-src must include 'self'",
    );
    assert.ok(
      !scriptSrc.includes("'unsafe-eval'"),
      "script-src must NEVER contain 'unsafe-eval'",
    );
    assert.ok(
      !scriptSrc.includes('*'),
      'script-src must NEVER contain wildcard *',
    );
  });

  test('4. style-src allows \'self\' and \'unsafe-inline\' (for Vite HMR, dynamic charts, and Radix positioning) without wildcards', () => {
    const styleSrc = parsedCsp.get('style-src');
    assert.ok(styleSrc, 'style-src directive must be present');
    assert.ok(styleSrc.includes("'self'"), "style-src must include 'self'");
    assert.ok(
      styleSrc.includes("'unsafe-inline'"),
      "style-src must include 'unsafe-inline' for React dynamic styles, chart heights, and Radix UI overlays",
    );
    assert.ok(
      !styleSrc.includes('*'),
      'style-src must NEVER contain wildcard *',
    );
  });

  test('5. img-src allows \'self\', data:, and only verified external avatar hosts', () => {
    const imgSrc = parsedCsp.get('img-src');
    assert.ok(imgSrc, 'img-src directive must be present');
    assert.ok(imgSrc.includes("'self'"), "img-src must allow 'self'");
    assert.ok(imgSrc.includes('data:'), 'img-src must allow data: for SVGs');
    assert.ok(
      imgSrc.includes('https://images.unsplash.com'),
      'img-src must allow https://images.unsplash.com for avatars',
    );
    assert.ok(
      imgSrc.includes('https://i.pravatar.cc'),
      'img-src must allow https://i.pravatar.cc for testimonials',
    );
    assert.ok(
      !imgSrc.includes('*'),
      'img-src must NEVER contain wildcard *',
    );
  });

  test('6. connect-src permits strictly \'self\', local backend APIs, and Vite dev WebSockets', () => {
    const connectSrc = parsedCsp.get('connect-src');
    assert.ok(connectSrc, 'connect-src directive must be present');
    assert.ok(connectSrc.includes("'self'"), "connect-src must allow 'self'");
    assert.ok(
      connectSrc.includes('http://localhost:3000'),
      'connect-src must allow http://localhost:3000',
    );
    assert.ok(
      connectSrc.includes('http://127.0.0.1:3000'),
      'connect-src must allow http://127.0.0.1:3000',
    );
    assert.ok(
      connectSrc.includes('ws://localhost:5173'),
      'connect-src must allow Vite HMR ws://localhost:5173',
    );
    assert.ok(
      connectSrc.includes('ws://127.0.0.1:5173'),
      'connect-src must allow Vite HMR ws://127.0.0.1:5173',
    );
    assert.ok(
      !connectSrc.includes('*'),
      'connect-src must NEVER contain wildcard *',
    );
  });

  test('7. object-src is strictly \'none\' to prevent plugin execution', () => {
    const objectSrc = parsedCsp.get('object-src');
    assert.ok(objectSrc, 'object-src directive must be present');
    assert.deepEqual(
      objectSrc,
      ["'none'"],
      "object-src must strictly be ['none']",
    );
  });

  test('8. base-uri and form-action are strictly \'self\'', () => {
    const baseUri = parsedCsp.get('base-uri');
    const formAction = parsedCsp.get('form-action');

    assert.ok(baseUri, 'base-uri directive must be present');
    assert.deepEqual(baseUri, ["'self'"], "base-uri must be ['self']");

    assert.ok(formAction, 'form-action directive must be present');
    assert.deepEqual(formAction, ["'self'"], "form-action must be ['self']");
  });

  test('9. No directive across the entire CSP contains wildcard * or unsafe-eval', () => {
    for (const [directive, sources] of parsedCsp.entries()) {
      assert.ok(
        !sources.includes('*'),
        `Directive ${directive} must not contain wildcard *`,
      );
      assert.ok(
        !sources.includes("'unsafe-eval'"),
        `Directive ${directive} must not contain 'unsafe-eval'`,
      );
    }
  });

  test('10. frame-ancestors is intentionally omitted from meta tag (requires response header)', () => {
    // W3C CSP Level 2/3: browsers ignore frame-ancestors when delivered via <meta>
    assert.equal(
      parsedCsp.has('frame-ancestors'),
      false,
      'frame-ancestors must not be placed in HTML meta tag because browsers ignore it; it must be enforced via HTTP response header at edge/reverse-proxy',
    );
  });
});
