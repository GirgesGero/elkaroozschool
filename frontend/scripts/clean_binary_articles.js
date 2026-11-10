const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const baseDir = path.resolve('frontend/public/storage/bible-dataset/v1/articles');

function isBinary(c) {
  if (!c || typeof c !== 'string') return false;
  if (c.startsWith('GIF8') || c.startsWith('\xFF\xD8\xFF') || c.startsWith('\x89PNG')) return true;
  if (c.includes('Software: Microsoft Office')) return true;
  if (c.includes('\u0000JFIF') || c.includes('JFIF\u0000')) return true;
  // Count replacement chars or null bytes
  let badChars = 0;
  const sample = c.slice(0, 1000);
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code === 0xFFFD || code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      badChars++;
    }
  }
  if (badChars > 20) return true;
  return false;
}

let cleanedCount = 0;

function cleanChunk(filePath) {
  const raw = fs.readFileSync(filePath);
  const data = JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  let modified = false;

  for (const art of data.articles) {
    if (isBinary(art.content)) {
      cleanedCount++;
      modified = true;
      console.log(`Fixing binary article #${art.id}: "${art.title}" (${art.slug}) in ${path.basename(filePath)}`);
      
      const safeTitle = art.title || 'وثيقة أرشيفية';
      const safeSlug = art.slug || '';
      
      art.content = `<div class="archival-notice-card my-8 p-6 md:p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-center">
  <div class="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-amber-500/10 text-amber-500 text-3xl shadow-inner">
    📜
  </div>
  <h3 class="text-xl font-bold text-amber-200 mb-2">${safeTitle}</h3>
  <p class="text-content-secondary leading-relaxed text-sm md:text-base max-w-lg mx-auto mb-4">
    هذه المادة عبارة عن مخطط توضيحي أو وثيقة أرشيفية ملحقة ضمن النسخة التوثيقية للموسوعة الكنسية.
  </p>
  <div class="inline-block px-3 py-1 rounded-lg bg-canvas/60 border border-line text-content-muted text-xs font-mono" dir="ltr">
    ${safeSlug}
  </div>
</div>`;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, zlib.gzipSync(Buffer.from(JSON.stringify(data))));
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.json.gz')) cleanChunk(full);
  }
}

walk(baseDir);
console.log(`Total binary articles cleaned on disk: ${cleanedCount}`);
