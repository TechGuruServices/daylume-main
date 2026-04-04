import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  active: boolean("active").default(true).notNull(),
  lastChecked: timestamp("last_checked"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id").notNull(),
  title: text("title").notNull(),
  link: text("link").notNull(),
  description: text("description"),
  postedAt: timestamp("posted_at"),
  guid: text("guid").notNull().unique(), // The RSS item guid to prevent duplicates
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const monitorsRelations = relations(monitors, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  monitor: one(monitors, {
    fields: [items.monitorId],
    references: [monitors.id],
  }),
}));

export const insertMonitorSchema = createInsertSchema(monitors).omit({ id: true, lastChecked: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

export type Monitor = typeof monitors.$inferSelect;
export type InsertMonitor = z.infer<typeof insertMonitorSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type CreateMonitorRequest = InsertMonitor;
export type UpdateMonitorRequest = Partial<InsertMonitor> & { lastChecked?: Date | null };

export type MonitorResponse = Monitor;
export type MonitorsListResponse = Monitor[];
export type ItemResponse = Item;
export type ItemsListResponse = Item[];
