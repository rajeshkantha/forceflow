import { Router } from "express";
import { db, salesforceOrgsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTenant, requireFrontier, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function encrypt(text: string): string {
  return Buffer.from(text).toString("base64");
}

function formatOrg(o: typeof salesforceOrgsTable.$inferSelect) {
  return {
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
  };
}

// GET /api/orgs
router.get("/orgs", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const orgs = await db.select().from(salesforceOrgsTable).where(eq(salesforceOrgsTable.tenantId, tenantId));
  res.json(orgs.map(formatOrg));
});

// POST /api/orgs
router.post("/orgs", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { label, orgType, loginUrl, clientId, clientSecret } = req.body;

  if (!label || !orgType || !loginUrl) {
    res.status(400).json({ error: "label, orgType, loginUrl required" });
    return;
  }

  const [org] = await db
    .insert(salesforceOrgsTable)
    .values({
      tenantId,
      label,
      orgType,
      loginUrl,
      clientId: clientId ?? null,
      clientSecretEnc: clientSecret ? encrypt(clientSecret) : null,
      status: "disconnected",
    })
    .returning();

  res.status(201).json(formatOrg(org));
});

// GET /api/orgs/:orgId
router.get("/orgs/:orgId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { orgId } = req.params;

  const orgs = await db
    .select()
    .from(salesforceOrgsTable)
    .where(and(eq(salesforceOrgsTable.id, orgId), eq(salesforceOrgsTable.tenantId, tenantId)))
    .limit(1);

  if (!orgs.length) {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  res.json(formatOrg(orgs[0]));
});

// DELETE /api/orgs/:orgId
router.delete("/orgs/:orgId", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { orgId } = req.params;

  await db
    .delete(salesforceOrgsTable)
    .where(and(eq(salesforceOrgsTable.id, orgId), eq(salesforceOrgsTable.tenantId, tenantId)));

  res.status(204).send();
});

// POST /api/orgs/:orgId/reconnect
router.post("/orgs/:orgId/reconnect", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { orgId } = req.params;

  const orgs = await db
    .select()
    .from(salesforceOrgsTable)
    .where(and(eq(salesforceOrgsTable.id, orgId), eq(salesforceOrgsTable.tenantId, tenantId)))
    .limit(1);

  if (!orgs.length) {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  const org = orgs[0];
  // In a real app, generate a proper OAuth URL using PKCE
  const authUrl = `${org.loginUrl ?? "https://login.salesforce.com"}/services/oauth2/authorize?response_type=code&client_id=${org.clientId ?? ""}&redirect_uri=${encodeURIComponent(process.env.SF_REDIRECT_URI ?? "https://app.forceflow.io/api/orgs/callback")}`;

  res.json({ authUrl });
});

export default router;
