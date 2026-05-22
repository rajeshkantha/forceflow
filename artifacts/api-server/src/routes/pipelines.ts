import { Router } from "express";
import { db, pipelineRunsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireTenant, requireFrontier, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function formatRun(r: typeof pipelineRunsTable.$inferSelect) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    gitConnectionId: r.gitConnectionId,
    triggerType: r.triggerType,
    branch: r.branch,
    commitSha: r.commitSha,
    commitMessage: r.commitMessage,
    stages: r.stages,
    status: r.status,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
  };
}

// GET /api/pipelines
router.get("/pipelines", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { status, limit } = req.query;

  const runs = await db
    .select()
    .from(pipelineRunsTable)
    .where(eq(pipelineRunsTable.tenantId, tenantId))
    .orderBy(sql`${pipelineRunsTable.createdAt} DESC`);

  let filtered = runs;
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (limit) filtered = filtered.slice(0, parseInt(limit as string));

  res.json(filtered.map(formatRun));
});

// GET /api/pipelines/:runId
router.get("/pipelines/:runId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { runId } = req.params;

  const runs = await db
    .select()
    .from(pipelineRunsTable)
    .where(and(eq(pipelineRunsTable.id, runId), eq(pipelineRunsTable.tenantId, tenantId)))
    .limit(1);

  if (!runs.length) {
    res.status(404).json({ error: "Pipeline run not found" });
    return;
  }

  res.json(formatRun(runs[0]));
});

// POST /api/pipelines/:runId/approve
router.post("/pipelines/:runId/approve", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { runId } = req.params;
  const { stage, decision } = req.body;

  const runs = await db
    .select()
    .from(pipelineRunsTable)
    .where(and(eq(pipelineRunsTable.id, runId), eq(pipelineRunsTable.tenantId, tenantId)))
    .limit(1);

  if (!runs.length) {
    res.status(404).json({ error: "Pipeline run not found" });
    return;
  }

  const run = runs[0];
  const stages = (run.stages as any) ?? {};
  stages[stage] = { decision, approvedAt: new Date().toISOString() };

  const newStatus = decision === "approved" ? "running" : "cancelled";

  const [updated] = await db
    .update(pipelineRunsTable)
    .set({ stages, status: newStatus })
    .where(eq(pipelineRunsTable.id, runId))
    .returning();

  res.json(formatRun(updated));
});

export default router;
