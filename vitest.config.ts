import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'happy-dom',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.{js,ts,svelte}'],
			exclude: [
				'node_modules/',
				'src/**/*.d.ts',
				'src/**/*.test.ts',
				'src/**/*.spec.ts'
			]
		}
	}
});
});
