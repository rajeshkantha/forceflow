import { Router } from "express";
import { db, agentAnalysesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTenant, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function formatAnalysis(a: typeof agentAnalysesTable.$inferSelect) {
  return {
    id: a.id,
    tenantId: a.tenantId,
    threadId: a.threadId,
    orgId: a.orgId,
    requirementSummary: a.requirementSummary,
    currentStateAnalysis: a.currentStateAnalysis,
    gapAnalysis: a.gapAnalysis,
    implementationPlan: a.implementationPlan,
    status: a.status,
    createdBy: a.createdBy,
    approvedBy: a.approvedBy,
    approvedAt: a.approvedAt,
    executionLog: a.executionLog,
    createdAt: a.createdAt,
  };
}

// GET /api/analyses
router.get("/analyses", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { orgId, status } = req.query;

  let query = db.select().from(agentAnalysesTable).where(eq(agentAnalysesTable.tenantId, tenantId));

  const analyses = await db
    .select()
    .from(agentAnalysesTable)
    .where(eq(agentAnalysesTable.tenantId, tenantId));

  const filtered = analyses.filter((a) => {
    if (orgId && a.orgId !== orgId) return false;
    if (status && a.status !== status) return false;
    return true;
  });

  res.json(filtered.map(formatAnalysis));
});

// GET /api/analyses/:analysisId
router.get("/analyses/:analysisId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { analysisId } = req.params;

  const analyses = await db
    .select()
    .from(agentAnalysesTable)
    .where(and(eq(agentAnalysesTable.id, analysisId), eq(agentAnalysesTable.tenantId, tenantId)))
    .limit(1);

  if (!analyses.length) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.json(formatAnalysis(analyses[0]));
});

// POST /api/analyses/:analysisId/approve
router.post("/analyses/:analysisId/approve", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { analysisId } = req.params;

  const [updated] = await db
    .update(agentAnalysesTable)
    .set({
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
    })
    .where(and(eq(agentAnalysesTable.id, analysisId), eq(agentAnalysesTable.tenantId, tenantId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.json(formatAnalysis(updated));
});

export default router;
