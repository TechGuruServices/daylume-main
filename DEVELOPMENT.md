# Development Guide for Daylume

Welcome to the Daylume development guide! This document covers everything you need to get started contributing to the project.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: For version control

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/TechGuruServices/daylume-main.git
cd daylume-main
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

**Note**: We use `--legacy-peer-deps` due to some compatibility constraints with SvelteKit and Vite versions. This is temporary and will be resolved in future SvelteKit releases.

### 3. Environment Configuration

Create a `.env.local` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anonymous-key
```

To get these values:
1. Go to your [Supabase dashboard](https://app.supabase.com)
2. Navigate to Project Settings > API
3. Copy the Project URL and Anon Key

## Development Workflow

### Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output will be in `.svelte-kit/output/`

### Preview Production Build

```bash
npm run preview
```

### Type Check

```bash
npm run check
```

Live type checking with watch mode:

```bash
npm run check:watch
```

## Testing

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### View Test UI

```bash
npm run test:ui
```

Visit `http://localhost:51204` to see the interactive test interface.

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/`

## Project Structure

```
src/
├── lib/                    # Shared utilities & libraries
│   ├── components/         # Reusable Svelte components
│   ├── ai-*.ts            # AI integration modules
│   ├── storage.ts         # LocalStorage API
│   ├── supabase.ts        # Supabase client
│   └── *.ts               # Other utility modules
├── routes/                # SvelteKit pages & layouts
│   ├── +page.svelte      # Home/Dashboard page
│   ├── +layout.svelte    # Root layout
│   ├── alarms/           # Alarms feature
│   ├── calendar/         # Calendar feature
│   ├── goals/            # Goals tracking
│   ├── habits/           # Habit tracking
│   ├── journal/          # Journal entries
│   ├── tasks/            # Task management
│   └── [other routes]/   # Other features
├── app.css               # Global styles
└── app.html             # HTML template

static/
├── assets/              # Images, icons
└── offline.html        # Offline fallback page
```

## Code Standards

### TypeScript

- Use strict mode (`strict: true` in tsconfig.json)
- Fully type your code - avoid `any` type
- Use TypeScript generics for reusable utilities

### Svelte Components

- Use `<script lang="ts">` for TypeScript support
- Add `aria-label` to buttons without visible text
- Use reactive stores for shared state (`$lib/user.ts`, `$lib/storage.ts`)
- Prefer `onMount` and `onDestroy` lifecycle hooks

### Styling

- Use Tailwind CSS utility classes
- Follow the mobile-first approach
- Use CSS Grid for layouts, Flexbox for components
- Respect the existing design system (colors, spacing, typography)

### File Naming

- Components: PascalCase (`Button.svelte`, `Modal.svelte`)
- Utilities: camelCase (`storage.ts`, `notifications.ts`)
- Routes: kebab-case with `+` prefix (`+page.svelte`, `+layout.ts`)

## Common Tasks

### Add a New Feature

1. Create feature folder in `src/routes/[feature]/`
2. Add `+page.svelte` (UI) and `+page.ts` (data loading)
3. Add types to `$lib/types.ts`
4. Add storage functions to `$lib/storage.ts` if needed
5. Write tests in `src/routes/[feature]/__tests__/`

### Fix a Bug

1. Create a test case that reproduces the bug
2. Fix the bug
3. Verify the test passes
4. Commit with message: `fix: description of the bug fix`

### Add Configuration

Environment variables go in `.env.local` (not tracked by git):

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_AI_PROVIDER=openai
```

Access in code: `import.meta.env.VITE_SUPABASE_URL`

## Debugging

### VS Code

1. Install "Debugger for Firefox" or "Debugger for Chrome" extension
2. Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

3. Set breakpoints in VS Code
4. Press F5 to start debugging

### Browser DevTools

- Open browser DevTools (F12)
- Use Console tab for `console.log` output
- Use Network tab to debug API calls
- Use Application tab to inspect LocalStorage/IndexedDB

## Performance

- Use Lighthouse Chrome extension for audits
- Check bundle size: `npm run build` and review `.svelte-kit/output/`
- Profile runtime performance in Chrome DevTools

## Deployment

### Deploy to Cloudflare Workers

```bash
npm run build
wrangler deploy
```

Requires `wrangler` CLI and `wrangler.toml` configuration.

### Deploy to Vercel

```bash
vercel deploy
```

Requires adapter change in `svelte.config.js` and `vercel.json` config.

## Known Issues & Limitations

- **Vulnerabilities**: 14 npm audit warnings in development dependencies (cookie, esbuild, minimatch, undici). These are from transitive dependencies in SvelteKit toolchain and don't affect the application. They'll be resolved when @sveltejs/kit releases compatible patches.

- **Browser Support**: Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+)

- **Mobile**: Progressive Web App support with limited offline functionality

## Getting Help

- **Documentation**: Check `/docs` folder
- **Issues**: Search existing [GitHub Issues](https://github.com/TechGuruServices/daylume-main/issues)
- **Discussion**: Open a [GitHub Discussion](https://github.com/TechGuruServices/daylume-main/discussions)

## Additional Resources

- [SvelteKit Documentation](https://kit.svelte.dev)
- [Svelte Documentation](https://svelte.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)

## License

[Check LICENSE file](./LICENSE)
