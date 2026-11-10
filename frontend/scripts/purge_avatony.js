const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const baseDir = path.resolve('frontend/public/storage/bible-dataset/v1');

console.log('--- 1. Purging AvaTony from dataset files ---');

// 1. articles/sec-01/chunk-001.json.gz
const chunkPath = path.join(baseDir, 'articles/sec-01/chunk-001.json.gz');
if (fs.existsSync(chunkPath)) {
  const raw = fs.readFileSync(chunkPath);
  const data = JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  const originalCount = data.articles.length;
  data.articles = data.articles.filter(a => {
    const isAva = a.id === 1 || /avatony/i.test(a.slug || '') || /avatony/i.test(a.title || '');
    return !isAva;
  });
  data.article_count = data.articles.length;
  console.log(`chunk-001: articles before = ${originalCount}, after = ${data.articles.length}`);
  fs.writeFileSync(chunkPath, zlib.gzipSync(Buffer.from(JSON.stringify(data))));
}

// 2. indexes/sections/sec-01.json.gz
const secPath = path.join(baseDir, 'indexes/sections/sec-01.json.gz');
if (fs.existsSync(secPath)) {
  const raw = fs.readFileSync(secPath);
  let data = JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  const originalCount = data.length;
  data = data.filter(a => {
    const isAva = a.id === 1 || /avatony/i.test(a.slug || '') || /avatony/i.test(a.title || '');
    return !isAva;
  });
  console.log(`sec-01.json.gz: before = ${originalCount}, after = ${data.length}`);
  fs.writeFileSync(secPath, zlib.gzipSync(Buffer.from(JSON.stringify(data))));
}

// 3. indexes/section-articles.json.gz
const secArticlesPath = path.join(baseDir, 'indexes/section-articles.json.gz');
if (fs.existsSync(secArticlesPath)) {
  const raw = fs.readFileSync(secArticlesPath);
  const data = JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  if (data['1']) {
    const before = data['1'].length;
    data['1'] = data['1'].filter(a => a.id !== 1 && !/avatony/i.test(a.slug || '') && !/avatony/i.test(a.title || ''));
    console.log(`section-articles key 1: before = ${before}, after = ${data['1'].length}`);
  }
  fs.writeFileSync(secArticlesPath, zlib.gzipSync(Buffer.from(JSON.stringify(data))));
}

// 4. indexes/slug-map.json.gz
const slugMapPath = path.join(baseDir, 'indexes/slug-map.json.gz');
if (fs.existsSync(slugMapPath)) {
  const raw = fs.readFileSync(slugMapPath);
  const data = JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  for (const k of Object.keys(data)) {
    if (/avatony/i.test(k) || data[k] === 1) {
      delete data[k];
      console.log(`slug-map removed key: ${k}`);
    }
  }
  fs.writeFileSync(slugMapPath, zlib.gzipSync(Buffer.from(JSON.stringify(data))));
}

// 5. indexes/article-map.json.gz
const articleMapPath = path.join(baseDir, 'indexes/article-map.json.gz');
if (fs.existsSync(articleMapPath)) {
  const raw = fs.readFileSync(articleMapPath);
  const data = JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  if (data['1']) {
    delete data['1'];
    console.log('article-map removed id 1');
  }
  fs.writeFileSync(articleMapPath, zlib.gzipSync(Buffer.from(JSON.stringify(data))));
}

// 6. search/shards/shard-41.json.gz
const shardPath = path.join(baseDir, 'search/shards/shard-41.json.gz');
if (fs.existsSync(shardPath)) {
  const raw = fs.readFileSync(shardPath);
  const data = JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  if (data['avatony']) {
    delete data['avatony'];
    console.log('shard-41 removed avatony key');
  }
  fs.writeFileSync(shardPath, zlib.gzipSync(Buffer.from(JSON.stringify(data))));
}

// 7. search/title-index.json.gz
const titleIndexPath = path.join(baseDir, 'search/title-index.json.gz');
if (fs.existsSync(titleIndexPath)) {
  const raw = fs.readFileSync(titleIndexPath);
  const data = JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  if (data['avatony']) {
    delete data['avatony'];
    console.log('title-index removed avatony key');
  }
  fs.writeFileSync(titleIndexPath, zlib.gzipSync(Buffer.from(JSON.stringify(data))));
}

// 8. sections.json
const sectionsPath = path.join(baseDir, 'sections.json');
if (fs.existsSync(sectionsPath)) {
  const sec = JSON.parse(fs.readFileSync(sectionsPath, 'utf-8'));
  const s1 = sec.find(s => s.id === 1 || s.code === 'sec-01');
  if (s1 && s1.doc_count > 9390) {
    s1.doc_count = 9397;
    console.log(`sections.json sec-01 doc_count updated to ${s1.doc_count}`);
  }
  fs.writeFileSync(sectionsPath, JSON.stringify(sec, null, 2));
}

// 9. manifest.json
const manifestPath = path.join(baseDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (manifest.statistics && manifest.statistics.article_count) {
    manifest.statistics.article_count = 47922;
    console.log(`manifest.json article_count updated to ${manifest.statistics.article_count}`);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

console.log('AvaTony purge complete!');
