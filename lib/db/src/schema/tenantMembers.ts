import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantMembersTable = pgTable("tenant_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: text("user_id").notNull(), // Clerk user ID
  email: text("email"),
  name: text("name"),
  role: text("role").notNull(), // frontier | developer | sales | support | sme
  invitedBy: text("invited_by"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTenantMemberSchema = createInsertSchema(tenantMembersTable).omit({ id: true, joinedAt: true });
export type InsertTenantMember = z.infer<typeof insertTenantMemberSchema>;
export type TenantMember = typeof tenantMembersTable.$inferSelect;
