import { Router } from "express";
import { db, chatThreadsTable, chatMessagesTable, toolApprovalsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireTenant, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

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

// POST /api/chat
router.post("/chat", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { role, orgId, modelId, title } = req.body;

  if (!role) {
    res.status(400).json({ error: "role required" });
    return;
  }

  const validRoles = ["frontier", "developer", "sales", "support", "sme"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [thread] = await db
    .insert(chatThreadsTable)
    .values({
      tenantId,
      userId,
      role,
      orgId: orgId ?? null,
      modelId: modelId ?? null,
      title: title ?? null,
    })
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
    .where(and(
      eq(chatThreadsTable.id, threadId),
      eq(chatThreadsTable.tenantId, tenantId),
      eq(chatThreadsTable.userId, userId),
    ))
    .limit(1);

  if (!threads.length) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.threadId, threadId))
    .orderBy(sql`${chatMessagesTable.createdAt} ASC`);

  res.json({
    thread: formatThread(threads[0], messages.length),
    messages: messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      role: m.role,
      content: m.content,
      parts: m.parts,
      toolCallId: m.toolCallId,
      createdAt: m.createdAt,
    })),
  });
});

// DELETE /api/chat/:threadId
router.delete("/chat/:threadId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { threadId } = req.params;

  await db
    .delete(chatMessagesTable)
    .where(eq(chatMessagesTable.threadId, threadId));

  await db
    .delete(chatThreadsTable)
    .where(and(
      eq(chatThreadsTable.id, threadId),
      eq(chatThreadsTable.tenantId, tenantId),
      eq(chatThreadsTable.userId, userId),
    ));

  res.status(204).send();
});

// POST /api/chat/:threadId/messages
router.post("/chat/:threadId/messages", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { threadId } = req.params;
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: "content required" });
    return;
  }

  // Verify thread ownership
  const threads = await db
    .select()
    .from(chatThreadsTable)
    .where(and(eq(chatThreadsTable.id, threadId), eq(chatThreadsTable.tenantId, tenantId)))
    .limit(1);

  if (!threads.length) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  // Store user message
  await db.insert(chatMessagesTable).values({
    threadId,
    role: "user",
    content,
  });

  // Auto-generate title from first message
  const thread = threads[0];
  if (!thread.title) {
    const title = content.length > 60 ? content.slice(0, 60) + "..." : content;
    await db.update(chatThreadsTable).set({ title }).where(eq(chatThreadsTable.id, threadId));
  }

  // Store simulated AI response (in a real app, call the AI provider)
  const aiResponse = generateAgentResponse(thread.role, content);
  const [aiMsg] = await db
    .insert(chatMessagesTable)
    .values({
      threadId,
      role: "assistant",
      content: aiResponse,
    })
    .returning();

  res.json({
    id: aiMsg.id,
    threadId: aiMsg.threadId,
    role: aiMsg.role,
    content: aiMsg.content,
    parts: aiMsg.parts,
    toolCallId: aiMsg.toolCallId,
    createdAt: aiMsg.createdAt,
  });
});

// PATCH /api/chat/:threadId/title
router.patch("/chat/:threadId/title", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { threadId } = req.params;
  const { title } = req.body;

  const [updated] = await db
    .update(chatThreadsTable)
    .set({ title })
    .where(and(
      eq(chatThreadsTable.id, threadId),
      eq(chatThreadsTable.tenantId, tenantId),
      eq(chatThreadsTable.userId, userId),
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  res.json(formatThread(updated));
});

// POST /api/chat/:threadId/approvals/:approvalId
router.post("/chat/:threadId/approvals/:approvalId", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { threadId, approvalId } = req.params;
  const { decision } = req.body;

  if (!["approved", "rejected"].includes(decision)) {
    res.status(400).json({ error: "decision must be approved or rejected" });
    return;
  }

  const [updated] = await db
    .update(toolApprovalsTable)
    .set({
      status: decision,
      approvedBy: userId,
      approvedAt: new Date(),
    })
    .where(and(eq(toolApprovalsTable.id, approvalId), eq(toolApprovalsTable.tenantId, tenantId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }

  res.json({
    id: updated.id,
    tenantId: updated.tenantId,
    threadId: updated.threadId,
    messageId: updated.messageId,
    toolName: updated.toolName,
    args: updated.args,
    status: updated.status,
    approvedBy: updated.approvedBy,
    approvedAt: updated.approvedAt,
    createdAt: updated.createdAt,
  });
});

function generateAgentResponse(role: string, content: string): string {
  const roleResponses: Record<string, string> = {
    frontier: "As your Frontier Agent, I've analyzed this request. Let me inspect the current org state before proceeding. I'll generate a detailed plan that requires your approval before any changes are made.",
    developer: "I'll examine the metadata configuration for this. Let me query the org schema and generate an implementation plan for your review.",
    sales: "I've pulled the relevant pipeline data. Let me check the opportunity records and draft the next steps for your approval.",
    support: "I'll search our knowledge base and case history for relevant context. Here's what I found and my recommended approach.",
    sme: "Let me perform a deep analysis of this component. I'll inspect the metadata, dependencies, and validation rules to give you a comprehensive explanation.",
  };
  return roleResponses[role] ?? "I'm analyzing your request. I'll present a plan for your review before taking any action.";
}

export default router;
