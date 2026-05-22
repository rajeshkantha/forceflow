import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentAnalysesTable = pgTable("agent_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  threadId: uuid("thread_id").notNull(),
  orgId: uuid("org_id").notNull(),
  requirementSummary: text("requirement_summary").notNull(),
  currentStateAnalysis: jsonb("current_state_analysis"),
  gapAnalysis: jsonb("gap_analysis"),
  implementationPlan: jsonb("implementation_plan"),
  status: text("status").notNull().default("draft"), // draft | approved | executing | done | failed
  createdBy: text("created_by"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  executionLog: jsonb("execution_log"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAgentAnalysisSchema = createInsertSchema(agentAnalysesTable).omit({ id: true, createdAt: true });
export type InsertAgentAnalysis = z.infer<typeof insertAgentAnalysisSchema>;
export type AgentAnalysis = typeof agentAnalysesTable.$inferSelect;
