# <p align="center"><img src="client/public/logo-512.png" alt="Logo" width="128" height="128" /><br>Craigs-Catch</p>

<p align="center">
  <b>Premium Craigslist Monitoring & Real-Time Alert System</b><br>
  <i>Find deals before anyone else — with Dark Mode Luxury aesthetics and instant Telegram push notifications.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge&logo=appveyor" alt="Version 1.0.0" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT" />
  <img src="https://img.shields.io/badge/PRs-welcome-violet?style=for-the-badge" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/SQLite-Drizzle-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite & Drizzle" />
</p>

---

## ✨ Overview

**Craigs-Catch** is a high-performance, mobile-first monitoring tool designed for power users who need to track Craigslist listings with surgical precision. Whether you're hunting for free furniture or rare electronics, Craigs-Catch scans feeds in real-time, processes them through an intelligent back-end, and delivers instant push notifications to your device.

Featuring a **Dark Mode Luxury** aesthetic inspired by modern design leaders like Linear and Raycast, the interface provides a premium native-app experience through its Progressive Web App architecture.

---

## 🚀 Key Features

- 💎 **Premium PWA UI** — Glassmorphic cards, dynamic text gradients, Framer Motion animations, and a curated HSL color palette.
- ⚡ **Real-Time Scanning** — Sub-millisecond feed processing ensures you see listings the moment they hit Craigslist.
- 📱 **Telegram Integration** — Instant push alerts delivered directly to your phone with rich formatting.
- 🤖 **AI-Powered Analysis** — Integrated LLM support (Ollama / Groq) to chat with your captured items and identify the best deals.
- 📊 **Intelligence Dashboard** — Track your "Catches," manage active filters, and view system health in one sleek overview.
- 🛠️ **Custom Monitors** — Add, toggle, and fine-tune monitors for specific Craigslist locations and categories.
- 🌙 **Dark Mode Luxury** — Every pixel is designed for low-light comfort and premium visual appeal.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons |
| **State / Data** | TanStack Query (React Query), Wouter, Zod |
| **Backend** | Node.js, Express 5, TSX |
| **Database** | SQLite (Better-SQLite3), Drizzle ORM |
| **Alerts** | Telegram Bot API |
| **AI** | Ollama (local) / Groq (cloud) |
| **Design** | PWA Optimized, Glassmorphism, HSL Palette |

---

## 🚦 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18.x or higher
- [Git](https://git-scm.com/)
- A [Telegram Bot](https://t.me/BotFather) token *(for alerts — optional)*

### 2. Clone & Install

```powershell
git clone https://github.com/TechGuruServices/daylume-main.git
cd daylume-main
npm install
```

### 3. Database Initialization

Create the SQLite tables required for persistence. **This must be run before starting the app for the first time:**

```powershell
npm run db:push
```

> [!IMPORTANT]
> If you skip this step, the app will crash on startup because the database tables won't exist.

### 4. Environment Configuration

Copy the example environment file and fill in your credentials:

```powershell
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
DATABASE_URL=./local.db

# Server
PORT=5000

# Telegram Notifications (optional — get these from @BotFather and @userinfobot)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Scanner Interval (minutes)
CHECK_INTERVAL_MINUTES=15

# AI — Local Ollama (optional)
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=qwen

# AI — Cloud Groq (optional, alternative to Ollama)
GROQ_API_KEY=your_groq_api_key_here
MODEL_NAME=llama3-8b-8192
```

### 5. Launch the System

```powershell
npm run dev
```

Access the dashboard at **[http://localhost:5000](http://localhost:5000)**.

> [!TIP]
> For 24/7 operation without keeping the terminal open, use PM2:
>
> ```powershell
> npm install -g pm2
> pm2 start npm --name "craigscatch" -- run dev
> ```

---

## 🔍 Adding Your First Monitor

1. **Search on Craigslist** — Go to [craigslist.org](https://craigslist.org) and perform your desired search (e.g., "macbook", max price $500, has image).
2. **Copy the URL** — Grab the full URL from your browser. It should look like:

   ```text
   https://sfbay.craigslist.org/search/sya?query=macbook&max_price=500
   ```

3. **Paste into CraigsCatch** — Open your dashboard at `http://localhost:5000` and add it as a new monitor.
4. **Sit back** — The background scanner will automatically check for new listings and push alerts to Telegram!

---

## 📱 Telegram Setup

### Creating Your Bot

1. Open Telegram and search for **@BotFather**.
2. Send `/newbot` and follow the prompts to name your bot.
3. Copy the **HTTP API token** and paste it into `.env` as `TELEGRAM_BOT_TOKEN`.

### Getting Your Chat ID

**For personal alerts:**

1. Search for **@userinfobot** in Telegram and tap "Start".
2. It replies with your `Id` — copy this into `.env` as `TELEGRAM_CHAT_ID`.
3. **Open a chat with your bot** and send it any message (e.g., "hello"). Bots cannot message you until you initiate.

**For group alerts:**

1. Create a new Telegram group and add your bot to it.
2. Open `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in your browser.
3. Find the `chat.id` (a negative number like `-100987654321`) and use it as `TELEGRAM_CHAT_ID`.

> [!NOTE]
> You can test your configuration at any time by clicking the **Test Telegram** button in the dashboard, or hitting the `POST /api/test-telegram` endpoint.

---

## 🤖 AI Setup (Optional)

Craigs-Catch supports AI-powered chat to help you analyze and evaluate your captured listings.

### Local AI — Ollama

1. Install [Ollama](https://ollama.com/).
2. Pull a model: `ollama pull qwen`
3. Set in `.env`:

   ```env
   OLLAMA_URL=http://localhost:11434/api/generate
   OLLAMA_MODEL=qwen
   ```

### Cloud AI — Groq

1. Get an API key from [Groq](https://console.groq.com/).
2. Set in `.env`:

   ```env
   GROQ_API_KEY=your_key_here
   MODEL_NAME=llama3-8b-8192
   ```

---

## 📱 Mobile Installation (PWA)

CraigsCatch is built as a Progressive Web App — install it on your phone for a native-app experience:

1. Open the dashboard on your mobile browser.
2. Tap **"Add to Home Screen"** from your browser menu.
3. Enjoy a full-screen, standalone app with custom branded icons.

---

## 📂 Project Structure

```text
Craigs-Catch/
├── client/               # React frontend (Vite)
│   ├── public/           # PWA assets, icons, manifest
│   └── src/              # Components, pages, hooks
├── server/               # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes + scraper + Telegram
│   ├── storage.ts        # Database operations (Drizzle)
│   └── db.ts             # SQLite connection
├── shared/               # Shared types, schemas, route definitions
├── script/               # Build tooling
├── .env.example          # Environment template
├── drizzle.config.ts     # Drizzle ORM config
└── package.json          # Scripts & dependencies
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">Built with 💙 by the Craigs-Catch Team</p>
