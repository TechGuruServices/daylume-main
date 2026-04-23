<p align="center">
  <img src="static/assets/orb_float_slow.gif" alt="Daylume Logo" width="100" height="90">
</p>
<h1 align="center">✨ DAYLUME </h1>

<p align="center">
  <h1>Bring Your Day Into Focus ― Your Personal Productivity Companion<h1>
</p>

<p align="center">
  A beautiful, feature-rich Progressive Web App for managing your daily life — tasks, habits, goals, journal, calendar, and more.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" alt="SvelteKit">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare">
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA">
</p>

---

## 🌟 Features

### 📋 **Task Management**
- Create, organize, and prioritize tasks with ease
- Set due dates, times, and priority levels (Low, Medium, High, Urgent)
- Track task status: Pending → In Progress → Completed
- Categorize tasks for better organization
- Swipe gestures for quick actions

### 🎯 **Habit Tracking**
- Build positive habits with daily, weekly, or monthly tracking
- Visual streak counters to maintain motivation
- Custom icons and colors for each habit
- Progress logs with notes
- Habit completion insights

### 🏆 **Goal Setting**
- Set and track long-term goals with milestones
- Link tasks and habits to goals for integrated progress
- Categories: Health, Career, Personal, Financial, Learning, Relationships
- Visual progress indicators
- Goal status management (Active, Completed, Paused)

### 📅 **Calendar & Events**
- Beautiful calendar view with event management
- Create recurring events (Daily, Weekly, Monthly)
- Color-coded categories: Work, Personal, Health, Other
- Time blocking for focused work sessions
- Event reminders and notifications

### 📓 **Journal**
- Daily journaling with mood tracking
- Rich text entries with tags
- Mood selector: 😊 😐 😢 😡 😴 🤗 😰
- Search and filter past entries
- Reflection prompts

### ⏰ **Alarms & Timers**
- Set multiple alarms with custom labels
- Repeat options: Once, Daily, Weekdays, Weekends, Custom
- Countdown timers for focused sessions
- Audio and visual notifications
- Quick timer presets

### 🧮 **Calculator**
- Clean, intuitive calculator interface
- Calculation history
- Scientific functions
- Quick access from anywhere

### 🤖 **AI Assistant**
- Integrated AI chat powered by Hugging Face
- Context-aware productivity assistance
- Get suggestions for tasks, habits, and goals
- Natural language processing

### 📊 **Weekly Review**
- Comprehensive weekly summaries
- Task completion rates
- Habit consistency metrics
- Reflection prompts: What went well? What to improve?
- Productivity scoring

### 🎨 **Customization**
- **Multiple Visual Themes**: Default, Aurora, Sunset, Ocean, Forest, Minimal
- **Theme Presets**: Midnight, Dawn, Ocean, Sunset, Forest, Aurora, Ember
- **Glassmorphism UI** with adjustable intensity
- **Custom Colors**: Primary, Secondary, Accent
- **Font Options**: Inter, Roboto, Outfit, Poppins
- **Animation Speed Control**
- **Density Settings**: Compact, Comfortable, Spacious
- **Custom Background Images** with shuffle support

### 📱 **Progressive Web App**
- Install on any device (iOS, Android, Desktop)
- Offline-first architecture
- Push notifications
- App-like experience
- Quick capture shortcuts

### 🔐 **Privacy & Security**
- Local-first data storage
- Optional Supabase cloud sync
- Encrypted sensitive data
- No tracking or analytics

---

## 🖼️ Screenshots

<p align="center">
  <i>Beautiful glassmorphic design with animated themes</i>
</p>

| Dashboard | Tasks | Habits |
|:---------:|:-----:|:------:|
| Home view with widgets, weather, and quick actions | Organized task list with priorities | Track daily habits with streaks |

| Calendar | Journal | Goals |
|:--------:|:-------:|:-----:|
| Event management with time blocks | Daily entries with mood tracking | Long-term goal tracking with milestones |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [SvelteKit](https://kit.svelte.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Database** | [Supabase](https://supabase.com/) (optional cloud sync) |
| **AI** | [Hugging Face Inference API](https://huggingface.co/) |
| **Deployment** | [Cloudflare Pages](https://pages.cloudflare.com/) |
| **PWA** | [Vite PWA Plugin](https://vite-pwa-org.netlify.app/) |
| **Icons** | Custom glassmorphic icons |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ 
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TechGuruServices/daylume.git
   cd daylume
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase (Optional - for cloud sync)
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Hugging Face AI (Required for AI chat)
   HF_TOKEN=your_hugging_face_token
   HF_MODEL=openai/gpt-oss-120b:fastest
   HF_BASE_URL=https://router.huggingface.co/v1
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:5173](http://localhost:5173)

---

## 📦 Building for Production

```bash
# Build the application
npm run build

# Preview the production build locally
npm run preview
```

---

## ☁️ Deployment

### Cloudflare Pages (Recommended)

Daylume is configured for seamless deployment on Cloudflare Pages with serverless functions.

1. **Connect your GitHub repository** to Cloudflare Pages

2. **Configure build settings:**
   | Setting | Value |
   |---------|-------|
   | Build command | `npm run build` |
   | Build output directory | `.svelte-kit/cloudflare` |

3. **Add environment variables** in Cloudflare Dashboard:
   - `HF_TOKEN` - Your Hugging Face API token
   - `HF_MODEL` - AI model identifier
   - `HF_BASE_URL` - Hugging Face API base URL

4. **Deploy!** 🚀

### Other Platforms

Daylume can also be deployed to:
- Vercel (use `@sveltejs/adapter-vercel`)
- Netlify (use `@sveltejs/adapter-netlify`)
- Node.js server (use `@sveltejs/adapter-node`)

---

## 📁 Project Structure

```
daylume/
├── src/
│   ├── lib/
│   │   ├── components/      # Reusable Svelte components
│   │   │   └── widgets/     # Dashboard widget components
│   │   ├── ai-context.ts    # AI conversation context
│   │   ├── ai-providers.ts  # AI provider configurations
│   │   ├── encryption.ts    # Data encryption utilities
│   │   ├── haptics.ts       # Haptic feedback utilities
│   │   ├── notifications.ts # Push notification handling
│   │   ├── search.ts        # Search functionality
│   │   ├── storage.ts       # LocalStorage wrapper
│   │   ├── supabase.ts      # Supabase client
│   │   ├── theme.ts         # Theme management
│   │   ├── toast.ts         # Toast notifications
│   │   ├── types.ts         # TypeScript definitions
│   │   ├── user.ts          # User store
│   │   └── widgets.ts       # Widget system
│   ├── routes/
│   │   ├── alarms/          # Alarms & Timers page
│   │   ├── api/chat/        # AI chat API endpoint
│   │   ├── calculator/      # Calculator page
│   │   ├── calendar/        # Calendar & Events page
│   │   ├── goals/           # Goals page
│   │   ├── habits/          # Habits page
│   │   ├── journal/         # Journal page
│   │   ├── login/           # Authentication page
│   │   ├── profile/         # User profile page
│   │   ├── settings/        # Settings page
│   │   ├── tasks/           # Tasks page
│   │   ├── +layout.svelte   # App layout
│   │   ├── +page.svelte     # Dashboard/Home page
│   │   └── +error.svelte    # Error page
│   ├── app.css              # Global styles
│   └── app.html             # HTML template
├── static/
│   └── assets/              # Icons, logos, images
├── svelte.config.js         # SvelteKit configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── vite.config.ts           # Vite configuration
├── wrangler.toml            # Cloudflare configuration
└── package.json
```

---

## 🎨 Customization

### Adding New Themes

1. Edit `src/lib/theme.ts` to add new theme presets
2. Define colors in `tailwind.config.js`
3. Create animated backdrops in `ThemeBackdrop.svelte`

### Adding New Widgets

1. Create a widget component in `src/lib/components/widgets/`
2. Register it in `src/lib/widgets.ts`
3. Add to the widget picker

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style
- Write TypeScript for all new code
- Test on multiple screen sizes
- Ensure PWA functionality works offline
- Update documentation as needed

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🙏 Acknowledgments

- [SvelteKit](https://kit.svelte.dev/) - The framework that makes development a joy
- [Tailwind CSS](https://tailwindcss.com/) - For beautiful, responsive styling
- [Supabase](https://supabase.com/) - Backend as a service
- [Hugging Face](https://huggingface.co/) - AI model hosting
- [Cloudflare](https://cloudflare.com/) - Edge deployment platform

---

<p align="center">
  <strong>powered by TECHGURU</strong>
</p>

<p align="center">
  <a href="https://github.com/TechGuruServices/daylume">⭐ Star this repo</a> •
  <a href="https://github.com/TechGuruServices/daylume/issues">🐛 Report Bug</a> •
  <a href="https://github.com/TechGuruServices/daylume/issues">✨ Request Feature</a>
</p>
