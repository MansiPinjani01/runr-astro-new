// @ts-check
import {
    defineConfig
} from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

const isDevMode = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
    // Only use the Cloudflare adapter for production builds.
    // The workerd runtime crashes on Windows during local dev.
    ...(isDevMode ? {} : {
        adapter: cloudflare()
    }),
    devToolbar: {
        enabled: false
    }
});