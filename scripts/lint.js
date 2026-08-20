const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'index.html',
  'src/styles.css',
  'src/app.js',
  'public/assets/manifest.json'
];
const requiredCopy = [
  'Helen & Ian',
  'Kuhingira',
  'St Peter’s Cathedral',
  'Kabale Golf Course',
  'Beckie Rwanika White',
  '+256747084996',
  '+447851026329'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const copy of requiredCopy) {
  if (!html.includes(copy)) {
    throw new Error(`Missing invitation copy: ${copy}`);
  }
}

if (/Mr\.?|Mrs\.?/i.test(html)) {
  throw new Error('Invitation must use names only, not Mr/Mrs titles.');
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/manifest.json'), 'utf8'));
if (!Array.isArray(manifest.photos) || manifest.photos.length < 20) {
  throw new Error('Expected at least 20 photos in the gallery manifest.');
}
if (!Array.isArray(manifest.videos) || manifest.videos.length < 1) {
  throw new Error('Expected at least one celebration video.');
}

console.log('Lint checks passed');
