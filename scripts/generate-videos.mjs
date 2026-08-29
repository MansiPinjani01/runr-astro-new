/**
 * RUNR - YouTube Video Data Generator
 * ===================================
 * Reads from src/data/youtube-source.json and generates category-specific JSON files.
 * Output: src/data/media-hub-reels-<category>.json
 * 
 * Usage:
 *   node scripts/generate-videos.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_JSON = join(ROOT, 'src', 'data', 'youtube-source.json');
const OUTPUT_DIR = join(ROOT, 'src', 'data');

async function fetchDuration(videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return '0:30'; // fallback

    try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
            const durationIso = data.items[0].contentDetails.duration;
            const match = durationIso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
                const h = parseInt(match[1] || 0, 10);
                const m = parseInt(match[2] || 0, 10);
                const s = parseInt(match[3] || 0, 10);
                let mins = h * 60 + m;
                return `${mins}:${String(s).padStart(2, '0')}`;
            }
        }
    } catch (e) {
        console.warn(`Failed to fetch duration for ${videoId}: ${e.message}`);
    }
    return '0:30';
}

async function main() {
    console.log('RUNR YouTube Video Generator');
    console.log('============================\n');

    if (!existsSync(SOURCE_JSON)) {
        console.error(`Source file not found: ${SOURCE_JSON}`);
        process.exit(1);
    }

    if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const sourceData = JSON.parse(readFileSync(SOURCE_JSON, 'utf8'));
    console.log(`Loaded ${sourceData.length} entries from youtube-source.json`);

    // Group by category, then by chapter
    const categories = {};
    for (const entry of sourceData) {
        if (!categories[entry.category]) {
            categories[entry.category] = {};
        }
        if (!categories[entry.category][entry.chapter]) {
            categories[entry.category][entry.chapter] = [];
        }

        const duration = await fetchDuration(entry.id);

        categories[entry.category][entry.chapter].push({
            video: `https://www.youtube.com/watch?v=${entry.id}`,
            poster: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
            title: entry.title,
            category: entry.category,
            duration: duration,
            ratio: '9:16'
        });
    }

    // Generate output files
    for (const [category, chaptersObj] of Object.entries(categories)) {
        const patternArr = ['a', 'b', 'c'];
        const chapters = Object.keys(chaptersObj).map((chapterTitle, index) => ({
            title: chapterTitle,
            pattern: patternArr[index % patternArr.length],
            reels: chaptersObj[chapterTitle]
        }));

        const outputData = { chapters };
        const outputPath = join(OUTPUT_DIR, `media-hub-reels-${category}.json`);
        writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
        console.log(`✓ Written: media-hub-reels-${category}.json (${chapters.length} chapters)`);
    }

    console.log('\nDone!');
}

main().catch(console.error);