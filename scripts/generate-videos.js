/**
 * scripts/generate-videos.js
 *
 * Scans public/media/videos/**\/*.mp4, generates a poster thumbnail for each
 * (via ffmpeg) into public/media/thumbs/, and writes src/data/videos.json
 * used by media-hub.astro to statically render the grid at build time.
 *
 * Usage:
 *   node scripts/generate-videos.js
 *
 * Requires ffmpeg to be installed and available on PATH.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VIDEOS_DIR = path.join(process.cwd(), 'public/media/videos');
const THUMBS_DIR = path.join(process.cwd(), 'public/media/thumbs');
const OUTPUT_JSON = path.join(process.cwd(), 'src/data/videos.json');

// Every Nth video becomes a "feature" card (spans 2x2 in the grid) for
// occasional visual emphasis. Set to 0 to disable.
const FEATURE_EVERY = 17;

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp4')) {
      results.push(full);
    }
  }
  return results;
}

function humanizeTitle(filename) {
  const base = filename.replace(/\.mp4$/i, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(filename) {
  return filename
    .replace(/\.mp4$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getRatio(videoAbsPath) {
  try {
    const out = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoAbsPath}"`
    ).toString().trim();
    const [w, h] = out.split('x').map(Number);
    if (w && h) {
      return w >= h ? '16:9' : '9:16';
    }
  } catch (e) {
    // ffprobe not available or failed - default to portrait
  }
  return '9:16';
}

function ensureThumb(videoAbsPath, slug) {
  const thumbRelPath = `/media/thumbs/${slug}.jpg`;
  const thumbAbsPath = path.join(THUMBS_DIR, `${slug}.jpg`);
  if (!fs.existsSync(thumbAbsPath)) {
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
    try {
      execSync(
        `ffmpeg -y -i "${videoAbsPath}" -ss 00:00:00.5 -vframes 1 -q:v 3 "${thumbAbsPath}"`,
        { stdio: 'ignore' }
      );
      console.log(`  thumb -> ${thumbRelPath}`);
    } catch (e) {
      console.warn(`  WARNING: could not generate thumbnail for ${slug} (is ffmpeg installed?)`);
      return null;
    }
  }
  return thumbRelPath;
}

function main() {
  console.log(`Scanning ${VIDEOS_DIR} ...`);
  const files = walk(VIDEOS_DIR);
  if (!files.length) {
    console.log('No .mp4 files found. Add videos to public/media/videos/ first.');
    return;
  }

  const seenSlugs = new Set();
  const videos = [];

  files.forEach((absPath, i) => {
    const filename = path.basename(absPath);
    const relFromVideosDir = path.relative(VIDEOS_DIR, absPath).replace(/\\/g, '/');
    let slug = slugify(filename);
    // de-dupe slugs if two files share a base name in different folders
    let finalSlug = slug;
    let n = 2;
    while (seenSlugs.has(finalSlug)) {
      finalSlug = `${slug}-${n++}`;
    }
    seenSlugs.add(finalSlug);

    const poster = ensureThumb(absPath, finalSlug);
    const ratio = getRatio(absPath);

    videos.push({
      slug: finalSlug,
      title: humanizeTitle(filename),
      video: `/media/videos/${relFromVideosDir}`,
      poster: poster || '/media/images/video-fallback-poster.jpg',
      ratio,
      feature: FEATURE_EVERY > 0 && i > 0 && i % FEATURE_EVERY === 0,
    });

    console.log(`  [${i + 1}/${files.length}] ${filename} -> ${ratio}`);
  });

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(videos, null, 2));
  console.log(`\nDone. Wrote ${videos.length} videos to ${OUTPUT_JSON}`);
}

main();
