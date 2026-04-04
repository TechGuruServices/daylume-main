import { db } from "./db";
import {
  monitors,
  items,
  messages,
  type Monitor,
  type InsertMonitor,
  type Item,
  type InsertItem,
  type UpdateMonitorRequest,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Monitors
  getMonitors(): Promise<Monitor[]>;
  getMonitor(id: number): Promise<Monitor | undefined>;
  createMonitor(monitor: InsertMonitor): Promise<Monitor>;
  updateMonitor(id: number, monitor: UpdateMonitorRequest): Promise<Monitor | undefined>;
  deleteMonitor(id: number): Promise<void>;
  
  // Items
  getItems(monitorId?: number): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  deleteItem(id: number): Promise<void>;
  getItemByGuid(guid: string): Promise<Item | undefined>;

  // AI Chat
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  // Monitors
  async getMonitors(): Promise<Monitor[]> {
    return await db.select().from(monitors);
  }

  async getMonitor(id: number): Promise<Monitor | undefined> {
    const [monitor] = await db.select().from(monitors).where(eq(monitors.id, id));
    return monitor;
  }

  async createMonitor(insertMonitor: InsertMonitor): Promise<Monitor> {
    const [monitor] = await db.insert(monitors).values(insertMonitor).returning();
    return monitor;
  }

  async updateMonitor(id: number, updates: UpdateMonitorRequest): Promise<Monitor | undefined> {
    const [monitor] = await db
      .update(monitors)
      .set(updates)
      .where(eq(monitors.id, id))
      .returning();
    return monitor;
  }

  async deleteMonitor(id: number): Promise<void> {
    await db.delete(monitors).where(eq(monitors.id, id));
    // Also delete associated items
    await db.delete(items).where(eq(items.monitorId, id));
  }

  // Items
  async getItems(monitorId?: number): Promise<Item[]> {
    if (monitorId) {
      return await db.select().from(items).where(eq(items.monitorId, monitorId)).orderBy(desc(items.postedAt));
    }
    return await db.select().from(items).orderBy(desc(items.postedAt));
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(insertItem).returning();
    return item;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async getItemByGuid(guid: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.guid, guid));
    return item;
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }
}

export const storage = new DatabaseStorage();
