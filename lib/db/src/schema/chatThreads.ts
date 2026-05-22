import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatThreadsTable = pgTable("chat_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  title: text("title"),
  role: text("role").notNull(), // frontier | developer | sales | support | sme
  orgId: uuid("org_id"),
  modelId: uuid("model_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChatThreadSchema = createInsertSchema(chatThreadsTable).omit({ id: true, createdAt: true });
export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;
export type ChatThread = typeof chatThreadsTable.$inferSelect;
