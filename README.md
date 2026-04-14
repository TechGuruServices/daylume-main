# <p align="center"><img src="client/public/logo-512.png" width="128" height="128" /><br>Craigs-Catch</p>

<p align="center">
  <b>Premium Craigslist Monitoring Shell & Real-Time Alert System</b><br>
  <i>Find deals before anyone else with Luxury Dark Mode PWA aesthetics and instant Telegram notifications.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge&logo=appveyor" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/PRs-welcome-violet?style=for-the-badge" />
</p>

---

## ✨ Overview

**Craigs-Catch** is a high-performance, mobile-first monitoring tool designed for power users who need to track Craigslist listings with surgical precision. Whether you're hunting for free furniture or rare electronics, Craigs-Catch scans feeds in real-time, processes them through an intelligent back-end, and delivers instant push notifications to your device.

Featuring a **Dark Mode Luxury** aesthetic inspired by modern design leaders like Linear and Raycast, the interface provides a premium user experience that feels more like a native app than a web utility.

## 🚀 Key Features

- 💎 **Premium PWA UI**: A state-of-the-art interface with glassmorphic cards, dynamic text gradients, and smooth Framer Motion animations.
- ⚡ **Real-Time Scanning**: Sub-millisecond feed processing ensures you see the listings as soon as they hit Craigslist.
- 📱 **Telegram Integration**: Instant alerts delivered directly to your phone. Never miss a "Free Stuff" post again.
- 🤖 **AI-Powered Analysis**: Integrated LLM support (Ollama/Together AI) to chat with your captured items and identify the best deals.
- 📊 **Intelligence Dashboard**: Track your "Catches," manage active filters, and view system health in one sleek overview.
- 🛠️ **Custom Monitors**: Easily add, toggle, and tune monitors for specific locations and categories.

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons |
| **State/Data** | TanStack Query (React Query), Wouter, Zod |
| **Backend** | Node.js, Express, TSX |
| **Database** | SQLite (Better-SQLite3), Drizzle ORM |
| **Alerts** | Telegram Bot API |
| **Design** | PWA Optimized, Glassmorphism, HSL Palette |

---

## 🚦 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or higher)
- [Git](https://git-scm.com/)
- A [Telegram Bot](https://t.me/BotFather) token (for alerts)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/TechGuruServices/daylume-main.git
cd Craigs-Catch
npm install
```

### 3. Database Initialization
Prepare your local SQLite database using Drizzle:
```bash
npm run db:push
```

### 4. Configuration
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
DATABASE_URL=./local.db
TELEGRAM_BOT_TOKEN=8620985452:AAErFPtvEszY21A9-3jO7cdExWY3PyrjT6c
TELEGRAM_CHAT_ID=-1003310780263
CHECK_INTERVAL_MINUTES=5
PORT=5000
```

### 5. Launch the System
Start the development server:
```bash
npm run dev
```
Access the dashboard at `http://localhost:5000`.

---

## 🤖 AI Setup (Optional)
Craigs-Catch supports local AI via **Ollama** or cloud AI via **Together API**.
1. To use local AI, install [Ollama](https://ollama.com/) and run `ollama pull qwen`.
2. Update your `.env` with `LLM_PROVIDER=ollama` or `LLM_PROVIDER=together`.

---

## 📱 Mobile Installation (PWA)
1. Open the dashboard on your mobile browser.
2. Select **"Add to Home Screen"** from your browser settings.
3. Enjoy a full-screen, standalone native app experience with custom branded icons.

---

## 🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">Built with 💙 by the Craigs-Catch Team</p>
