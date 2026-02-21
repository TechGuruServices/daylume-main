import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        sveltekit(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Daylume',
                short_name: 'Daylume',
                description: 'Your personal daily planner with AI assistance',
                theme_color: '#8B5CF6',
                background_color: '#020617',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                id: '/',
                lang: 'en',
                dir: 'ltr',
                prefer_related_applications: false,
                icons: [
                    {
                        src: '/assets/favicon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: '/assets/favicon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable'
                    },
                    {
                        src: '/assets/favicon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: '/assets/favicon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    },
                    {
                        src: '/assets/apple-touch-icon.png',
                        sizes: '180x180',
                        type: 'image/png',
                        purpose: 'any'
                    }
                ],
                // PWA Shortcuts - Quick actions from home screen
                shortcuts: [
                    {
                        name: 'Add Task',
                        short_name: 'Task',
                        description: 'Quickly add a new task',
                        url: '/tasks?action=new',
                        icons: [{ src: '/assets/favicon-192.png', sizes: '192x192' }]
                    },
                    {
                        name: 'Today\'s Calendar',
                        short_name: 'Calendar',
                        description: 'View today\'s events',
                        url: '/calendar',
                        icons: [{ src: '/assets/favicon-192.png', sizes: '192x192' }]
                    },
                    {
                        name: 'Journal Entry',
                        short_name: 'Journal',
                        description: 'Write a journal entry',
                        url: '/journal?action=new',
                        icons: [{ src: '/assets/favicon-192.png', sizes: '192x192' }]
                    },
                    {
                        name: 'Quick Capture',
                        short_name: 'Capture',
                        description: 'Capture a quick thought',
                        url: '/?capture=true',
                        icons: [{ src: '/assets/favicon-192.png', sizes: '192x192' }]
                    }
                ],
                // Categories for app stores
                categories: ['productivity', 'lifestyle', 'utilities']
            },
            workbox: {
                // Optimized: Only cache essential files, exclude large assets
                globPatterns: ['**/*.{js,css,html}'],
                // Exclude source maps and non-essential files
                globIgnores: ['**/node_modules/**', '**/*.map', '**/sw.js', '**/workbox-*.js'],
                // Limit precache size
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB max per file
                runtimeCaching: [
                    // Cache fonts at runtime instead of precache
                    {
                        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    // Cache MDI icons at runtime
                    {
                        urlPattern: /^https:\/\/cdn\.jsdelivr\.net/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cdn-assets',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    // Cache images at runtime
                    {
                        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'images',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                            }
                        }
                    },
                    // Network first for API calls
                    {
                        urlPattern: /^https:\/\/api\./,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 300
                            },
                            networkTimeoutSeconds: 10
                        }
                    },
                    // Cache Supabase calls
                    {
                        urlPattern: /supabase\.co/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'supabase-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 300
                            },
                            networkTimeoutSeconds: 10
                        }
                    }
                ]
            },
            // Offline fallback for navigation requests
            navigateFallback: '/offline.html',
            navigateFallbackDenylist: [/^\/api\//],
            devOptions: {
                enabled: false // Disable in dev for faster rebuilds
            }
        })
    ],
    build: {
        // Optimize build output
        target: 'es2020',
        minify: 'esbuild',
        cssMinify: true,
        reportCompressedSize: true,
        // Split CSS
        cssCodeSplit: true,
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 200
    }
});
