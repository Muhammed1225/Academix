import plansConfig from '../shared/subscription-plans.json';
import type { AuthenticatedUser } from './store';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month';
  enabled: boolean;
  recommended: boolean;
  limits: { maxStudentsPerClass: number | null };
  features: { customization: boolean; newsBoard: boolean };
}

export const subscriptionConfig = plansConfig as {
  subscriptionStepEnabled: boolean;
  subscriptionStepRoles: AuthenticatedUser['role'][];
  plans: SubscriptionPlan[];
};

export interface SubscriptionDetails {
  planId: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  customerId?: string;
  subscriptionId?: string;
  trialEnd?: string;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  invoices: { id: string; date: string; amount: number; currency: string; status: string; url?: string }[];
}

const testAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== 'false';
const accountsKey = 'academix.test.accounts';
const sessionKey = 'academix.test.session';
const testSubscriptionKey = 'academix.test.subscription';
export type SubscriptionAnalyticsEvent =
  | 'subscription_screen_viewed'
  | 'plan_selected'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_failed'
  | 'subscription_skipped'
  | 'plan_upgraded'
  | 'plan_canceled'
  | 'limit_reached'
  | 'profile_subscription_button_clicked'
  | 'checkout_viewed'
  | 'payment_submitted'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'checkout_abandoned';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/subscriptions${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'Unable to complete your subscription request.');
  return result;
}

function updateTestUser(update: (user: AuthenticatedUser) => AuthenticatedUser) {
  const email = localStorage.getItem(sessionKey);
  if (!email) throw new Error('Sign in to manage your subscription.');
  const accounts = JSON.parse(localStorage.getItem(accountsKey) ?? '{}') as Record<string, AuthenticatedUser>;
  const user = accounts[email];
  if (!user) throw new Error('Sign in to manage your subscription.');
  const updated = update(user);
  accounts[email] = updated;
  localStorage.setItem(accountsKey, JSON.stringify(accounts));
  window.dispatchEvent(new CustomEvent('academix:subscription-updated', { detail: updated }));
  return updated;
}

export async function skipSubscription(): Promise<AuthenticatedUser> {
  if (testAuthEnabled) {
    localStorage.setItem(testSubscriptionKey, JSON.stringify({ planId: 'free', status: 'free', cancelAtPeriodEnd: false, invoices: [] }));
    return updateTestUser((user) => ({
      ...user,
      plan: 'free',
      planStatus: 'free',
      subscriptionStepCompletedAt: new Date().toISOString(),
      subscriptionSkippedAt: new Date().toISOString(),
    }));
  }
  const result = await request<{ user: AuthenticatedUser }>('/skip', 'POST', {});
  return result.user;
}

export async function createCheckoutSession(planId: string, onboarding: boolean): Promise<{ url: string }> {
  if (testAuthEnabled) {
    throw new Error('Secure checkout is unavailable while local test sign-in is enabled. Set VITE_AUTH_BYPASS=false and configure Stripe to test payments.');
  }
  return request('/checkout-session', 'POST', { planId, onboarding, idempotencyKey: crypto.randomUUID() });
}

export interface CheckoutPaymentIntent {
  mode: 'payment' | 'scheduled';
  clientSecret?: string;
  subscriptionId?: string;
  effectiveAt?: string;
  currentPeriodEnd?: string;
  amountDue?: number;
  taxAmount?: number;
  prorationCredit?: number;
}

export async function createCheckoutPaymentIntent(
  planId: string,
  idempotencyKey: string,
  billing: { cardholderName: string; country: string; postalCode: string },
): Promise<CheckoutPaymentIntent> {
  if (testAuthEnabled) {
    throw new Error('Secure checkout requires API-backed sign-in and Stripe test credentials.');
  }
  return request('/checkout-payment-intent', 'POST', { planId, idempotencyKey, ...billing });
}

export async function getSubscription(): Promise<SubscriptionDetails> {
  if (testAuthEnabled) {
    const savedSubscription = localStorage.getItem(testSubscriptionKey);
    if (savedSubscription) return JSON.parse(savedSubscription) as SubscriptionDetails;
    const email = localStorage.getItem(sessionKey);
    const accounts = JSON.parse(localStorage.getItem(accountsKey) ?? '{}') as Record<string, AuthenticatedUser>;
    const user = email ? accounts[email] : undefined;
    return {
      planId: user?.plan ?? 'free',
      status: user?.planStatus ?? 'free',
      cancelAtPeriodEnd: false,
      invoices: [],
    };
  }
  return request('/me');
}

export async function cancelSubscription(): Promise<void> {
  if (testAuthEnabled) throw new Error('Subscription changes require secure billing to be configured.');
  await request('/cancel', 'POST');
}

export async function resumeSubscription(): Promise<void> {
  if (testAuthEnabled) throw new Error('Subscription changes require secure billing to be configured.');
  await request('/resume', 'POST');
}

export async function changeSubscriptionPlan(planId: string): Promise<void> {
  if (testAuthEnabled) throw new Error('Subscription changes require secure billing to be configured.');
  await request('/change-plan', 'PATCH', { planId });
}

export async function openBillingPortal(): Promise<{ url: string }> {
  if (testAuthEnabled) throw new Error('Billing settings require secure billing to be configured.');
  return request('/portal', 'POST', {});
}

export async function trackSubscriptionEvent(eventName: SubscriptionAnalyticsEvent, planId?: string): Promise<void> {
  if (testAuthEnabled) {
    window.dispatchEvent(new CustomEvent('academix:subscription-analytics', { detail: { eventName, planId } }));
    return;
  }
  await request('/events', 'POST', { eventName, ...(planId ? { planId } : {}) });
}
