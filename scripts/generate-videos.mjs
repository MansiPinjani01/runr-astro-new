/**
 * RUNR — Video Data Generator
 * ============================
 * Scans public/videos/ for .mp4 files and:
 * 1. Generates a slug from the filename
 * 2. Generates a humanized title (dashes/underscores → spaces)
 * 3. Generates a poster thumbnail via ffmpeg (frame at 0.5s) → public/thumbs/
 * 4. Outputs src/data/videos.json used by the Astro page
 *
 * Usage:
 *   node scripts/generate-videos.mjs
 *
 * Requirements:
 *   - ffmpeg must be installed and in PATH
 *   - Videos must be placed in public/videos/
 */

import {
    readdirSync,
    existsSync,
    mkdirSync,
    writeFileSync,
    statSync
} from 'fs';
import {
    join,
    basename,
    extname,
    resolve
} from 'path';
import {
    execSync
} from 'child_process';

const ROOT = resolve(
    import.meta.dirname, '..');
const VIDEOS_DIR = join(ROOT, 'public', 'videos');
const THUMBS_DIR = join(ROOT, 'public', 'thumbs');
const OUTPUT_JSON = join(ROOT, 'src', 'data', 'videos.json');

// Categories inferred from folder structure or filename patterns
const CATEGORIES = ['sprint', 'trail', 'recovery', 'strength', 'mobility', 'endurance'];

function humanize(filename) {
    return filename
        .replace(extname(filename), '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
}

function slugify(filename) {
    return filename
        .replace(extname(filename), '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function inferCategory(filename, index) {
    const lower = filename.toLowerCase();
    for (const cat of CATEGORIES) {
        if (lower.includes(cat)) return cat;
    }
    // Distribute evenly across categories if no match
    return CATEGORIES[index % CATEGORIES.length];
}

function getVideoDuration(filepath) {
    try {
        const result = execSync(
            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filepath}"`, {
                encoding: 'utf8',
                timeout: 10000
            }
        );
        const seconds = Math.round(parseFloat(result.trim()));
        if (isNaN(seconds)) return '0:30';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    } catch {
        return '0:30';
    }
}

function generateThumbnail(videoPath, thumbPath) {
    if (existsSync(thumbPath)) {
        console.log(`  ✓ Thumb exists: ${basename(thumbPath)}`);
        return true;
    }
    try {
        execSync(
            `ffmpeg -y -ss 0.5 -i "${videoPath}" -frames:v 1 -q:v 3 "${thumbPath}"`, {
                encoding: 'utf8',
                timeout: 30000,
                stdio: 'pipe'
            }
        );
        console.log(`  ✓ Generated: ${basename(thumbPath)}`);
        return true;
    } catch (err) {
        console.warn(`  ✗ Failed thumbnail for ${basename(videoPath)}: ${err.message}`);
        return false;
    }
}

function scanVideos(dir, prefix = '') {
    const files = [];
    if (!existsSync(dir)) return files;

    const entries = readdirSync(dir, {
        withFileTypes: true
    });
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...scanVideos(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name));
        } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mp4') {
            files.push({
                fullPath,
                relativePath: prefix ? `${prefix}/${entry.name}` : entry.name,
                filename: entry.name
            });
        }
    }
    return files;
}

// ============================================================
// MAIN
// ============================================================
console.log('RUNR Video Generator');
console.log('====================\n');

// Ensure directories exist
if (!existsSync(VIDEOS_DIR)) {
    mkdirSync(VIDEOS_DIR, {
        recursive: true
    });
    console.log(`Created: public/videos/`);
}
if (!existsSync(THUMBS_DIR)) {
    mkdirSync(THUMBS_DIR, {
        recursive: true
    });
    console.log(`Created: public/thumbs/`);
}

// Ensure output data dir exists
const dataDir = join(ROOT, 'src', 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, {
        recursive: true
    });
}

// Scan for videos
const videoFiles = scanVideos(VIDEOS_DIR);
console.log(`Found ${videoFiles.length} video(s) in public/videos/\n`);

if (videoFiles.length === 0) {
    console.log('No videos found. Creating empty videos.json with placeholder structure.');
    console.log('Add .mp4 files to public/videos/ and re-run this script.\n');
}

// Process each video
const videos = videoFiles.map((file, index) => {
    const slug = slugify(file.filename);
    const title = humanize(file.filename);
    const category = inferCategory(file.filename, index);
    const thumbFilename = `${slug}.jpg`;
    const thumbPath = join(THUMBS_DIR, thumbFilename);
    const duration = getVideoDuration(file.fullPath);

    console.log(`Processing: ${file.relativePath}`);
    generateThumbnail(file.fullPath, thumbPath);

    return {
        id: index + 1,
        slug,
        title,
        category,
        video: `/videos/${file.relativePath}`,
        poster: `/thumbs/${thumbFilename}`,
        ratio: '9:16', // Default portrait; adjust if needed
        duration
    };
});

// Write JSON
writeFileSync(OUTPUT_JSON, JSON.stringify(videos, null, 2), 'utf8');
console.log(`\n✓ Written: src/data/videos.json (${videos.length} entries)`);
console.log('Done!\n');