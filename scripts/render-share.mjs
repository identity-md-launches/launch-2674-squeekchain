import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const pwPath = process.argv[2];
const { chromium } = await import(pwPath ? pathToFileURL(resolve(pwPath)).href : 'playwright');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const svg = await readFile('design/share-card.svg', 'utf8');
  await page.setContent(`<style>body{margin:0}svg{display:block}</style>${svg}`);
  await page.screenshot({ path: 'public/og-image.png' });
  console.log('Rendered public/og-image.png (1200 × 630) from design/share-card.svg');
} finally { await browser.close(); }
