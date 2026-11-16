import { eq } from "drizzle-orm";
import { Hono } from "hono";
import Stripe from "stripe";
import { requireTenant } from "../../shared/auth/session.ts";
import type { Db } from "../../shared/db/client.ts";
import { AppError, badRequest } from "../../shared/errors/problem.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";
import { billing } from "./schema.ts";

const env = (name: string) => Deno.env.get(name);

function stripe() {
  const key = env("STRIPE_SECRET_KEY");
  if (!key) throw new AppError(503, "Service Unavailable", "Payments are not configured (STRIPE_SECRET_KEY)");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

async function setStatus(
  db: Db,
  where: { organizationId: string } | { customerId: string },
  values: Partial<typeof billing.$inferInsert>,
) {
  if ("organizationId" in where) {
    await db.insert(billing).values({ organizationId: where.organizationId, ...values })
      .onConflictDoUpdate({ target: billing.organizationId, set: values });
  } else {
    await db.update(billing).set(values).where(eq(billing.stripeCustomerId, where.customerId));
  }
}

/** Applies the Stripe events that change what an organization may do. Unknown events are acknowledged and ignored. */
export async function handleStripeEvent(db: Db, event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    if (s.client_reference_id) {
      await setStatus(db, { organizationId: s.client_reference_id }, {
        stripeCustomerId: s.customer as string | null,
        stripeSubscriptionId: s.subscription as string | null,
        status: "active",
      });
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await setStatus(db, { customerId: sub.customer as string }, {
      status: event.type.endsWith("deleted") ? "canceled" : sub.status,
    });
  }
}

export default {
  name: "payments",
  routes: ({ db, config }) =>
    new Hono<AppEnv>()
      .get("/billing", async (c) => {
        const { organizationId } = await requireTenant(c, db);
        const [row] = await db.select().from(billing).where(eq(billing.organizationId, organizationId));
        return c.json({ status: row?.status ?? "none" });
      })
      .post("/billing/checkout", async (c) => {
        const tenant = await requireTenant(c, db);
        const price = env("STRIPE_PRICE_ID");
        if (!price) throw new AppError(503, "Service Unavailable", "Payments are not configured (STRIPE_PRICE_ID)");
        const origin = env("APP_URL") ?? config.trustedOrigins[0];
        const session = await stripe().checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price, quantity: 1 }],
          client_reference_id: tenant.organizationId,
          customer_email: tenant.user.email,
          success_url: `${origin}/billing?checkout=success`,
          cancel_url: `${origin}/billing?checkout=cancelled`,
        });
        return c.json({ url: session.url ?? "" });
      })
      .post("/webhooks/stripe", async (c) => {
        const secret = env("STRIPE_WEBHOOK_SECRET");
        const signature = c.req.header("stripe-signature");
        if (!secret || !signature) throw badRequest("Missing webhook secret or signature");
        let event: Stripe.Event;
        try {
          // The signature covers the exact bytes Stripe sent, so verify the raw text, never re-serialized JSON.
          event = await stripe().webhooks.constructEventAsync(await c.req.text(), signature, secret);
        } catch (e) {
          if (e instanceof AppError) throw e;
          throw badRequest("Invalid webhook signature");
        }
        await handleStripeEvent(db, event);
        return c.json({ status: "ok" as const });
      }),
} satisfies Module;
