import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'docs', 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Browser path detection
const candidates = [
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = candidates.find(p => fs.existsSync(p));

if (!executablePath) {
  console.error('No compatible browser found!');
  process.exit(1);
}

// 1. Start Vite Preview server on port 4173
console.log('Starting vite preview server...');
const previewProcess = spawn('npm.cmd', ['run', 'preview', '--', '--port', '4173'], {
  cwd: rootDir,
  stdio: 'pipe',
  shell: true
});

previewProcess.stdout.on('data', _data => {
  // console.log(`[preview] ${data}`);
});

// Wait for preview server to be ready
async function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not respond within ${timeout}ms`);
}

async function run() {
  try {
    await waitForServer('http://localhost:4173');
    console.log('Preview server is ready at http://localhost:4173');

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Set local storage preferences (accept cookies, light theme)
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('notes_hub_cookie_consent', 'dismissed');
      localStorage.setItem('notes_hub_theme', 'light');
    });

    // 1. Home Page Hero
    console.log('Capturing Home Hero...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    // Wait for feed content to load
    try {
      await page.waitForFunction(
        () => !document.querySelector('.animate-pulse') && document.querySelectorAll('article, [data-note-id], h3').length > 0,
        { timeout: 8000 }
      );
    } catch {
      console.log('Pulse timeout, continuing...');
    }
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(outDir, '01-home-hero.png'),
      clip: { x: 0, y: 0, width: 1440, height: 860 }
    });

    // 2. Full Home Page Sections
    console.log('Capturing Home Full Overview...');
    await page.screenshot({
      path: path.join(outDir, '02-home-full.png'),
      fullPage: true
    });

    // 3. Notes Catalog Page
    console.log('Capturing Notes Catalog Page...');
    await page.goto('http://localhost:4173/notes', { waitUntil: 'networkidle0' });
    try {
      await page.waitForFunction(
        () => !document.querySelector('.animate-pulse') && document.querySelectorAll('article, a[href^="/notes/"]').length > 0,
        { timeout: 8000 }
      );
    } catch {
      console.log('Catalog wait timeout, continuing...');
    }
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(outDir, '03-notes-catalog.png'),
      clip: { x: 0, y: 0, width: 1440, height: 960 }
    });

    // 4. Note Detail Page
    console.log('Capturing Note Detail Page...');
    const detailLink = await page.evaluate(() => {
      const link = document.querySelector('a[href^="/notes/"]');
      return link ? link.getAttribute('href') : null;
    });

    if (detailLink) {
      console.log(`Navigating to note detail: ${detailLink}`);
      await page.goto(`http://localhost:4173${detailLink}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({
        path: path.join(outDir, '04-note-detail.png'),
        clip: { x: 0, y: 0, width: 1440, height: 950 }
      });
    }

    // 5. Mobile View
    console.log('Capturing Mobile Responsive View...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(outDir, '05-mobile-view.png'),
      clip: { x: 0, y: 0, width: 390, height: 844 }
    });

    // 6. Login Modal / Page
    console.log('Capturing Login Page...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({
      path: path.join(outDir, '06-login-page.png'),
      clip: { x: 0, y: 0, width: 1440, height: 800 }
    });

    await browser.close();
    console.log('All screenshots captured successfully in docs/screenshots/!');
  } finally {
    previewProcess.kill();
  }
}

run().catch(err => {
  console.error('Error during screenshot capture:', err);
  previewProcess.kill();
  process.exit(1);
});

