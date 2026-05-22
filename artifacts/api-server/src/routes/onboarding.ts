import { Router } from "express";
import { db, tenantsTable, tenantMembersTable, tenantInvitesTable, salesforceOrgsTable, modelConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import crypto from "crypto";

const router = Router();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function encrypt(text: string): string {
  // Simple base64 encoding for now; in production use AES-256-GCM with a proper key
  return Buffer.from(text).toString("base64");
}

// POST /api/onboarding/complete
router.post("/onboarding/complete", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const { company, org, model } = req.body;

  if (!company?.name) {
    res.status(400).json({ error: "Company name required" });
    return;
  }

  // Check if user already has a tenant
  const existing = await db
    .select()
    .from(tenantMembersTable)
    .where(eq(tenantMembersTable.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    res.status(400).json({ error: "User already belongs to a tenant" });
    return;
  }

  // Create tenant
  const [tenant] = await db
    .insert(tenantsTable)
    .values({
      name: company.name,
      slug: slugify(company.name),
      website: company.website ?? null,
      industry: company.industry ?? null,
      companySize: company.companySize ?? null,
      sfClouds: company.sfClouds ?? [],
      orgDescription: company.orgDescription ?? null,
    })
    .returning();

  // Create tenant member (Frontier role)
  await db.insert(tenantMembersTable).values({
    tenantId: tenant.id,
    userId,
    role: "frontier",
  });

  // Optionally add Salesforce org
  if (org?.label) {
    await db.insert(salesforceOrgsTable).values({
      tenantId: tenant.id,
      label: org.label,
      loginUrl: org.loginUrl ?? "https://login.salesforce.com",
      orgType: org.orgType ?? "production",
      clientId: org.clientId ?? null,
      clientSecretEnc: org.clientSecret ? encrypt(org.clientSecret) : null,
      status: "disconnected",
    });
  }

  // Optionally add model config
  if (model?.provider && model?.apiKey) {
    await db.insert(modelConfigsTable).values({
      tenantId: tenant.id,
      provider: model.provider,
      modelName: model.modelName ?? getDefaultModel(model.provider),
      apiKeyEnc: encrypt(model.apiKey),
      label: model.label ?? model.provider,
      isDefault: true,
    });
  }

  res.status(201).json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    website: tenant.website,
    industry: tenant.industry,
    companySize: tenant.companySize,
    sfClouds: tenant.sfClouds ?? [],
    orgDescription: tenant.orgDescription,
    createdAt: tenant.createdAt,
  });
});

// GET /api/onboarding/invite/validate
router.get("/onboarding/invite/validate", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    res.status(400).json({ error: "Token required" });
    return;
  }

  const invite = await db
    .select()
    .from(tenantInvitesTable)
    .where(eq(tenantInvitesTable.token, token as string))
    .limit(1);

  if (!invite.length) {
    res.json({ valid: false, email: "", role: "", tenantName: "", tenantId: "" });
    return;
  }

  const inv = invite[0];
  const tenant = await db.select().from(tenantsTable).where(eq(tenantsTable.id, inv.tenantId)).limit(1);

  const isExpired = inv.expiresAt < new Date();
  const isAccepted = !!inv.acceptedAt;

  res.json({
    valid: !isExpired && !isAccepted,
    email: inv.email,
    role: inv.role,
    tenantName: tenant[0]?.name ?? "",
    tenantId: inv.tenantId,
    expiresAt: inv.expiresAt,
  });
});

// POST /api/onboarding/invite/accept
router.post("/onboarding/invite/accept", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const { token, name } = req.body;

  if (!token) {
    res.status(400).json({ error: "Token required" });
    return;
  }

  const invite = await db
    .select()
    .from(tenantInvitesTable)
    .where(eq(tenantInvitesTable.token, token))
    .limit(1);

  if (!invite.length || invite[0].acceptedAt || invite[0].expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired invite" });
    return;
  }

  const inv = invite[0];

  // Mark invite as accepted
  await db
    .update(tenantInvitesTable)
    .set({ acceptedAt: new Date() })
    .where(eq(tenantInvitesTable.id, inv.id));

  // Create member
  const [member] = await db
    .insert(tenantMembersTable)
    .values({
      tenantId: inv.tenantId,
      userId,
      name: name ?? null,
      role: inv.role,
      invitedBy: inv.invitedBy ?? null,
    })
    .returning();

  res.json({
    id: member.id,
    tenantId: member.tenantId,
    userId: member.userId,
    email: null,
    name: member.name,
    role: member.role,
    invitedBy: member.invitedBy,
    joinedAt: member.joinedAt,
  });
});

function getDefaultModel(provider: string): string {
  switch (provider) {
    case "openai": return "gpt-4o";
    case "anthropic": return "claude-sonnet-4-5";
    case "openrouter": return "anthropic/claude-sonnet-4-5";
    default: return "gpt-4o";
  }
}

export default router;
