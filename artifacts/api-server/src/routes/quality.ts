import { Router } from "express";
import { db, qualityReportsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTenant, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

// GET /api/quality/:reportId
router.get("/quality/:reportId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { reportId } = req.params;

  const reports = await db
    .select()
    .from(qualityReportsTable)
    .where(and(eq(qualityReportsTable.id, reportId), eq(qualityReportsTable.tenantId, tenantId)))
    .limit(1);

  if (!reports.length) {
    res.status(404).json({ error: "Quality report not found" });
    return;
  }

  const r = reports[0];
  res.json({
    id: r.id,
    tenantId: r.tenantId,
    pipelineRunId: r.pipelineRunId,
    violations: r.violations,
    coveragePct: parseFloat(r.coveragePct ?? "0"),
    scoreLetter: r.scoreLetter,
    createdAt: r.createdAt,
  });
});

export default router;
