import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, tenantMembersTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const userId = (req as AuthRequest).userId;

  const member = await db
    .select()
    .from(tenantMembersTable)
    .where(eq(tenantMembersTable.userId, userId))
    .limit(1);

  let tenant = null;
  if (member.length > 0) {
    const tenants = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, member[0].tenantId))
      .limit(1);
    tenant = tenants[0] ?? null;
  }

  res.json({
    id: userId,
    email: auth?.sessionClaims?.email ?? null,
    name: auth?.sessionClaims?.fullName ?? null,
    tenantId: member[0]?.tenantId ?? null,
    role: member[0]?.role ?? null,
    onboardingComplete: member.length > 0,
    tenant: tenant ? {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      website: tenant.website,
      industry: tenant.industry,
      companySize: tenant.companySize,
      sfClouds: tenant.sfClouds ?? [],
      orgDescription: tenant.orgDescription,
      createdAt: tenant.createdAt,
    } : null,
  });
});

export default router;
