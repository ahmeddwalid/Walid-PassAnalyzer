import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const htmlPath = resolve(process.cwd(), 'dist', 'index.html');
const html = readFileSync(htmlPath, 'utf8');

const inlineScriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!inlineScriptMatch) {
  throw new Error('No inline theme initializer was found in dist/index.html.');
}

const inlineScript = inlineScriptMatch[1];
const expectedHash = `sha256-${createHash('sha256').update(inlineScript).digest('base64')}`;

const cspMatch = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
if (!cspMatch) {
  throw new Error('The production Content-Security-Policy meta tag is missing.');
}

const scriptPolicy = cspMatch[1]
  .split(';')
  .map((directive) => directive.trim())
  .find((directive) => directive.startsWith('script-src'));

if (!scriptPolicy) {
  throw new Error('The production CSP has no script-src directive.');
}
if (!scriptPolicy.includes(expectedHash)) {
  throw new Error(`CSP script hash mismatch. Expected ${expectedHash} in: ${scriptPolicy}`);
}
if (scriptPolicy.includes("'unsafe-inline'")) {
  throw new Error('The production script-src policy must not allow unsafe-inline.');
}

const moduleScript = html.match(/<script type="module"[^>]+src="([^"]+)"/);
if (!moduleScript) {
  throw new Error('The production module entry was not found.');
}
const assetMarker = '/assets/';
const assetIndex = moduleScript[1].indexOf(assetMarker);
if (assetIndex === -1) {
  throw new Error(`Unexpected production module URL: ${moduleScript[1]}`);
}
const modulePath = moduleScript[1].slice(assetIndex + 1);
try {
  readFileSync(resolve(process.cwd(), 'dist', modulePath), 'utf8');
} catch {
  throw new Error(`The production module entry is missing: ${moduleScript[1]}`);
}

console.log(`Build verified: CSP hash ${expectedHash} and module entry present.`);
