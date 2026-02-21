import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter({
            routes: {
                include: ['/*'],
                exclude: ['<all>']
            }
        }),
        paths: {
            base: ''
        },
        alias: {
            $lib: './src/lib'
        },
        prerender: {
            handleHttpError: ({ status, path }) => {
                // Ignore 404 errors for favicon and manifest files - these are optional
                if (status === 404 && (path.includes('/favicon') || path.includes('/manifest'))) {
                    return;
                }
                throw new Error(`${status} ${path}`);
            }
        }
    }
};

export default config;
