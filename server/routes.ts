import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

/**
 * Fetch HTML search results using fetch() with browser-like headers,
 * then parse the static HTML structure using Regex. Craigslist blocked
 * direct RSS feeds and Node's default User-Agents.
 */
async function fetchFeed(feedUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  // Safely remove the format=rss parameter
  const urlObj = new URL(feedUrl);
  urlObj.searchParams.delete('format');
  const htmlUrl = urlObj.toString();
  console.log(`[scraper] Fetching HTML from URL: ${htmlUrl}`);

  try {
    const response = await fetch(htmlUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }

    const html = await response.text();
    const items: Array<{ title: string; link: string; guid: string; contentSnippet: string; pubDate: string; content?: string }> = [];

    // Craigslist static HTML items typically look like:
    // <li class="cl-static-search-result" title="Title">[\s\S]*?<a href="https://link">
    const staticRegex = /<li class="cl-static-search-result" title="([^"]+)">[\s\S]*?<a href="([^"]+)">/g;
    let match;

    // Simple HTML decoder for titles
    const decodeHtml = (html: string) => {
      return html
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'");
    };

    while ((match = staticRegex.exec(html)) !== null) {
      const title = decodeHtml(match[1]);
      const link = match[2];
      const guid = link; // Use URL as unique guid since it contains the item ID
      items.push({
        title,
        link,
        guid,
        contentSnippet: title,
        pubDate: new Date().toISOString(), // Use current time as fallback since static HTML lacks exact time
      });
    }

    return { items };
  } finally {
    clearTimeout(timeout);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // AI Chat API
  app.get(api.ai.messages.path, async (_req: Request, res: Response) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post(api.ai.chat.path, async (req: Request, res: Response) => {
    try {
      const { message } = api.ai.chat.input.parse(req.body);

      // Save user message
      await storage.createMessage({
        role: "user",
        content: message,
      });

      let aiContent = "";
      try {
        const groqApiKey = process.env.GROQ_API_KEY;
        const model = process.env.MODEL_NAME || "llama3-8b-8192";

        if (!groqApiKey) {
          throw new Error("GROQ_API_KEY is not set in environment variables.");
        }

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: "You are CraigsCatch AI, a helpful assistant that helps users find and evaluate free items on Craigslist. Be concise, friendly, and practical.",
              },
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 512,
          }),
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json() as { choices: { message: { content: string } }[] };
          aiContent = data.choices?.[0]?.message?.content || "No response received.";
        } else {
          const errText = await groqResponse.text();
          throw new Error(`Groq API error ${groqResponse.status}: ${errText}`);
        }
      } catch (error) {
        console.error("Groq AI error:", error);
        aiContent = `⚠️ AI Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      const assistantMessage = await storage.createMessage({
        role: "assistant",
        content: aiContent,
      });

      // assistantMessage.content contains the AI response
      res.json({ response: assistantMessage.content });
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Monitors API
  app.get(api.monitors.list.path, async (req: Request, res: Response) => {
    const allMonitors = await storage.getMonitors();
    res.json(allMonitors);
  });

  app.get(api.monitors.get.path, async (req: Request, res: Response) => {
    const monitor = await storage.getMonitor(Number(req.params.id));
    if (!monitor) {
      return res.status(404).json({ message: 'Monitor not found' });
    }
    res.json(monitor);
  });

  app.post(api.monitors.create.path, async (req: Request, res: Response) => {
    try {
      const input = api.monitors.create.input.parse(req.body);
      const monitor = await storage.createMonitor(input);
      res.status(201).json(monitor);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.monitors.update.path, async (req: Request, res: Response) => {
    try {
      const input = api.monitors.update.input.parse(req.body);
      const monitor = await storage.updateMonitor(Number(req.params.id), input);
      if (!monitor) {
        return res.status(404).json({ message: 'Monitor not found' });
      }
      res.json(monitor);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.monitors.delete.path, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const monitor = await storage.getMonitor(id);
    if (!monitor) {
      return res.status(404).json({ message: 'Monitor not found' });
    }
    await storage.deleteMonitor(id);
    res.status(204).send();
  });

  // Items API
  app.get(api.items.list.path, async (req: Request, res: Response) => {
    const monitorId = req.query.monitorId ? Number(req.query.monitorId) : undefined;
    const allItems = await storage.getItems(monitorId);
    res.json(allItems);
  });

  app.delete(api.items.delete.path, async (req: Request, res: Response) => {
    await storage.deleteItem(Number(req.params.id));
    res.status(204).send();
  });

  // Trigger Check API
  app.post(api.jobs.triggerCheck.path, async (req: Request, res: Response) => {
    try {
      await checkFeeds();
      res.json({ message: "Check completed successfully" });
    } catch (error: any) {
      console.error("Error checking feeds:", error);
      res.status(500).json({ message: error.message || "Failed to check feeds" });
    }
  });

  // Test Telegram API — sends a test message to verify bot token + chat ID
  app.post("/api/test-telegram", async (_req: Request, res: Response) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(400).json({ 
        ok: false, 
        message: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in your .env file." 
      });
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ <b>CraigsCatch Telegram Test</b>\n\nYour Telegram notifications are working correctly! 🎉",
          parse_mode: "HTML",
        }),
      });

      const data = await response.json() as { ok: boolean; description?: string };

      if (data.ok) {
        return res.json({ ok: true, message: "Test message sent successfully! Check your Telegram." });
      } else {
        return res.status(400).json({ ok: false, message: data.description || "Telegram API returned an error." });
      }
    } catch (err: any) {
      return res.status(500).json({ ok: false, message: `Request failed: ${err.message}` });
    }
  });

  // Health check endpoint (uptime monitors ping this to prevent Render spin-down)
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Telegram configuration check on startup
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn("[telegram] ⚠️ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set. Telegram alerts are DISABLED.");
  } else {
    console.log("[telegram] ✅ Telegram alerts configured for chat ID:", process.env.TELEGRAM_CHAT_ID);
  }

  // Setup periodic checking
  const intervalMinutes = parseInt(process.env.CHECK_INTERVAL_MINUTES || "10", 10);
  const CHECK_INTERVAL = intervalMinutes * 60 * 1000;
  console.log(`[scheduler] Feed check interval: every ${intervalMinutes} minutes`);
  setInterval(() => {
    checkFeeds().catch(err => console.error("Periodic feed check failed:", err));
  }, CHECK_INTERVAL);

  // Run initial feed check shortly after startup (gives DB connections time to establish)
  setTimeout(() => {
    console.log("[scheduler] Running initial feed check on startup...");
    checkFeeds().catch(err => console.error("Startup feed check failed:", err));
  }, 5000);

  return httpServer;
}

async function checkFeeds() {
  const allMonitors = await storage.getMonitors();

  for (const monitor of allMonitors) {
    if (!monitor.active) continue;

    try {
      const feed = await fetchFeed(monitor.url);

      let newItemsCount = 0;
      for (const item of feed.items) {
        const guid = item.guid || item.link;
        if (!guid) continue;

        // Check if item already exists
        const existingItem = await storage.getItemByGuid(guid);
        if (!existingItem) {
          const newItem = await storage.createItem({
            monitorId: monitor.id,
            title: item.title || "No Title",
            link: item.link || "",
            description: item.contentSnippet || item.content || "",
            postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            guid: guid,
          });
          newItemsCount++;

          await sendTelegramAlert(newItem.title, newItem.link, monitor.name);
          // Throttle between messages to respect Telegram API rate limits
          await new Promise(r => setTimeout(r, 250));
        }
      }

      // Update last checked time
      await storage.updateMonitor(monitor.id, { lastChecked: new Date() });
      console.log(`Checked monitor ${monitor.name}: ${newItemsCount} new items`);

    } catch (error) {
      console.error(`Failed to parse feed for monitor ${monitor.name}:`, error);
    }
  }
}

async function sendTelegramAlert(title: string, link: string, monitorName: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return;

  // Escape HTML characters to prevent breaking the HTML parse mode
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeMonitorName = monitorName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const text = `🚨 <b>New Item Found!</b> 🚨\n\n<b>${safeTitle}</b>\n\n<a href="${link}">View on Craigslist</a>\n<i>Monitor: ${safeMonitorName}</i>`;

  const maxRetries = 3;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      });

      clearTimeout(timeout);

      if (response.ok) {
        const duration = Date.now() - startTime;
        console.log(`[telegram] ✅ Sent alert for "${title}" (${duration}ms)`);
        return;
      }

      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        const body = await response.json() as { parameters?: { retry_after?: number } };
        const retryAfter = body?.parameters?.retry_after || 5;
        console.warn(`[telegram] ⏳ Rate limited. Retrying in ${retryAfter}s (attempt ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }

      // Non-retryable API error
      const errText = await response.text();
      console.error(`[telegram] ❌ API error ${response.status}: ${errText}`);
      return;

    } catch (err: any) {
      const isAbort = err.name === "AbortError";
      console.error(`[telegram] ❌ ${isAbort ? "Timeout" : "Network error"} (attempt ${attempt}/${maxRetries}):`, err.message);
      if (attempt < maxRetries) {
        const backoff = 500 * Math.pow(2, attempt - 1); // 500ms, 1s, 2s exponential backoff
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  console.error(`[telegram] ❌ Failed to send alert for "${title}" after ${maxRetries} attempts.`);
}

