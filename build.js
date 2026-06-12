const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const FILES_TO_COPY = [
  'index.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  '404.html',
  '500.html',
  'style.css',
  'script.js',
  'logo.png',
  'favicon.png',
  'og-image.png',
  'sitemap.xml',
  'robots.txt',
  'ads.txt'
];

console.log('Starting build...');

// Recreate dist directory
if (fs.existsSync(DIST_DIR)) {
  console.log('Cleaning existing dist directory...');
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR);
console.log('Created clean dist directory.');

// Copy files
FILES_TO_COPY.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(DIST_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to dist/`);
  } else {
    console.warn(`Warning: ${file} does not exist`);
  }
});

console.log('Build completed successfully.');
