import { Router } from "express";
import { db, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireTenant, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

// GET /api/tenant
router.get("/tenant", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;

  const tenants = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
  if (!tenants.length) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  const t = tenants[0];
  res.json({
    id: t.id,
    name: t.name,
    slug: t.slug,
    website: t.website,
    industry: t.industry,
    companySize: t.companySize,
    sfClouds: t.sfClouds ?? [],
    orgDescription: t.orgDescription,
    createdAt: t.createdAt,
  });
});

// PATCH /api/tenant
router.patch("/tenant", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { name, website, industry, companySize, sfClouds, orgDescription } = req.body;

  const [updated] = await db
    .update(tenantsTable)
    .set({
      ...(name !== undefined && { name }),
      ...(website !== undefined && { website }),
      ...(industry !== undefined && { industry }),
      ...(companySize !== undefined && { companySize }),
      ...(sfClouds !== undefined && { sfClouds }),
      ...(orgDescription !== undefined && { orgDescription }),
    })
    .where(eq(tenantsTable.id, tenantId))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    website: updated.website,
    industry: updated.industry,
    companySize: updated.companySize,
    sfClouds: updated.sfClouds ?? [],
    orgDescription: updated.orgDescription,
    createdAt: updated.createdAt,
  });
});

export default router;
