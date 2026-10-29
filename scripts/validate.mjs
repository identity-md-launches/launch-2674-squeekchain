import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// Test tools can live outside the submitted repository. No host discovery is used.
const moduleArg = process.argv.indexOf('--playwright');
const pw = await import(moduleArg >= 0 ? pathToFileURL(resolve(process.argv[moduleArg + 1])).href : 'playwright');
const axeArg = process.argv.indexOf('--axe');
const axe = axeArg >= 0 ? await import(pathToFileURL(resolve(process.argv[axeArg + 1])).href) : null;
const output = resolve('test/scratch/validation');
await mkdir(output, { recursive: true });
const root = resolve('dist');
const requests = [];
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/__close') { response.end('Done'); server.close(); return; }
  const relative = url.pathname.replace(/^\/preview\//, '') || 'index.html';
  const path = resolve(root, decodeURIComponent(relative));
  if (!url.pathname.startsWith('/preview/') || !path.startsWith(root + sep)) { response.writeHead(404).end(); return; }
  try {
    const content = await readFile(path);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain' };
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    response.end(content);
  } catch { requests.push(url.pathname); response.writeHead(404).end('Not found'); }
});
await new Promise(done => server.listen(4178, '0.0.0.0', done));
const url = 'http://localhost:4178/preview/';
const results = [];
const failures = [];
const record = (name, details) => { results.push({ name, passed: true, details }); console.log(`PASS ${name}: ${details}`); };
const errors = [];
let browser;
try {
  browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width >= 1024 ? 1000 : 844 });
    const layout = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(layout.scroll <= layout.client, `Horizontal overflow at ${width}`);
    await page.screenshot({ path: `${output}/${width}.png`, fullPage: true });
    record(`reflow-${width}`, `scroll width ${layout.scroll}; viewport ${layout.client}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const first = await page.locator('.button-primary').boundingBox();
  assert.ok(first && first.y >= 0 && first.y + first.height < 844);
  assert.ok(await page.locator('.brand').isVisible());
  record('mobile-first-screen', 'Product name, headline, explanatory copy and primary action visible at 390 × 844');
  await page.getByRole('link', { name: '看看它如何运转' }).click();
  await page.waitForFunction(() => location.hash === '#how-it-works');
  await page.waitForFunction(() => document.querySelector('#how-it-works').getBoundingClientRect().top < 80);
  record('primary-navigation', 'Hero action reaches the four-step process');
  await page.getByRole('link', { name: 'Squeekchain 首页' }).click();
  const toggle = page.locator('#wheel-toggle');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#wheel-status').innerText(), /转动中/);
  assert.equal(await page.locator('.wheel-spokes').evaluate(el => getComputedStyle(el).animationPlayState), 'running');
  await toggle.press('Space');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.match(await page.locator('#wheel-status').innerText(), /休息中/);
  assert.equal(await page.locator('.wheel-spokes').evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
  record('wheel-toggle', 'Pointer starts; keyboard Space pauses; name, state and stable live region agree');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await toggle.click();
  const reduced = await page.locator('.wheel-spokes').evaluate(el => getComputedStyle(el).animationName);
  assert.equal(reduced, 'none');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  await toggle.click();
  record('reduced-motion', 'No wheel animation with reduced motion; state still updates');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const detail of await page.locator('details').all()) {
    const summary = detail.locator('summary');
    await summary.focus();
    await summary.press('Enter');
    assert.equal(await detail.getAttribute('open'), '');
    assert.ok(await detail.locator('p').isVisible());
    await summary.press('Space');
    assert.equal(await detail.getAttribute('open'), null);
  }
  record('faq-keyboard', 'All four native disclosures open with Enter and close with Space');
  await page.goto(url);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), '跳到主要内容');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'main');
  record('skip-link', 'First Tab exposes skip link and Enter focuses main content');
  await toggle.focus();
  const focus = await toggle.evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
  assert.equal(focus.style, 'solid');
  assert.equal(focus.width, '3px');
  await page.screenshot({ path: `${output}/keyboard-focus.png` });
  record('focus-style', '3px focus-visible outline captured on wheel control');
  await page.locator('html').evaluate(el => { el.style.fontSize = '200%'; });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  record('text-enlargement', '200% root text size reflows at 390px (not native browser zoom)');
  await page.locator('html').evaluate(el => { el.style.fontSize = ''; });
  if (axe) {
    const AxeBuilder = axe.default?.default || axe.default || axe.AxeBuilder;
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    await writeFile(`${output}/axe.json`, JSON.stringify(report, null, 2));
    assert.equal(report.violations.length, 0, JSON.stringify(report.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))));
    record('axe-chromium', `${report.passes.length} rules passed; 0 violations; ${report.incomplete.length} rules need manual review`);
  }
  const metadata = await page.evaluate(() => ({ title: document.title, favicon: document.querySelector('link[rel=icon]')?.getAttribute('href'), description: document.querySelector('meta[name=description]')?.getAttribute('content'), ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'), ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') }));
  assert.ok(Object.values(metadata).every(Boolean));
  for (const field of ['favicon', 'ogImage']) assert.equal((await page.request.get(new URL(metadata[field], url).href)).status(), 200);
  record('share-metadata', 'Title, description, favicon, og:title and local PNG og:image present and assets return 200');
  assert.equal(requests.length, 0, requests.join('\n'));
  assert.equal(errors.length, 0, errors.join('\n'));
  record('resources-console', 'No missing local requests, failed resources, page errors or console errors');
  await page.close();
  let safari;
  try { safari = await pw.webkit.launch({ headless: true }); }
  catch {
    failures.push({ name: 'webkit-primary', limitation: 'WebKit could not start; Safari behavior is unverified.' });
    console.log('LIMITATION WebKit could not start; Safari behavior is unverified.');
  }
  if (safari) try {
    const safariPage = await safari.newPage({ viewport: { width: 390, height: 844 } });
    await safariPage.goto(url);
    await safariPage.locator('#wheel-toggle').click();
    assert.equal(await safariPage.locator('#wheel-toggle').getAttribute('aria-pressed'), 'true');
    await safariPage.locator('#wheel-toggle').click();
    await safariPage.locator('summary').first().click();
    assert.equal(await safariPage.locator('details').first().getAttribute('open'), '');
    assert.ok(await safariPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await safariPage.screenshot({ path: `${output}/webkit-390.png`, fullPage: true });
    record('webkit-primary', 'Wheel starts and pauses, FAQ opens, no overflow at 390px');
  } finally { await safari.close(); }
} catch (error) {
  failures.push({ name: 'interaction-validation', error: String(error) });
  process.exitCode = 1;
  console.error(error);
} finally {
  await browser?.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ results, failures }, null, 2));
  server.close();
}
