import { chromium } from 'playwright';
import path from 'node:path';

const htmlPath = path.resolve('output/pdf/pocket-arcade-code-review-capabilities.html');
const pdfPath = path.resolve('output/pdf/pocket-arcade-code-review-capabilities.pdf');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
await page.pdf({
  path: pdfPath,
  format: 'Letter',
  printBackground: true,
  preferCSSPageSize: true
});
await browser.close();
console.log(pdfPath);
