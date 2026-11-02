# Subscription plans and billing

## Plan catalog

`shared/subscription-plans.json` is the single source of truth consumed by the browser and API. Prices are monthly USD amounts; student limits and feature availability are read from this catalog. `enabled` is the per-plan feature flag, and `subscriptionStepEnabled` / `subscriptionStepRoles` control onboarding visibility. The default role list includes prospective students, scholars, and faculty.

```json
{
  "id": "plus",
  "name": "Pro",
  "price": 12.99,
  "currency": "usd",
  "interval": "month",
  "enabled": true,
  "recommended": true,
  "limits": { "maxStudentsPerClass": 100 },
  "features": { "customization": true, "newsBoard": true }
}
```

Free is the absence of a paid plan (`plan: "free"`); it is deliberately not a purchasable catalog entry.

The display-name migration preserves persisted IDs: `starter` remains Starter, `plus` is displayed as Pro, and `pro` is displayed as Premium. No user or subscription rows need rewriting; the JSON catalog is the current display-name source. Analytics records store both the stable `planId` and current `planName`. Existing historical Stripe invoices are not rewritten.

## API contract

All paths are same-origin `/api` endpoints. Except for the plan catalog and Stripe webhook, requests require the existing authenticated session cookie. JSON mutations use the existing same-origin cookie policy.

| Method and path | Request | Response / behavior |
|---|---|---|
| `GET /api/plans` (`GET /api/subscriptions/plans` alias) | — | Enabled catalog and onboarding role flags |
| `POST /api/subscriptions/checkout-payment-intent` | `{ "planId": "plus", "idempotencyKey": "<UUID>", "cardholderName": "...", "country": "US", "postalCode": "..." }` | Creates or updates a subscription server-side and returns a Stripe Payment Element client secret, due amount, tax and any proration credit; lower-tier changes return a scheduled effective date. Authenticated, plan-allowlisted and rate-limited. |
| `POST /api/subscriptions/checkout-session` | `{ "planId": "plus", "onboarding": true, "idempotencyKey": "<UUID>" }` | Legacy Stripe-hosted checkout compatibility endpoint |
| `POST /api/subscriptions/skip` | `{}` | Sets `plan` and `planStatus` to `free`, records onboarding completion and returns the public user |
| `GET /api/subscriptions/me` | — | Current plan/status, period end, cancellation state, last four digits, and up to 10 invoices |
| `POST /api/subscriptions/cancel` | `{}` | Sets cancellation at period end through Stripe |
| `POST /api/subscriptions/resume` | `{}` | Removes period-end cancellation through Stripe |
| `PATCH /api/subscriptions/change-plan` | `{ "planId": "starter" }` | Higher plans are updated immediately with prorations; lower plans are scheduled for the period end |
| `POST /api/subscriptions/portal` | `{}` | `{ "url": "<Stripe Billing Portal URL>" }` for payment-method and invoice management |
| `POST /api/subscriptions/events` | `{ "eventName": "plan_selected", "planId": "plus" }` | Accepts allowlisted subscription and checkout analytics events; stores stable ID and current display name |
| `POST /api/webhooks/payments` | Raw Stripe event body | Verifies the Stripe signature; webhook events are the source of truth for paid plan state |

The webhook handles `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Duplicate event IDs are ignored. New card checkout uses Stripe Payment Element; card number, expiry, and CVC never pass through or persist on the Academix API. The webhook remains authoritative for paid plan activation. Failed renewals retain paid access for seven days; after that, the next subscription read downgrades access to Free. Scheduled downgrades do not remove content or members.

## Persisted data

This repository currently uses its existing single-process JSON store, not a SQL database. The API writes these fields without storing card numbers or CVCs:

```text
users.json:
  plan: free | starter | plus | pro
  planStatus: free | incomplete | active | trialing | past_due | canceled
  onboardingStep: integer (1-4)
  subscriptionStepCompletedAt?: ISO timestamp
  subscriptionSkippedAt?: ISO timestamp

subscriptions.json:
  userId, planId, customerId, subscriptionId, status, everActivated,
  currentPeriodEnd, cancelAtPeriodEnd, trialEnd, gracePeriodEnd,
  pendingPlanId?, pendingPlanChange?, paymentMethodBrand?, paymentMethodLast4?, createdAt

payment-events.json:
  id, type, receivedAt

subscription-analytics.json:
  userId, eventName, planId?, planName?, createdAt
```

`plus` and `pro` are deliberately retained as IDs for existing users and subscriptions even though their display names are now Pro and Premium. This repository has no relational database or separate seed file; `shared/subscription-plans.json` is the plan catalog.

For a relational deployment, the corresponding minimal tables can be created as follows; the shared JSON catalog remains the only plan configuration:

```sql
CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  plan_id TEXT NOT NULL,
  customer_id TEXT,
  subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  ever_activated BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  grace_period_end TIMESTAMPTZ,
  pending_plan_id TEXT,
  pending_plan_change TEXT,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The JSON implementation is for the current single-process app. Multi-instance production deployments need a transactional shared database, shared rate limiting, and persistent session storage before scaling.

## Stripe setup

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_APP_URL`, and frontend-only `VITE_STRIPE_PUBLISHABLE_KEY`. Configure Stripe Billing Portal, Stripe Tax registrations, and webhook delivery for `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Checkout enables automatic tax calculation. Enable Stripe receipt emails in Stripe settings. Never put secret keys in Vite environment variables or the browser bundle. Set `VITE_AUTH_BYPASS=false` and use Stripe test keys/cards against the API for payment testing; the frontend shows a Test mode banner in development or when `VITE_STRIPE_TEST_MODE=true`. Without Stripe keys, checkout fails explicitly rather than reporting a successful purchase.

Stripe test-card scenarios include `4242 4242 4242 4242` for a successful payment, `4000 0000 0000 9995` for a decline, and `4000 0025 0000 3155` to exercise authentication. Use future expiry, any three-digit CVC, and a valid test billing address. Never use real card data in development.

## Current integration boundaries

This codebase does not yet contain class membership/join APIs, a News Board, a custom email delivery provider, or published legal-policy pages. Checkout creates in-app system notifications categorized as `payment_successful` / `payment_failed`; Stripe must be configured to deliver receipts. The server exports `canJoinClass` and uses server-side `hasSubscriptionFeature` for profile-banner customization, but a class join handler must call `canJoinClass` with the authoritative class roster count before accepting a join. News Board routes must similarly call `hasSubscriptionFeature(user, "newsBoard")`. Legal links in checkout (`/terms`, `/privacy`, `/cancellation-policy`) need approved policy pages before launch. Configure and exercise Stripe Tax, webhook retries, SCA, and test-card scenarios before production.
