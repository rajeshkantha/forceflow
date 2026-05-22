import { pgTable, text, timestamp, uuid, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qualityReportsTable = pgTable("quality_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  pipelineRunId: uuid("pipeline_run_id"),
  violations: jsonb("violations"),
  coveragePct: numeric("coverage_pct"),
  scoreLetter: text("score_letter").notNull().default("A"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQualityReportSchema = createInsertSchema(qualityReportsTable).omit({ id: true, createdAt: true });
export type InsertQualityReport = z.infer<typeof insertQualityReportSchema>;
export type QualityReport = typeof qualityReportsTable.$inferSelect;
