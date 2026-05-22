import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolApprovalsTable = pgTable("tool_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  threadId: uuid("thread_id").notNull(),
  messageId: uuid("message_id"),
  toolName: text("tool_name").notNull(),
  args: jsonb("args"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertToolApprovalSchema = createInsertSchema(toolApprovalsTable).omit({ id: true, createdAt: true });
export type InsertToolApproval = z.infer<typeof insertToolApprovalSchema>;
export type ToolApproval = typeof toolApprovalsTable.$inferSelect;
