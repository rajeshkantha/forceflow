import { Router } from "express";
import { db, salesforceOrgsTable, tenantMembersTable, modelConfigsTable, chatThreadsTable, pipelineRunsTable, agentAnalysesTable, auditLogTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { requireAuth, requireTenant, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

// GET /api/dashboard/summary
router.get("/dashboard/summary", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;

  const [orgs, members, models, threads, pipelines] = await Promise.all([
    db.select().from(salesforceOrgsTable).where(eq(salesforceOrgsTable.tenantId, tenantId)),
    db.select().from(tenantMembersTable).where(eq(tenantMembersTable.tenantId, tenantId)),
    db.select().from(modelConfigsTable).where(and(eq(modelConfigsTable.tenantId, tenantId), eq(modelConfigsTable.isDefault, true))).limit(1),
    db.select().from(chatThreadsTable).where(eq(chatThreadsTable.tenantId, tenantId)).orderBy(sql`${chatThreadsTable.createdAt} DESC`).limit(5),
    db.select().from(pipelineRunsTable).where(eq(pipelineRunsTable.tenantId, tenantId)),
  ]);

  const connectedOrgs = orgs.filter((o) => o.status === "connected");
  const passedPipelines = pipelines.filter((p) => p.status === "passed");
  const passRate = pipelines.length > 0 ? passedPipelines.length / pipelines.length : 0;

  res.json({
    orgsCount: orgs.length,
    connectedOrgsCount: connectedOrgs.length,
    teamCount: members.length,
    activeModelProvider: models[0]?.provider ?? null,
    activeModelName: models[0]?.modelName ?? null,
    recentThreadsCount: threads.length,
    pipelineRunsCount: pipelines.length,
    pipelinePassRate: Math.round(passRate * 100) / 100,
    recentThreads: threads.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      userId: t.userId,
      title: t.title,
      role: t.role,
      orgId: t.orgId,
      modelId: t.modelId,
      messageCount: 0,
      createdAt: t.createdAt,
    })),
    orgs: orgs.map((o) => ({
      id: o.id,
      tenantId: o.tenantId,
      label: o.label,
      instanceUrl: o.instanceUrl,
      loginUrl: o.loginUrl,
      orgType: o.orgType,
      username: o.username,
      status: o.status,
      lastSync: o.lastSync,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
    })),
  });
});

// GET /api/dashboard/activity
router.get("/dashboard/activity", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const limit = parseInt((req.query.limit as string) ?? "20");

  // Build activity from audit log + recent entities
  const [threads, orgs, members, pipelines] = await Promise.all([
    db.select().from(chatThreadsTable).where(eq(chatThreadsTable.tenantId, tenantId)).orderBy(sql`${chatThreadsTable.createdAt} DESC`).limit(5),
    db.select().from(salesforceOrgsTable).where(eq(salesforceOrgsTable.tenantId, tenantId)).orderBy(sql`${salesforceOrgsTable.createdAt} DESC`).limit(3),
    db.select().from(tenantMembersTable).where(eq(tenantMembersTable.tenantId, tenantId)).orderBy(sql`${tenantMembersTable.joinedAt} DESC`).limit(3),
    db.select().from(pipelineRunsTable).where(eq(pipelineRunsTable.tenantId, tenantId)).orderBy(sql`${pipelineRunsTable.createdAt} DESC`).limit(5),
  ]);

  const items: any[] = [
    ...threads.map((t) => ({
      id: `thread-${t.id}`,
      type: "thread_created",
      description: `New ${t.role} chat: ${t.title ?? "Untitled thread"}`,
      actor: null,
      entityId: t.id,
      createdAt: t.createdAt,
    })),
    ...orgs.map((o) => ({
      id: `org-${o.id}`,
      type: "org_connected",
      description: `Salesforce org connected: ${o.label}`,
      actor: null,
      entityId: o.id,
      createdAt: o.createdAt,
    })),
    ...members.map((m) => ({
      id: `member-${m.id}`,
      type: "member_invited",
      description: `Team member joined with ${m.role} role`,
      actor: m.invitedBy,
      entityId: m.id,
      createdAt: m.joinedAt,
    })),
    ...pipelines.map((p) => ({
      id: `pipeline-${p.id}`,
      type: "pipeline_run",
      description: `Pipeline ${p.status}: ${p.branch ?? "main"} (${p.commitSha?.slice(0, 7) ?? "—"})`,
      actor: null,
      entityId: p.id,
      createdAt: p.createdAt,
    })),
  ];

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(items.slice(0, limit));
});

// GET /api/dashboard/pipeline-stats
router.get("/dashboard/pipeline-stats", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;

  const pipelines = await db
    .select()
    .from(pipelineRunsTable)
    .where(eq(pipelineRunsTable.tenantId, tenantId));

  const stats = {
    total: pipelines.length,
    passed: pipelines.filter((p) => p.status === "passed").length,
    failed: pipelines.filter((p) => p.status === "failed").length,
    running: pipelines.filter((p) => p.status === "running").length,
    pending: pipelines.filter((p) => p.status === "pending").length,
    avgDurationMs: null as number | null,
    lastRunAt: pipelines[0]?.createdAt?.toISOString() ?? null,
  };

  // Compute average duration for completed runs
  const completed = pipelines.filter((p) => p.completedAt && p.createdAt);
  if (completed.length > 0) {
    const totalMs = completed.reduce((sum, p) => {
      return sum + (new Date(p.completedAt!).getTime() - new Date(p.createdAt).getTime());
    }, 0);
    stats.avgDurationMs = Math.round(totalMs / completed.length);
  }

  res.json(stats);
});

export default router;
