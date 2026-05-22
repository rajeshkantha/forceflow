import { Router } from "express";
import { db, salesforceOrgsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireTenant, requireFrontier, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function encrypt(text: string): string {
  return Buffer.from(text).toString("base64");
}

function decrypt(text: string | null): string | null {
  return text ? Buffer.from(text, "base64").toString("utf8") : null;
}

function salesforceAuthorizeUrl(loginUrl: string, clientId: string, redirectUri: string) {
  return `${loginUrl}/services/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function salesforceTokenUrl(loginUrl: string) {
  return `${loginUrl}/services/oauth2/token`;
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

function redirectUri() {
  return process.env.SALESFORCE_REDIRECT_URI ?? `${process.env.PUBLIC_APP_URL ?? "http://localhost"}/api/orgs/callback`;
}

router.get("/orgs", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const orgs = await db.select().from(salesforceOrgsTable).where(eq(salesforceOrgsTable.tenantId, tenantId));
  res.json(orgs.map(formatOrg));
});

router.post("/orgs", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { label, orgType, loginUrl, clientId, clientSecret } = req.body;

  if (!label || !orgType || !loginUrl || !clientId || !clientSecret) {
    res.status(400).json({ error: "label, orgType, loginUrl, clientId, clientSecret required" });
    return;
  }

  const [org] = await db
    .insert(salesforceOrgsTable)
    .values({
      tenantId,
      label,
      orgType,
      loginUrl,
      clientId,
      clientSecretEnc: encrypt(clientSecret),
      status: "disconnected",
    })
    .returning();

  const authUrl = salesforceAuthorizeUrl(loginUrl, clientId, redirectUri());
  res.status(201).json({ ...formatOrg(org), authUrl });
});

router.get("/orgs/:orgId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { orgId } = req.params;

  const orgs = await db.select().from(salesforceOrgsTable).where(eq(salesforceOrgsTable.tenantId, tenantId));
  const org = orgs.find((item) => item.id === orgId);
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  res.json(formatOrg(org));
});

router.delete("/orgs/:orgId", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { orgId } = req.params;

  const [deleted] = await db
    .delete(salesforceOrgsTable)
    .where(eq(salesforceOrgsTable.id, orgId))
    .returning({ id: salesforceOrgsTable.id });

  if (!deleted || deleted.id === "") {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  const remaining = await db.select().from(salesforceOrgsTable).where(eq(salesforceOrgsTable.tenantId, tenantId));
  if (!remaining.length) {
    res.status(204).send();
    return;
  }

  res.status(204).send();
});

router.post("/orgs/:orgId/reconnect", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { orgId } = req.params;

  const orgs = await db.select().from(salesforceOrgsTable).where(eq(salesforceOrgsTable.tenantId, tenantId));
  const org = orgs.find((item) => item.id === orgId);
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  const authUrl = salesforceAuthorizeUrl(org.loginUrl ?? "https://login.salesforce.com", org.clientId ?? "", redirectUri());
  res.json({ authUrl });
});

router.get("/orgs/callback", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !state) {
    res.status(400).json({ error: "Missing code or state" });
    return;
  }

  const decodedState = Buffer.from(state, "base64").toString("utf8");
  const [orgId, loginUrl, clientId] = decodedState.split(":");

  const orgs = await db.select().from(salesforceOrgsTable).where(eq(salesforceOrgsTable.tenantId, tenantId));
  const org = orgs.find((item) => item.id === orgId);
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  const tokenRes = await fetch(salesforceTokenUrl(loginUrl), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: decrypt(org.clientSecretEnc) ?? "",
      redirect_uri: redirectUri(),
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    res.status(502).json({ error: "Salesforce token exchange failed", details: text });
    return;
  }

  const token = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    instance_url?: string;
  };

  await db
    .update(salesforceOrgsTable)
    .set({
      status: "connected",
      accessTokenEnc: encrypt(token.access_token),
      refreshTokenEnc: token.refresh_token ? encrypt(token.refresh_token) : org.refreshTokenEnc,
      instanceUrl: token.instance_url ?? org.instanceUrl,
      lastSync: new Date(),
    })
    .where(eq(salesforceOrgsTable.id, orgId));

  res.json({ success: true, orgId });
});

export default router;
