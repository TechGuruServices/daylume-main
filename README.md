# CraigsCatch — Craigslist Free Item Scanner

A self-hosted web app (PWA) that monitors Craigslist RSS feeds for free items and sends real-time Telegram alerts.

## Features

- 🔍 **RSS Feed Monitoring** — Add any Craigslist search RSS URL, auto-checks on a timer
- 📨 **Telegram Alerts** — Instant notifications when new free items are posted
- 🤖 **AI Assistant** — Chat with an Ollama-powered AI about your finds
- 📱 **PWA** — Installable on mobile and desktop like a native app
- 🗄️ **PostgreSQL** — Persistent storage via Drizzle ORM

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL database
- (Optional) [Ollama](https://ollama.ai) running locally for AI chat
- (Optional) Telegram bot token

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Craigslist-Item-Scanner.git
   cd Craigslist-Item-Scanner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and optional settings
   ```

4. **Push the database schema**
   ```bash
   npm run db:push
   ```

5. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5000](http://localhost:5000)

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | — | PostgreSQL connection string |
| `PORT` | No | `5000` | Server port |
| `CHECK_INTERVAL_MINUTES` | No | `15` | How often to poll RSS feeds |
| `OLLAMA_URL` | No | `http://localhost:11434/api/generate` | Ollama API endpoint |
| `OLLAMA_MODEL` | No | `qwen` | Ollama model name |
| `TELEGRAM_BOT_TOKEN` | No | — | From [@BotFather](https://t.me/botfather) |
| `TELEGRAM_CHAT_ID` | No | — | Your Telegram user/group chat ID |

---

## Deploy to Render

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Create a PostgreSQL database on Render
- Go to [dashboard.render.com](https://dashboard.render.com)
- **New → PostgreSQL** → pick free or starter tier
- Copy the **Internal Database URL**

### 3. Deploy the web service
- **New → Blueprint** → connect your GitHub repo
- Render detects `render.yaml` automatically
- In the service's **Environment** tab, set:
  - `DATABASE_URL` → paste the Internal Database URL
  - `TELEGRAM_BOT_TOKEN` → your bot token (optional)
  - `TELEGRAM_CHAT_ID` → your chat ID (optional)
  - `OLLAMA_URL` → your Ollama instance URL (optional)

### 4. Run database migrations
After first deploy, open the Render **Shell** tab and run:
```bash
npm run db:push
```

### Getting Your Telegram Credentials
1. Message [@BotFather](https://t.me/botfather) → `/newbot` → copy the token
2. Message [@userinfobot](https://t.me/userinfobot) → it replies with your chat ID
3. Start your bot first by messaging it, then add it to any group you want alerts in

---

## How It Works

1. You add a Craigslist RSS URL (e.g. `https://yourcity.craigslist.org/search/zip?format=rss`)
2. The server checks all active monitors every `CHECK_INTERVAL_MINUTES`
3. New items are stored in PostgreSQL (deduped by RSS GUID)
4. A Telegram alert is fired for each new item
5. The dashboard shows all discovered items in real time

---

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, Framer Motion
- **Backend**: Express 5, Node.js
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Ollama (local LLM)
- **Notifications**: Telegram Bot API
