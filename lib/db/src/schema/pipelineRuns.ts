import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pipelineRunsTable = pgTable("pipeline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  gitConnectionId: uuid("git_connection_id"),
  triggerType: text("trigger_type"),
  branch: text("branch"),
  commitSha: text("commit_sha"),
  commitMessage: text("commit_message"),
  stages: jsonb("stages"),
  status: text("status").notNull().default("pending"), // pending | running | passed | failed | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertPipelineRunSchema = createInsertSchema(pipelineRunsTable).omit({ id: true, createdAt: true });
export type InsertPipelineRun = z.infer<typeof insertPipelineRunSchema>;
export type PipelineRun = typeof pipelineRunsTable.$inferSelect;
