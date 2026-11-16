# Payments module (Stripe)

Status: thin. Subscription Checkout and a verified webhook; no customer portal, invoices, taxes or usage billing yet.
Use **Stripe test mode** (`sk_test_...`) while building and review the flow with someone who knows your pricing and tax
duties before taking real money.

Flow:

1. `POST /billing/checkout` (signed-in organization member) creates a Checkout session for `STRIPE_PRICE_ID`; the
   organization id travels as `client_reference_id`. Redirect the user to the returned `url`.
2. Stripe calls `POST /webhooks/stripe`. The signature is verified on the raw body with `STRIPE_WEBHOOK_SECRET`; a bad
   or missing signature is a 400.
3. `checkout.session.completed` marks the organization `active`; `customer.subscription.updated` and `.deleted` keep the
   status (`past_due`, `canceled`...) in the `billing` table. `GET /billing` returns it for the UI.

Local test: `stripe listen --forward-to localhost:8787/webhooks/stripe` (Stripe CLI) prints the webhook secret to use.
Gate paid features on `status === "active"`, never on the redirect back from Checkout. Add the events you need to
`handleStripeEvent`; Stripe retries failed deliveries, so handlers must be safe to run twice (the existing ones are
upserts).
