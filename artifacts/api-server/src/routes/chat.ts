import { Router } from "express";
import { db, chatThreadsTable, chatMessagesTable, toolApprovalsTable, modelConfigsTable, salesforceOrgsTable, tenantsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireTenant, type AuthRequest } from "../middlewares/requireAuth";
import { streamText, generateText, type CoreMessage } from "ai";
import { resolveModel } from "../lib/ai-provider";
import { buildSalesforceTools } from "../lib/salesforce-tools";
import { AGENT_ROLES, type AgentRole } from "../lib/agent-roles";

const router = Router();

function decrypt(enc: string | null): string {
  return enc ? Buffer.from(enc, "base64").toString("utf8") : "";
}

function formatThread(t: typeof chatThreadsTable.$inferSelect, messageCount = 0) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    userId: t.userId,
    title: t.title,
    role: t.role,
    orgId: t.orgId,
    modelId: t.modelId,
    messageCount,
    createdAt: t.createdAt,
  };
}

// GET /api/chat
router.get("/chat", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;

  const threads = await db
    .select()
    .from(chatThreadsTable)
    .where(and(eq(chatThreadsTable.tenantId, tenantId), eq(chatThreadsTable.userId, userId)))
    .orderBy(sql`${chatThreadsTable.createdAt} DESC`);

  res.json(threads.map((t) => formatThread(t)));
});

// POST /api/chat — create thread
router.post("/chat", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { role, orgId, modelId, title } = req.body;

  if (!role) { res.status(400).json({ error: "role required" }); return; }
  const validRoles = ["frontier", "developer", "sales", "support", "sme"];
  if (!validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

  const [thread] = await db
    .insert(chatThreadsTable)
    .values({ tenantId, userId, role, orgId: orgId ?? null, modelId: modelId ?? null, title: title ?? null })
    .returning();

  res.status(201).json(formatThread(thread));
});

// GET /api/chat/:threadId
router.get("/chat/:threadId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { threadId } = req.params;

  const threads = await db
    .select()
    .from(chatThreadsTable)
    .where(and(eq(chatThreadsTable.id, threadId), eq(chatThreadsTable.tenantId, tenantId), eq(chatThreadsTable.userId, userId)))
    .limit(1);

  if (!threads.length) { res.status(404).json({ error: "Thread not found" }); return; }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.threadId, threadId))
    .orderBy(sql`${chatMessagesTable.createdAt} ASC`);

  res.json({
    thread: formatThread(threads[0], messages.length),
    messages: messages.map((m) => ({
      id: m.id, threadId: m.threadId, role: m.role,
      content: m.content, parts: m.parts, toolCallId: m.toolCallId, createdAt: m.createdAt,
    })),
  });
});

// DELETE /api/chat/:threadId
router.delete("/chat/:threadId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { threadId } = req.params;

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.threadId, threadId));
  await db.delete(chatThreadsTable).where(and(
    eq(chatThreadsTable.id, threadId),
    eq(chatThreadsTable.tenantId, tenantId),
    eq(chatThreadsTable.userId, userId),
  ));

  res.status(204).send();
});

// POST /api/chat/:threadId/messages — REAL AI STREAMING
router.post("/chat/:threadId/messages", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { threadId } = req.params;
  const { content } = req.body;

  if (!content) { res.status(400).json({ error: "content required" }); return; }

  // Verify thread ownership
  const threads = await db
    .select()
    .from(chatThreadsTable)
    .where(and(eq(chatThreadsTable.id, threadId), eq(chatThreadsTable.tenantId, tenantId), eq(chatThreadsTable.userId, userId)))
    .limit(1);

  if (!threads.length) { res.status(404).json({ error: "Thread not found" }); return; }
  const thread = threads[0];

  // Store user message
  await db.insert(chatMessagesTable).values({ threadId, role: "user", content });

  // Auto-generate title from first message
  if (!thread.title) {
    const title = content.length > 60 ? content.slice(0, 60) + "..." : content;
    await db.update(chatThreadsTable).set({ title }).where(eq(chatThreadsTable.id, threadId));
  }

  // Load conversation history
  const history = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.threadId, threadId))
    .orderBy(sql`${chatMessagesTable.createdAt} ASC`);

  // Build CoreMessage array for AI
  const coreMessages: CoreMessage[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content || "",
  }));

  // Load model config
  let modelConfig = null;
  if (thread.modelId) {
    const models = await db.select().from(modelConfigsTable)
      .where(and(eq(modelConfigsTable.id, thread.modelId), eq(modelConfigsTable.tenantId, tenantId))).limit(1);
    modelConfig = models[0] ?? null;
  }
  if (!modelConfig) {
    const defaultModels = await db.select().from(modelConfigsTable)
      .where(and(eq(modelConfigsTable.tenantId, tenantId), eq(modelConfigsTable.isDefault, true))).limit(1);
    modelConfig = defaultModels[0] ?? null;
  }

  if (!modelConfig) {
    // No model configured — store a helpful message
    const noModelMsg = "No AI model is configured for this workspace. Please go to **Models** in the sidebar and add an API key to get started.";
    await db.insert(chatMessagesTable).values({ threadId, role: "assistant", content: noModelMsg });
    res.json({ id: "", threadId, role: "assistant", content: noModelMsg, parts: null, toolCallId: null, createdAt: new Date() });
    return;
  }

  // Load Salesforce org context
  let sfClient = null;
  const orgId = thread.orgId;
  if (orgId) {
    const orgs = await db.select().from(salesforceOrgsTable)
      .where(and(eq(salesforceOrgsTable.id, orgId), eq(salesforceOrgsTable.tenantId, tenantId))).limit(1);
    const org = orgs[0];
    if (org?.status === "connected" && org.accessTokenEnc && org.instanceUrl) {
      sfClient = { instanceUrl: org.instanceUrl, accessToken: decrypt(org.accessTokenEnc) };
    }
  }

  // Load tenant context for system prompt
  const tenants = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
  const tenant = tenants[0];

  // Get role definition
  const roleKey = thread.role as AgentRole;
  const roleDef = AGENT_ROLES[roleKey] ?? AGENT_ROLES.developer;
  const systemPrompt = roleDef.systemPrompt(
    tenant?.name ?? "your company",
    tenant?.industry ?? null,
    tenant?.orgDescription ?? null,
  );

  // Build tools (only those allowed for this role)
  const allTools = buildSalesforceTools(sfClient);
  const roleTools: Record<string, any> = {};
  for (const toolId of roleDef.toolIds) {
    if ((allTools as any)[toolId]) {
      roleTools[toolId] = (allTools as any)[toolId];
    }
  }

  // Stream response
  try {
    const model = resolveModel(modelConfig as any);

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const result = streamText({
      model,
      system: systemPrompt,
      messages: coreMessages,
      tools: Object.keys(roleTools).length > 0 ? roleTools : undefined,
      maxSteps: 10,
      temperature: 0.3,
    });

    let fullText = "";

    for await (const chunk of result.textStream) {
      fullText += chunk;
      res.write(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`);
    }

    // Store final message
    const [savedMsg] = await db.insert(chatMessagesTable).values({
      threadId,
      role: "assistant",
      content: fullText,
    }).returning();

    res.write(`data: ${JSON.stringify({ type: "done", messageId: savedMsg.id })}\n\n`);
    res.end();
  } catch (err: any) {
    const errMsg = `AI error: ${err?.message ?? "Unknown error"}. Please check your model configuration in Settings.`;
    await db.insert(chatMessagesTable).values({ threadId, role: "assistant", content: errMsg });
    if (!res.headersSent) {
      res.status(500).json({ error: errMsg });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", content: errMsg })}\n\n`);
      res.end();
    }
  }
});

// PATCH /api/chat/:threadId/title
router.patch("/chat/:threadId/title", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { threadId } = req.params;
  const { title } = req.body;

  const [updated] = await db
    .update(chatThreadsTable).set({ title })
    .where(and(eq(chatThreadsTable.id, threadId), eq(chatThreadsTable.tenantId, tenantId), eq(chatThreadsTable.userId, userId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Thread not found" }); return; }
  res.json(formatThread(updated));
});

// POST /api/chat/:threadId/approvals/:approvalId
router.post("/chat/:threadId/approvals/:approvalId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { approvalId } = req.params;
  const { decision } = req.body;

  if (!["approved", "rejected"].includes(decision)) {
    res.status(400).json({ error: "decision must be approved or rejected" }); return;
  }

  const [updated] = await db
    .update(toolApprovalsTable)
    .set({ status: decision, approvedBy: userId, approvedAt: new Date() })
    .where(and(eq(toolApprovalsTable.id, approvalId), eq(toolApprovalsTable.tenantId, tenantId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Approval not found" }); return; }

  res.json({
    id: updated.id, tenantId: updated.tenantId, threadId: updated.threadId,
    messageId: updated.messageId, toolName: updated.toolName, args: updated.args,
    status: updated.status, approvedBy: updated.approvedBy, approvedAt: updated.approvedAt, createdAt: updated.createdAt,
  });
});

export default router;
