# Craigs-Catch — Craigslist Item Scanner (Live Setup Guide)

This guide provides step-by-step instructions for taking this project from code to a **Live, functioning system** using **real data** and **no placeholders**.

## 1. Entering the Correct Directory
When opening your terminal, ensure you traverse into the correct project folder before running any commands. Otherwise, you will receive `Missing script` errors.
```powershell
cd "Craigslist-Item-Scanner-main"
```

## 2. Install Dependencies
Install all required Node.js packages for the server and web application:
```powershell
npm install
```

## 3. Database Setup (Crucial for Real Data)
Before starting the application, you must initialize the database schema. This creates the exact tables (`local.db` file) necessary for persistence, preventing crashes when the real app tries to write data.
```powershell
npm run db:push
```

## 4. Environment Variables & Authentication
You need real credentials to ensure the bot can safely reach out to you via Telegram without placeholders.

1. **Create the Environment File** by copying the template file:
   ```powershell
   cp .env.example .env
   # Or manually rename the file to just ".env"
   ```
2. **Edit `.env`** with real live values:
   - `DATABASE_URL=./local.db` (Leave as is for SQLite)
   - `TELEGRAM_BOT_TOKEN=your_real_bot_token` (Replace with token from @BotFather)
   - `TELEGRAM_CHAT_ID=your_real_chat_id` (Replace with Chat ID)
   - `CHECK_INTERVAL_MINUTES=5` (How often you want the system to check for live updates)
   - `PORT=5000` (Local web dashboard port)

   *(For complete steps on getting Telegram credentials, read the "Live Telegram Setup" section below).*

## 5. Running the Application Live
Start up the web dashboard and the background process:
```powershell
npm run dev
```
*(Note for 24/7 Run: If you wish to run this indefinitely without keeping the terminal open, you should use PM2: `npm install -g pm2` followed by `pm2 start npm --name "craigscatch" -- run dev`)*

## 6. Configuring Real Live Filters (Web Dashboard)
Once your server is running, navigate to [http://localhost:5000](http://localhost:5000) using your web browser. 

To use real data instead of placeholders:
1. **Navigate to real Craigslist**: Go to craigslist.org and perform your exact desired search (e.g., search for "macbook", check "has image", select the max price).
2. **Copy the URL**: Copy the URL from your browser's address bar. It should look something like `https://sfbay.craigslist.org/search/sya?query=macbook&max_price=500`.
3. **Add to Craigs-Catch**: In your dashboard on `http://localhost:5000`, paste this exact URL into the "Add Feed" or "Filter" section. 
4. **Live Feed Process**: The background script will immediately execute, download the real live listings directly from your link, save them to the local database, and ping your Telegram account!

---

## Live Telegram Setup (Step-by-Step)
For getting actual production push notifications on your phone, you must link your own bot.

### Step A: Creating Your Bot
1. Open up your Telegram App.
2. Search for the user `@BotFather` and start a chat.
3. Send the message `/newbot`.
4. Give it a name (e.g., `My CraigsCatch Bot`) and a username ending in bot (e.g., `my_craigscatch_123_bot`).
5. `@BotFather` will reply with a long HTTP API key. **Copy this string** and paste it into `.env` for `TELEGRAM_BOT_TOKEN`.

### Step B: Routing Messages to You (Finding Chat ID)
Your bot needs to know exactly who to message.

**For Personal Alerts (Just you):**
1. Search for `@userinfobot` in Telegram and click "Start".
2. It will reply immediately with an `Id: 123456789`.
3. Copy that number into your `.env` as `TELEGRAM_CHAT_ID`.
4. **REQUIRED STEP**: You must open a chat with your newly created bot (search for the bot's username) and send it any message (like "hello") or click "Start". Bots cannot message you unless you initiate the conversation first.

**For Group Alerts (You and friends/family):**
1. Create a new Telegram Group from your phone.
2. Add your newly created bot into the group.
3. Open your browser and navigate to (Replace `<YOUR_BOT_TOKEN>` with the token from Step A):
   `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for the `chat` object in the code that appears. It will have an `id` that is negative (e.g., `-100987654321`). 
5. Copy this negative number into your `.env` for `TELEGRAM_CHAT_ID`.
