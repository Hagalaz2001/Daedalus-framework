import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "../../shared/db/auth-schema.ts";
import { createdAt, id, updatedAt } from "../../shared/db/columns.ts";

/**
 * One row per organization: its Stripe customer and subscription. Stripe is the source of truth; webhooks keep
 * this copy current. Money amounts are not stored here (read invoices from Stripe); if you add some, use integer
 * minor units plus a currency code.
 */
export const billing = pgTable(
  "billing",
  {
    id: id(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status").notNull().default("none"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (
    t,
  ) => [
    uniqueIndex("billing_org_idx").on(t.organizationId),
    uniqueIndex("billing_customer_idx").on(t.stripeCustomerId),
  ],
);
