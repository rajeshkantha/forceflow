import { Router } from "express";
import { db, tenantMembersTable, tenantInvitesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTenant, requireFrontier, type AuthRequest } from "../middlewares/requireAuth";
import crypto from "crypto";

const router = Router();

// GET /api/team
router.get("/team", requireAuth, requireTenant, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;

  const members = await db
    .select()
    .from(tenantMembersTable)
    .where(eq(tenantMembersTable.tenantId, tenantId));

  res.json(members.map((m) => ({
    id: m.id,
    tenantId: m.tenantId,
    userId: m.userId,
    email: m.email,
    name: m.name,
    role: m.role,
    invitedBy: m.invitedBy,
    joinedAt: m.joinedAt,
  })));
});

// POST /api/team/invite
router.post("/team/invite", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const userId = (req as AuthRequest).userId;
  const { email, role } = req.body;

  if (!email || !role) {
    res.status(400).json({ error: "Email and role required" });
    return;
  }

  const validRoles = ["frontier", "developer", "sales", "support", "sme"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invite] = await db
    .insert(tenantInvitesTable)
    .values({
      tenantId,
      email,
      role,
      invitedBy: userId,
      token,
      expiresAt,
    })
    .returning();

  res.status(201).json({
    id: invite.id,
    tenantId: invite.tenantId,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    acceptedAt: invite.acceptedAt,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  });
});

// PATCH /api/team/:memberId
router.patch("/team/:memberId", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { memberId } = req.params;
  const { role } = req.body;

  const validRoles = ["frontier", "developer", "sales", "support", "sme"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [updated] = await db
    .update(tenantMembersTable)
    .set({ role })
    .where(and(eq(tenantMembersTable.id, memberId), eq(tenantMembersTable.tenantId, tenantId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json({
    id: updated.id,
    tenantId: updated.tenantId,
    userId: updated.userId,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    invitedBy: updated.invitedBy,
    joinedAt: updated.joinedAt,
  });
});

// DELETE /api/team/:memberId
router.delete("/team/:memberId", requireAuth, requireTenant, requireFrontier, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId!;
  const { memberId } = req.params;

  await db
    .delete(tenantMembersTable)
    .where(and(eq(tenantMembersTable.id, memberId), eq(tenantMembersTable.tenantId, tenantId)));

  res.status(204).send();
});

export default router;
