import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, tenantMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  userId: string;
  tenantId?: string;
  tenantRole?: string;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as AuthRequest).userId = userId;

  // Attach tenant context if the user is a member
  const member = await db
    .select()
    .from(tenantMembersTable)
    .where(eq(tenantMembersTable.userId, userId))
    .limit(1);

  if (member.length > 0) {
    (req as AuthRequest).tenantId = member[0].tenantId;
    (req as AuthRequest).tenantRole = member[0].role;
  }

  next();
};

export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as AuthRequest).tenantId) {
    res.status(403).json({ error: "No tenant context. Please complete onboarding." });
    return;
  }
  next();
};

export const requireFrontier = (req: Request, res: Response, next: NextFunction) => {
  if ((req as AuthRequest).tenantRole !== "frontier") {
    res.status(403).json({ error: "Frontier role required." });
    return;
  }
  next();
};
