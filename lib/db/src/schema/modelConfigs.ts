import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const modelConfigsTable = pgTable("model_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  label: text("label"),
  provider: text("provider").notNull(), // openai | anthropic | openrouter | custom
  baseUrl: text("base_url"),
  apiKeyEnc: text("api_key_enc"),
  modelName: text("model_name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertModelConfigSchema = createInsertSchema(modelConfigsTable).omit({ id: true, createdAt: true });
export type InsertModelConfig = z.infer<typeof insertModelConfigSchema>;
export type ModelConfig = typeof modelConfigsTable.$inferSelect;
