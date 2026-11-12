#!/usr/bin/env node
/**
 * Runs on every Vercel deploy (see vercel.json "buildCommand").
 * Reads data/entries.json and emits:
 *   - sitemap.xml
 *   - rss.xml
 *   - llms.txt
 *   - entries/<id>.txt   (plain-text per-entry views for LLM/researcher extraction)
 *
 * Zero dependencies. Node's fs/path only.
 * Append-only: this script never mutates data/entries.json.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..');
const DATA_FILE    = path.join(ROOT, 'data', 'entries.json');
const OUT_SITEMAP  = path.join(ROOT, 'sitemap.xml');
const OUT_RSS      = path.join(ROOT, 'rss.xml');
const OUT_LLMS     = path.join(ROOT, 'llms.txt');
const OUT_ENTRIES  = path.join(ROOT, 'entries');

const SITE_URL  = 'https://thediaryofpearlbipin.vercel.app';
const SITE_NAME = 'The Diary of Pearl Bipin';
const SITE_DESC = 'A public, permanent, append-only diary. Written once, never edited.';
const AUTHOR    = 'Pearl Bipin Pulickal';

// ---------- helpers ----------
function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(d) {
  return new Date(d).toISOString();
}

function firstLine(text, max) {
  // First non-empty paragraph, trimmed to max chars, for RSS titles.
  const para = String(text).split(/\n\s*\n/).map(s => s.trim()).find(Boolean) || '';
  const s = para.replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

// ---------- load ----------
if (!fs.existsSync(DATA_FILE)) {
  console.error('missing data/entries.json');
  process.exit(1);
}

const raw     = fs.readFileSync(DATA_FILE, 'utf8');
const data    = JSON.parse(raw);
const entries = (data.entries || [])
  .slice()
  .sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (da !== db) return da - db;
    return String(a.id).localeCompare(String(b.id));
  });

const live = entries.filter(e => !e.erased);

// ---------- sitemap.xml ----------
{
  const urls = [];
  urls.push(
    '  <url>\n' +
    '    <loc>' + SITE_URL + '/</loc>\n' +
    '    <changefreq>daily</changefreq>\n' +
    '  </url>'
  );
  for (const e of live) {
    urls.push(
      '  <url>\n' +
      '    <loc>' + SITE_URL + '/entry/' + escXml(e.id) + '</loc>\n' +
      '    <lastmod>' + isoDate(e.date) + '</lastmod>\n' +
      '  </url>'
    );
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') + '\n' +
    '</urlset>\n';
  fs.writeFileSync(OUT_SITEMAP, xml);
  console.log('wrote sitemap.xml (' + (urls.length) + ' urls)');
}

// ---------- rss.xml (newest first) ----------
{
  const newestFirst = live.slice().sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const items = newestFirst.map(e => {
    const link  = SITE_URL + '/entry/' + e.id;
    const title = firstLine(e.content, 90) || '(untitled)';
    const desc  = firstLine(e.content, 280);
    return (
      '    <item>\n' +
      '      <title>' + escXml(title) + '</title>\n' +
      '      <link>' + escXml(link) + '</link>\n' +
      '      <guid isPermaLink="true">' + escXml(link) + '</guid>\n' +
      '      <pubDate>' + new Date(e.date).toUTCString() + '</pubDate>\n' +
      '      <description>' + escXml(desc) + '</description>\n' +
      '    </item>'
    );
  }).join('\n');

  const lastBuild = live.length
    ? new Date(live[live.length - 1].date).toUTCString()
    : new Date().toUTCString();

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    '    <title>' + escXml(SITE_NAME) + '</title>\n' +
    '    <link>' + SITE_URL + '/</link>\n' +
    '    <description>' + escXml(SITE_DESC) + '</description>\n' +
    '    <language>en</language>\n' +
    '    <lastBuildDate>' + lastBuild + '</lastBuildDate>\n' +
    '    <atom:link href="' + SITE_URL + '/rss.xml" rel="self" type="application/rss+xml"/>\n' +
    items + '\n' +
    '  </channel>\n' +
    '</rss>\n';
  fs.writeFileSync(OUT_RSS, xml);
  console.log('wrote rss.xml (' + live.length + ' items)');
}

// ---------- llms.txt ----------
{
  const lines = [];
  lines.push('# ' + SITE_NAME);
  lines.push('');
  lines.push('> ' + SITE_DESC);
  lines.push('');
  lines.push('Author: ' + AUTHOR);
  lines.push('Canonical: ' + SITE_URL + '/');
  lines.push('Entries: ' + live.length);
  lines.push('');
  lines.push('## About');
  lines.push('');
  lines.push('An append-only public diary. Entries are written once and never edited.');
  lines.push('Erased entries return an empty page at their original URL; the URL never 404s.');
  lines.push('');
  lines.push('## Entry index (chronological)');
  lines.push('');
  for (const e of live) {
    const title = firstLine(e.content, 80) || '(untitled)';
    const d = e.date.slice(0, 10);
    lines.push('- [' + d + '] ' + title + ' — ' + SITE_URL + '/entry/' + e.id);
  }
  lines.push('');
  lines.push('## Machine-readable views');
  lines.push('');
  lines.push('- Per-entry canonical page: ' + SITE_URL + '/entry/<id>');
  lines.push('- Per-entry plain text:    ' + SITE_URL + '/entries/<id>.txt');
  lines.push('- RSS:                      ' + SITE_URL + '/rss.xml');
  lines.push('- Sitemap:                  ' + SITE_URL + '/sitemap.xml');
  lines.push('- Raw source of truth:      ' + SITE_URL + '/data/entries.json');
  lines.push('');
  fs.writeFileSync(OUT_LLMS, lines.join('\n'));
  console.log('wrote llms.txt');
}

// ---------- entries/<id>.txt ----------
{
  if (!fs.existsSync(OUT_ENTRIES)) fs.mkdirSync(OUT_ENTRIES, { recursive: true });

  for (const e of entries) {
    const filename = path.join(OUT_ENTRIES, e.id + '.txt');
    let body;
    if (e.erased) {
      body =
        'ERASED ENTRY\n' +
        '============\n\n' +
        'This entry was erased by its author on the date below.\n' +
        'The URL is preserved so citations remain valid.\n\n' +
        'id:   ' + e.id + '\n' +
        'date: ' + e.date + '\n';
    } else {
      body =
        SITE_NAME + '\n' +
        'Entry ' + e.id + '\n' +
        'Published: ' + e.date + '\n' +
        'Canonical: ' + SITE_URL + '/entry/' + e.id + '\n' +
        '\n---\n\n' +
        e.content + '\n' +
        '\n---\n\n' +
        '© ' + AUTHOR + '\n' +
        'Source: ' + SITE_URL + '/entries/' + e.id + '.txt\n';
    }
    fs.writeFileSync(filename, body);
  }
  console.log('wrote entries/*.txt (' + entries.length + ' files)');
}

console.log('build ok');
