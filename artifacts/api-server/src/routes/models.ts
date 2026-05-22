import { Router } from "express";
import { db, modelConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTenant, requireFrontier, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function encrypt(text: string): string {
  return Buffer.from(text).toString("base64");
}

function formatModel(m: typeof modelConfigsTable.$inferSelect) {
  return {
    id: m.id,
    tenantId: m.tenantId,
    label: m.label,
    provider: m.provider,
    baseUrl: m.baseUrl,
    modelName: m.modelName,
    isDefault: m.isDefault,
    createdAt: m.createdAt,
  };
}

// GET /api/models
router.get("/models", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const models = await db.select().from(modelConfigsTable).where(eq(modelConfigsTable.tenantId, tenantId));
  res.json(models.map(formatModel));
});

// POST /api/models
router.post("/models", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { provider, modelName, apiKey, label, baseUrl, isDefault } = req.body;

  if (!provider || !modelName || !apiKey) {
    res.status(400).json({ error: "provider, modelName, apiKey required" });
    return;
  }

  // If setting as default, unset others
  if (isDefault) {
    await db
      .update(modelConfigsTable)
      .set({ isDefault: false })
      .where(eq(modelConfigsTable.tenantId, tenantId));
  }

  const [model] = await db
    .insert(modelConfigsTable)
    .values({
      tenantId,
      provider,
      modelName,
      apiKeyEnc: encrypt(apiKey),
      label: label ?? provider,
      baseUrl: baseUrl ?? null,
      isDefault: isDefault ?? false,
    })
    .returning();

  res.status(201).json(formatModel(model));
});

// PATCH /api/models/:modelId
router.patch("/models/:modelId", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { modelId } = req.params;
  const { label, modelName, apiKey, baseUrl, isDefault } = req.body;

  if (isDefault) {
    await db.update(modelConfigsTable).set({ isDefault: false }).where(eq(modelConfigsTable.tenantId, tenantId));
  }

  const [updated] = await db
    .update(modelConfigsTable)
    .set({
      ...(label !== undefined && { label }),
      ...(modelName !== undefined && { modelName }),
      ...(apiKey !== undefined && { apiKeyEnc: encrypt(apiKey) }),
      ...(baseUrl !== undefined && { baseUrl }),
      ...(isDefault !== undefined && { isDefault }),
    })
    .where(and(eq(modelConfigsTable.id, modelId), eq(modelConfigsTable.tenantId, tenantId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Model config not found" });
    return;
  }

  res.json(formatModel(updated));
});

// DELETE /api/models/:modelId
router.delete("/models/:modelId", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { modelId } = req.params;

  await db
    .delete(modelConfigsTable)
    .where(and(eq(modelConfigsTable.id, modelId), eq(modelConfigsTable.tenantId, tenantId)));

  res.status(204).send();
});

// POST /api/models/:modelId/test
router.post("/models/:modelId/test", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { modelId } = req.params;

  const models = await db
    .select()
    .from(modelConfigsTable)
    .where(and(eq(modelConfigsTable.id, modelId), eq(modelConfigsTable.tenantId, tenantId)))
    .limit(1);

  if (!models.length) {
    res.status(404).json({ error: "Model not found" });
    return;
  }

  const model = models[0];

  try {
    const start = Date.now();
    const baseUrl = model.baseUrl ?? getBaseUrl(model.provider);
    const apiKey = Buffer.from(model.apiKeyEnc ?? "", "base64").toString("utf8");

    const testRes = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const latencyMs = Date.now() - start;

    if (testRes.ok) {
      res.json({ success: true, message: "Model connection successful", latencyMs });
    } else {
      res.json({ success: false, message: `API returned ${testRes.status}`, latencyMs });
    }
  } catch (err) {
    res.json({ success: false, message: "Connection failed", latencyMs: null });
  }
});

// POST /api/models/:modelId/set-default
router.post("/models/:modelId/set-default", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { modelId } = req.params;

  await db.update(modelConfigsTable).set({ isDefault: false }).where(eq(modelConfigsTable.tenantId, tenantId));

  const [updated] = await db
    .update(modelConfigsTable)
    .set({ isDefault: true })
    .where(and(eq(modelConfigsTable.id, modelId), eq(modelConfigsTable.tenantId, tenantId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Model not found" });
    return;
  }

  res.json(formatModel(updated));
});

function getBaseUrl(provider: string): string {
  switch (provider) {
    case "openai": return "https://api.openai.com/v1";
    case "anthropic": return "https://api.anthropic.com/v1";
    case "openrouter": return "https://openrouter.ai/api/v1";
    default: return "https://api.openai.com/v1";
  }
}

export default router;
