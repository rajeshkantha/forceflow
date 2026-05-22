import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salesforceOrgsTable = pgTable("salesforce_orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  label: text("label").notNull(),
  instanceUrl: text("instance_url"),
  loginUrl: text("login_url"),
  orgType: text("org_type").notNull(), // production | sandbox | developer | scratch
  username: text("username"),
  clientId: text("client_id"),
  clientSecretEnc: text("client_secret_enc"),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastSync: timestamp("last_sync", { withTimezone: true }),
  status: text("status").notNull().default("disconnected"), // connected | disconnected | error
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSalesforceOrgSchema = createInsertSchema(salesforceOrgsTable).omit({ id: true, createdAt: true });
export type InsertSalesforceOrg = z.infer<typeof insertSalesforceOrgSchema>;
export type SalesforceOrg = typeof salesforceOrgsTable.$inferSelect;
