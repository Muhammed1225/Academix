import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(await readFile(resolve(root, 'shared', 'subscription-plans.json'), 'utf8'));
const dataDirectory = dirname(resolve(process.env.AUTH_DATA_FILE || resolve(root, 'server', 'data', 'users.json')));
const subscriptionsFile = resolve(dataDirectory, 'subscriptions.json');
const eventsFile = resolve(dataDirectory, 'payment-events.json');
const analyticsFile = resolve(dataDirectory, 'subscription-analytics.json');
const subscriptions = new Map();
const checkoutRequests = new Map();
const checkoutRateLimits = new Map();
const analyticsRateLimits = new Map();
const paymentEvents = new Map();
const analytics = [];
try {
  const savedAnalytics = JSON.parse(await readFile(analyticsFile, 'utf8'));
  if (Array.isArray(savedAnalytics)) analytics.push(...savedAnalytics.slice(-10_000));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
let writeQueue = Promise.resolve();

for (const [file, map, key] of [[subscriptionsFile, subscriptions, 'userId'], [eventsFile, paymentEvents, 'id']]) {
  try {
    const saved = JSON.parse(await readFile(file, 'utf8'));
    if (Array.isArray(saved)) {
      for (const value of saved) {
        if (key === 'userId' && value?.[key]) map.set(value[key], value);
        else if (key === 'id' && value?.[key]) map.set(value[key], value);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export function hasSubscriptionFeature(user, feature) {
  const plan = config.plans.find((candidate) => candidate.id === user.plan);
  if (!plan?.features?.[feature]) return false;
  if (user.planStatus === 'active' || user.planStatus === 'trialing') return true;
  const record = subscriptions.get(user.id);
  return user.planStatus === 'past_due' && record?.gracePeriodEnd && Date.parse(record.gracePeriodEnd) > Date.now();
}

export function canJoinClass(user, studentCount) {
  if (!user || !Number.isInteger(studentCount) || studentCount < 0) return false;
  if (user.plan === 'free' && user.planStatus === 'free') return true;
  if (!['active', 'trialing', 'past_due'].includes(user.planStatus) ||
    (user.planStatus === 'past_due' && !hasSubscriptionFeature(user, 'customization'))) return false;
  const plan = config.plans.find((candidate) => candidate.id === user.plan);
  const maximum = plan?.limits?.maxStudentsPerClass;
  return maximum === null || (typeof maximum === 'number' && studentCount < maximum);
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req, limit = 16_384) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) throw new Error('Request too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function saveJson(file, values) {
  const operation = writeQueue.then(async () => {
    const temporary = `${file}.${randomUUID()}.tmp`;
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(temporary, JSON.stringify(values), { mode: 0o600 });
    await rename(temporary, file);
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

async function recordAnalytics(userId, eventName, planId) {
  const plan = planId ? config.plans.find((candidate) => candidate.id === planId) : undefined;
  analytics.push({
    userId,
    eventName,
    ...(planId ? { planId } : {}),
    ...(plan ? { planName: plan.name } : {}),
    createdAt: new Date().toISOString(),
  });
  if (analytics.length > 10_000) analytics.splice(0, analytics.length - 10_000);
  await saveJson(analyticsFile, analytics);
}

function recordAnalyticsSafely(userId, eventName, planId) {
  return recordAnalytics(userId, eventName, planId).catch((error) => {
    console.error('Unable to persist subscription analytics event:', error);
  });
}

async function stripe(path, method = 'GET', fields, idempotencyKey) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Stripe billing is not configured. Set STRIPE_SECRET_KEY before enabling checkout.');
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(fields ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(fields ? { body: new URLSearchParams(fields).toString() } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error?.message ?? 'The billing provider could not complete this request.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function planById(id) {
  return config.plans.find((plan) => plan.id === id && plan.enabled);
}

function subscriptionIsCurrent(record) {
  if (!record) return false;
  if (record.status === 'active' || record.status === 'trialing') return true;
  return record.status === 'past_due' && record.everActivated !== false &&
    record.gracePeriodEnd && Date.parse(record.gracePeriodEnd) > Date.now();
}

function rateLimited(userId) {
  const now = Date.now();
  const previous = (checkoutRateLimits.get(userId) ?? []).filter((time) => now - time < 60_000);
  if (previous.length >= 5) return true;
  previous.push(now);
  checkoutRateLimits.set(userId, previous);
  return false;
}

async function stripePriceForPlan(plan) {
  const product = await stripe('/products', 'POST', { name: `Academix ${plan.name}` }, `product-plan-${plan.id}`);
  if (product.name !== `Academix ${plan.name}`) {
    await stripe(`/products/${product.id}`, 'POST', { name: `Academix ${plan.name}` });
  }
  return stripe('/prices', 'POST', {
    currency: plan.currency,
    unit_amount: String(Math.round(plan.price * 100)),
    'recurring[interval]': plan.interval,
    product: product.id,
  }, `price-${plan.id}-${Math.round(plan.price * 100)}`);
}

function paymentIntentForSubscription(subscription) {
  const invoice = subscription.latest_invoice;
  const intent = invoice?.payment_intent;
  return {
    ...(typeof intent?.client_secret === 'string' ? { clientSecret: intent.client_secret } : {}),
    ...(Number.isInteger(invoice?.amount_due) ? { amountDue: invoice.amount_due } : {}),
    ...(Array.isArray(invoice?.total_tax_amounts)
      ? { taxAmount: invoice.total_tax_amounts.reduce((sum, item) => sum + (item.amount ?? 0), 0) }
      : {}),
    ...(Array.isArray(invoice?.lines?.data)
      ? {
          prorationCredit: invoice.lines.data
            .filter((line) => line.proration && line.amount < 0)
            .reduce((sum, line) => sum + Math.abs(line.amount), 0),
        }
      : {}),
    ...(invoice?.next_payment_attempt ? { nextPaymentAttempt: invoice.next_payment_attempt } : {}),
    ...(subscription.current_period_end
      ? { currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString() }
      : {}),
  };
}

function findUser(users, userId) {
  return [...users.values()].find((candidate) => candidate.id === userId);
}

function paymentSummary(user, record, invoices = [], paymentMethod) {
  return {
    planId: user.plan ?? 'free',
    status: user.planStatus ?? 'free',
    ...(record?.currentPeriodEnd ? { currentPeriodEnd: record.currentPeriodEnd } : {}),
    cancelAtPeriodEnd: record?.cancelAtPeriodEnd === true,
    ...(record?.customerId ? { customerId: record.customerId } : {}),
    ...(record?.subscriptionId ? { subscriptionId: record.subscriptionId } : {}),
    ...(record?.trialEnd ? { trialEnd: record.trialEnd } : {}),
    ...((paymentMethod?.last4 ?? record?.paymentMethodLast4)
      ? { paymentMethodLast4: paymentMethod?.last4 ?? record.paymentMethodLast4 }
      : {}),
    ...((paymentMethod?.brand ?? record?.paymentMethodBrand)
      ? { paymentMethodBrand: paymentMethod?.brand ?? record.paymentMethodBrand }
      : {}),
    invoices,
  };
}

async function verifyWebhook(req, res, users, saveUsers) {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecret) {
    sendJson(res, 503, { error: 'Payment webhooks are not configured.' });
    return;
  }
  const signature = req.headers['stripe-signature'];
  const rawChunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 1_000_000) {
      sendJson(res, 413, { error: 'Webhook payload is too large.' });
      return;
    }
    rawChunks.push(chunk);
  }
  const rawBody = Buffer.concat(rawChunks);
  const header = typeof signature === 'string' ? signature.split(',').map((part) => part.split('=')) : [];
  const timestamp = header.find(([key]) => key === 't')?.[1];
  const signatures = header.filter(([key]) => key === 'v1').map(([, value]) => value);
  const expected = timestamp ? createHmac('sha256', signingSecret).update(`${timestamp}.${rawBody}`).digest() : null;
  const validSignature = expected && Number.isFinite(Number(timestamp)) && Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300 &&
    signatures.some((value) => {
      if (!/^[\da-f]{64}$/i.test(value)) return false;
      return timingSafeEqual(expected, Buffer.from(value, 'hex'));
    });
  if (!validSignature) {
    sendJson(res, 400, { error: 'Invalid payment webhook signature.' });
    return;
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  if (!event.id || paymentEvents.has(event.id)) {
    sendJson(res, 200, { received: true });
    return;
  }
  const object = event.data?.object ?? {};
  const previousPlanId = [...subscriptions.values()].find((item) => item.subscriptionId === object.subscription || item.subscriptionId === object.id)?.planId;
  const relatedSubscriptionId = typeof object.subscription === 'string'
    ? object.subscription
    : object.subscription?.id ?? (object.object === 'subscription' ? object.id : undefined);
  let record = [...subscriptions.values()].find((item) => item.subscriptionId === relatedSubscriptionId);

  if (event.type === 'checkout.session.completed' && object.mode === 'subscription') {
    const user = findUser(users, object.client_reference_id ?? object.metadata?.userId);
    if (user && typeof object.subscription === 'string') {
      const plan = planById(object.metadata?.planId);
      if (!plan) throw new Error('Checkout webhook referenced an unknown plan.');
      const current = await stripe(`/subscriptions/${object.subscription}`);
      record = {
        userId: user.id,
        planId: plan.id,
        customerId: typeof object.customer === 'string' ? object.customer : object.customer?.id,
        subscriptionId: object.subscription,
        status: current.status,
        everActivated: current.status === 'active' || current.status === 'trialing',
        currentPeriodEnd: current.current_period_end ? new Date(current.current_period_end * 1000).toISOString() : undefined,
        cancelAtPeriodEnd: current.cancel_at_period_end === true,
        ...(current.trial_end ? { trialEnd: new Date(current.trial_end * 1000).toISOString() } : {}),
        createdAt: new Date().toISOString(),
      };
      subscriptions.set(user.id, record);
      user.plan = current.status === 'active' || current.status === 'trialing' || current.status === 'past_due' ? plan.id : 'free';
      user.planStatus = current.status;
      user.subscriptionStepCompletedAt = new Date().toISOString();
      user.onboardingStep = 4;
      delete user.subscriptionSkippedAt;
    }
  } else if (record && ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed'].includes(event.type)) {
    const periodStarted = object.current_period_start
      ? new Date(object.current_period_start * 1000).getTime()
      : 0;
    const priorPeriodEnd = record.currentPeriodEnd ? Date.parse(record.currentPeriodEnd) : Number.POSITIVE_INFINITY;
    const updatedPlanId = event.type === 'customer.subscription.updated' && !object.pending_update
      ? planById(object.metadata?.planId)?.id
      : undefined;
    const paidUpgradePlan = event.type === 'invoice.paid' && record.pendingPlanChange === 'upgrade'
      ? record.pendingPlanId
      : undefined;
    const nextPlanId = paidUpgradePlan ?? updatedPlanId ??
      (event.type === 'customer.subscription.updated' && record.pendingPlanId && periodStarted >= priorPeriodEnd
        ? record.pendingPlanId
        : record.planId);
    const planChanged = nextPlanId !== record.planId;
    const wasEverActivated = record.everActivated ?? ['active', 'trialing'].includes(record.status);
    const status = event.type === 'customer.subscription.deleted'
      ? 'canceled'
      : event.type === 'invoice.paid'
        ? 'active'
        : event.type === 'invoice.payment_failed'
          ? 'past_due'
          : object.status;
    record = {
      ...record,
      planId: nextPlanId,
      status,
      everActivated: wasEverActivated || event.type === 'invoice.paid',
      ...(object.current_period_end ? { currentPeriodEnd: new Date(object.current_period_end * 1000).toISOString() } : {}),
      ...(typeof object.cancel_at_period_end === 'boolean' ? { cancelAtPeriodEnd: object.cancel_at_period_end } : {}),
      ...(object.trial_end ? { trialEnd: new Date(object.trial_end * 1000).toISOString() } : {}),
      ...(event.type === 'invoice.payment_failed' ? { gracePeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } : {}),
      ...(status === 'past_due' && !record.gracePeriodEnd ? { gracePeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } : {}),
      ...(event.type === 'invoice.paid' ? { gracePeriodEnd: undefined } : {}),
    };
    if (record.pendingPlanId && planChanged) {
      delete record.pendingPlanId;
      delete record.pendingPlanChange;
    }
    subscriptions.set(record.userId, record);
    const user = findUser(users, record.userId);
    if (user) {
      const paidPlanActive = status === 'active' || status === 'trialing' || (status === 'past_due' && record.everActivated);
      user.plan = paidPlanActive ? nextPlanId : 'free';
      user.planStatus = paidPlanActive ? status : 'free';
      if (paidPlanActive) {
        user.subscriptionStepCompletedAt ??= new Date().toISOString();
        user.onboardingStep = 4;
        delete user.subscriptionSkippedAt;
      }
      if (event.type === 'customer.subscription.deleted') user.subscriptionStepCompletedAt ??= new Date().toISOString();
    }
  }

  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const user = findUser(users, object.client_reference_id ?? object.metadata?.userId);
    if (user) await recordAnalyticsSafely(user.id, 'checkout_failed', object.metadata?.planId);
  }
  if (event.type === 'invoice.payment_failed' && record) await recordAnalyticsSafely(record.userId, 'payment_failed', record.planId);
  if (event.type === 'invoice.paid' && record) await recordAnalyticsSafely(record.userId, 'payment_succeeded', record.planId);
  if (event.type === 'checkout.session.completed' && record) await recordAnalyticsSafely(record.userId, 'checkout_completed', record.planId);
  if (event.type === 'customer.subscription.updated' && record && previousPlanId &&
    previousPlanId !== record.planId && (planById(record.planId)?.price ?? 0) > (planById(previousPlanId)?.price ?? 0)) {
    await recordAnalyticsSafely(record.userId, 'plan_upgraded', record.planId);
  }
  if (event.type === 'customer.subscription.deleted' && record) await recordAnalyticsSafely(record.userId, 'plan_canceled', record.planId);
  if (record) await saveJson(subscriptionsFile, [...subscriptions.values()]);
  paymentEvents.set(event.id, { id: event.id, type: event.type, receivedAt: new Date().toISOString() });
  await saveJson(eventsFile, [...paymentEvents.values()]);
  if (record) await saveUsers();
  sendJson(res, 200, { received: true });
}

export async function handleSubscriptions(req, res, url, user, users, saveUsers, publicUser) {
  if (!url.pathname.startsWith('/api/subscriptions') && url.pathname !== '/api/webhooks/payments' && url.pathname !== '/api/plans') return false;
  if (req.method === 'POST' && url.pathname === '/api/webhooks/payments') {
    try {
      await verifyWebhook(req, res, users, saveUsers);
    } catch (error) {
      console.error('Payment webhook processing failed:', error);
      sendJson(res, 500, { error: 'Unable to process payment event.' });
    }
    return true;
  }
  if (req.method === 'GET' && ['/api/subscriptions/plans', '/api/plans'].includes(url.pathname)) {
    sendJson(res, 200, {
      plans: config.plans.filter((plan) => plan.enabled),
      subscriptionStepEnabled: config.subscriptionStepEnabled,
      subscriptionStepRoles: config.subscriptionStepRoles,
    });
    return true;
  }
  if (!user || !users.has(user.email)) {
    sendJson(res, 401, { error: 'Sign in with a verified account to manage billing.' });
    return true;
  }
  let record = subscriptions.get(user.id);
  try {
    if (req.method === 'POST' && url.pathname === '/api/subscriptions/events') {
      const recentAnalytics = (analyticsRateLimits.get(user.id) ?? []).filter((time) => Date.now() - time < 60_000);
      if (recentAnalytics.length >= 60) {
        sendJson(res, 429, { error: 'Too many analytics events. Try again shortly.' });
        return true;
      }
      recentAnalytics.push(Date.now());
      analyticsRateLimits.set(user.id, recentAnalytics);
      const input = await readJson(req);
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        sendJson(res, 400, { error: 'Invalid subscription analytics event.' });
        return true;
      }
      const allowedEvents = new Set([
        'subscription_screen_viewed',
        'plan_selected',
        'limit_reached',
        'profile_subscription_button_clicked',
        'checkout_viewed',
        'payment_submitted',
        'payment_succeeded',
        'payment_failed',
        'checkout_abandoned',
      ]);
      if (!allowedEvents.has(input?.eventName) ||
        (input.planId !== undefined && input.planId !== 'free' && !planById(input.planId))) {
        sendJson(res, 400, { error: 'Invalid subscription analytics event.' });
        return true;
      }
      await recordAnalytics(user.id, input.eventName, input.planId);
      sendJson(res, 202, { accepted: true });
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/subscriptions/checkout-payment-intent') {
      const input = await readJson(req);
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        sendJson(res, 400, { error: 'Enter valid billing details and choose a plan to continue.' });
        return true;
      }
      const plan = planById(input?.planId);
      if (!plan || typeof input.idempotencyKey !== 'string' || !/^[\da-f-]{36}$/i.test(input.idempotencyKey) ||
        typeof input.cardholderName !== 'string' || !input.cardholderName.trim() || input.cardholderName.trim().length > 120 ||
        typeof input.country !== 'string' || !/^[A-Z]{2}$/.test(input.country) ||
        typeof input.postalCode !== 'string' || !input.postalCode.trim() || input.postalCode.trim().length > 24) {
        sendJson(res, 400, { error: 'Enter valid billing details and choose a plan to continue.' });
        return true;
      }

      const cacheKey = `${user.id}:${input.idempotencyKey}`;
      const cached = checkoutRequests.get(cacheKey);
      if (cached) {
        sendJson(res, 200, cached);
        return true;
      }
      if (rateLimited(user.id)) {
        sendJson(res, 429, { error: 'Too many checkout attempts. Please wait a minute and try again.' });
        return true;
      }

      const billing = {
        name: input.cardholderName.trim(),
        email: user.email,
        'address[country]': input.country,
        'address[postal_code]': input.postalCode.trim(),
      };
      let customerId = record?.customerId;
      if (customerId) {
        await stripe(`/customers/${customerId}`, 'POST', billing);
      } else {
        const customer = await stripe('/customers', 'POST', {
          ...billing,
          'metadata[userId]': user.id,
        }, `customer-${user.id}-${input.idempotencyKey}`);
        customerId = customer.id;
      }

      const finish = async (result) => {
        checkoutRequests.set(cacheKey, result);
        await recordAnalyticsSafely(user.id, 'checkout_started', plan.id);
        sendJson(res, 200, result);
      };

      if (record?.subscriptionId && record.planId === plan.id && record.everActivated === false &&
        ['incomplete', 'past_due'].includes(record.status)) {
        const pending = await stripe(`/subscriptions/${record.subscriptionId}?expand[]=latest_invoice.payment_intent&expand[]=latest_invoice.lines`);
        await finish({
          mode: 'payment',
          subscriptionId: record.subscriptionId,
          ...paymentIntentForSubscription(pending),
        });
        return true;
      }

      const currentPlan = record ? planById(record.planId) : undefined;
      if (record?.subscriptionId && record.everActivated === false &&
        record.planId !== plan.id && ['incomplete', 'past_due'].includes(record.status)) {
        await stripe(`/subscriptions/${record.subscriptionId}`, 'DELETE', undefined, `replace-unpaid-${record.subscriptionId}`);
        subscriptions.delete(user.id);
        await saveJson(subscriptionsFile, [...subscriptions.values()]);
        record = undefined;
      }
      if (record?.subscriptionId && subscriptionIsCurrent(record)) {
        if (record.planId === plan.id) {
          sendJson(res, 409, { error: 'This is already your current plan.' });
          return true;
        }
        const current = await stripe(`/subscriptions/${record.subscriptionId}`);
        const item = current.items?.data?.[0];
        if (!item) {
          sendJson(res, 409, { error: 'The current subscription cannot be updated. Contact support.' });
          return true;
        }
        const nextPrice = await stripePriceForPlan(plan);
        if (currentPlan && plan.price < currentPlan.price) {
          const schedule = await stripe('/subscription_schedules', 'POST', {
            from_subscription: record.subscriptionId,
          }, `schedule-${record.subscriptionId}-${plan.id}-${input.idempotencyKey}`);
          await stripe(`/subscription_schedules/${schedule.id}`, 'POST', {
            end_behavior: 'release',
            'phases[0][items][0][price]': item.price.id,
            'phases[0][start_date]': String(current.current_period_start),
            'phases[0][end_date]': String(current.current_period_end),
            'phases[1][items][0][price]': nextPrice.id,
            'phases[1][start_date]': String(current.current_period_end),
            'phases[1][metadata][planId]': plan.id,
            'phases[1][metadata][userId]': user.id,
          }, `schedule-phase-${record.subscriptionId}-${plan.id}-${input.idempotencyKey}`);
          record.pendingPlanId = plan.id;
          subscriptions.set(record.userId, record);
          await saveJson(subscriptionsFile, [...subscriptions.values()]);
          const result = {
            mode: 'scheduled',
            effectiveAt: record.currentPeriodEnd,
            subscriptionId: record.subscriptionId,
          };
          await finish(result);
          return true;
        }

        record.pendingPlanId = plan.id;
        record.pendingPlanChange = 'upgrade';
        subscriptions.set(record.userId, record);
        await saveJson(subscriptionsFile, [...subscriptions.values()]);
        let updated;
        try {
          updated = await stripe(`/subscriptions/${record.subscriptionId}`, 'POST', {
            'items[0][id]': item.id,
            'items[0][price]': nextPrice.id,
            proration_behavior: 'always_invoice',
            payment_behavior: 'pending_if_incomplete',
            'payment_settings[save_default_payment_method]': 'on_subscription',
            'automatic_tax[enabled]': 'true',
            'metadata[planId]': plan.id,
            'metadata[userId]': user.id,
            'expand[0]': 'latest_invoice.payment_intent',
            'expand[1]': 'latest_invoice.lines',
          }, `upgrade-${record.subscriptionId}-${plan.id}-${input.idempotencyKey}`);
        } catch (error) {
          delete record.pendingPlanId;
          delete record.pendingPlanChange;
          await saveJson(subscriptionsFile, [...subscriptions.values()]);
          throw error;
        }
        const result = {
          mode: 'payment',
          subscriptionId: record.subscriptionId,
          ...paymentIntentForSubscription(updated),
        };
        await finish(result);
        return true;
      }

      const fields = {
        customer: customerId,
        'items[0][price_data][currency]': plan.currency,
        'items[0][price_data][unit_amount]': String(Math.round(plan.price * 100)),
        'items[0][price_data][recurring][interval]': plan.interval,
        'items[0][price_data][product_data][name]': `Academix ${plan.name}`,
        'items[0][quantity]': '1',
        payment_behavior: 'default_incomplete',
        'payment_settings[save_default_payment_method]': 'on_subscription',
        'automatic_tax[enabled]': 'true',
        'metadata[userId]': user.id,
        'metadata[planId]': plan.id,
        'expand[0]': 'latest_invoice.payment_intent',
        'expand[1]': 'latest_invoice.lines',
      };
      let created;
      try {
        created = await stripe('/subscriptions', 'POST', fields, `subscription-${user.id}-${input.idempotencyKey}`);
      } catch (error) {
        await recordAnalyticsSafely(user.id, 'payment_failed', plan.id);
        throw error;
      }
      const newRecord = {
        userId: user.id,
        planId: plan.id,
        customerId,
        subscriptionId: created.id,
        status: created.status,
        everActivated: false,
        currentPeriodEnd: created.current_period_end ? new Date(created.current_period_end * 1000).toISOString() : undefined,
        cancelAtPeriodEnd: created.cancel_at_period_end === true,
        createdAt: new Date().toISOString(),
      };
      subscriptions.set(user.id, newRecord);
      await saveJson(subscriptionsFile, [...subscriptions.values()]);
      await finish({
        mode: 'payment',
        subscriptionId: created.id,
        ...paymentIntentForSubscription(created),
      });
      return true;
    }
    if (req.method === 'GET' && url.pathname === '/api/subscriptions/me') {
      if (record?.status === 'past_due' && record.gracePeriodEnd && Date.parse(record.gracePeriodEnd) <= Date.now()) {
        user.plan = 'free';
        user.planStatus = 'free';
        await saveUsers();
      }
      if (!record?.customerId || !process.env.STRIPE_SECRET_KEY) {
        sendJson(res, 200, paymentSummary(user, record));
        return true;
      }
      const [invoicesResult, paymentMethods] = await Promise.all([
        stripe(`/invoices?customer=${encodeURIComponent(record.customerId)}&limit=10`),
        stripe(`/payment_methods?customer=${encodeURIComponent(record.customerId)}&type=card&limit=1`),
      ]);
      const invoices = invoicesResult.data.map((invoice) => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000).toISOString(),
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        ...(invoice.hosted_invoice_url ? { url: invoice.hosted_invoice_url } : {}),
      }));
      const card = paymentMethods.data[0]?.card;
      if (card && record) {
        record.paymentMethodBrand = card.brand;
        record.paymentMethodLast4 = card.last4;
        await saveJson(subscriptionsFile, [...subscriptions.values()]);
      }
      sendJson(res, 200, paymentSummary(user, record, invoices, card
        ? { last4: card.last4, brand: card.brand }
        : undefined));
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/subscriptions/skip') {
      const input = await readJson(req);
      if (input?.planId !== undefined) {
        sendJson(res, 400, { error: 'Invalid subscription completion request.' });
        return true;
      }
      if (record?.subscriptionId && subscriptionIsCurrent(record)) {
        sendJson(res, 409, { error: 'An active paid subscription cannot be skipped.' });
        return true;
      }
      const previous = {
        plan: user.plan,
        planStatus: user.planStatus,
        onboardingStep: user.onboardingStep,
        subscriptionStepCompletedAt: user.subscriptionStepCompletedAt,
        subscriptionSkippedAt: user.subscriptionSkippedAt,
      };
      user.plan = 'free';
      user.planStatus = 'free';
      user.onboardingStep = 4;
      user.subscriptionStepCompletedAt = new Date().toISOString();
      user.subscriptionSkippedAt = new Date().toISOString();
      try {
        await saveUsers();
      } catch (error) {
        Object.assign(user, previous);
        throw error;
      }
      await recordAnalyticsSafely(user.id, 'subscription_skipped');
      sendJson(res, 200, { user: publicUser(user) });
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/subscriptions/checkout-session') {
      const input = await readJson(req);
      const plan = planById(input?.planId);
      if (!plan || typeof input.idempotencyKey !== 'string' || !/^[\da-f-]{36}$/i.test(input.idempotencyKey)) {
        sendJson(res, 400, { error: 'Choose a valid plan and retry checkout.' });
        return true;
      }
      if (subscriptionIsCurrent(record)) {
        sendJson(res, 409, { error: 'You already have an active subscription. Change your current plan instead.' });
        return true;
      }
      if (rateLimited(user.id)) {
        sendJson(res, 429, { error: 'Too many checkout attempts. Please wait a minute and try again.' });
        return true;
      }
      const cached = checkoutRequests.get(input.idempotencyKey);
      if (cached) {
        sendJson(res, 200, cached);
        return true;
      }
      const origin = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      const flow = input.onboarding === true ? 'onboarding' : 'manage';
      const fields = {
        mode: 'subscription',
        ...(record?.customerId ? { customer: record.customerId } : { customer_email: user.email }),
        client_reference_id: user.id,
        success_url: `${origin}/subscription?flow=${flow}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/subscription?flow=${flow}&checkout=cancelled`,
        'line_items[0][price_data][currency]': plan.currency,
        'line_items[0][price_data][unit_amount]': String(Math.round(plan.price * 100)),
        'line_items[0][price_data][recurring][interval]': plan.interval,
        'line_items[0][price_data][product_data][name]': `Academix ${plan.name}`,
        'line_items[0][quantity]': '1',
        'automatic_tax[enabled]': 'true',
        'metadata[userId]': user.id,
        'metadata[planId]': plan.id,
        'subscription_data[metadata][userId]': user.id,
        'subscription_data[metadata][planId]': plan.id,
      };
      await recordAnalyticsSafely(user.id, 'checkout_started', plan.id);
      let session;
      try {
        session = await stripe('/checkout/sessions', 'POST', fields, input.idempotencyKey);
      } catch (error) {
        await recordAnalyticsSafely(user.id, 'checkout_failed', plan.id);
        throw error;
      }
      if (!session.url || new URL(session.url).hostname !== 'checkout.stripe.com' || new URL(session.url).protocol !== 'https:') {
        sendJson(res, 502, { error: 'The billing provider did not return a checkout link. Please retry.' });
        return true;
      }
      const result = { url: session.url };
      checkoutRequests.set(input.idempotencyKey, result);
      sendJson(res, 200, result);
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/subscriptions/cancel') {
      if (!record?.subscriptionId) {
        sendJson(res, 409, { error: 'There is no active subscription to cancel.' });
        return true;
      }
      await stripe(`/subscriptions/${record.subscriptionId}`, 'POST', { cancel_at_period_end: 'true' });
      sendJson(res, 200, { ok: true });
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/subscriptions/resume') {
      if (!record?.subscriptionId || !record.cancelAtPeriodEnd) {
        sendJson(res, 409, { error: 'There is no cancelled subscription to resume.' });
        return true;
      }
      await stripe(`/subscriptions/${record.subscriptionId}`, 'POST', { cancel_at_period_end: 'false' });
      sendJson(res, 200, { ok: true });
      return true;
    }
    if (req.method === 'POST' && url.pathname === '/api/subscriptions/portal') {
      if (!record?.customerId) {
        sendJson(res, 409, { error: 'A billing account is not available yet.' });
        return true;
      }
      const origin = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      const session = await stripe('/billing_portal/sessions', 'POST', {
        customer: record.customerId,
        return_url: `${origin}/subscription`,
      });
      if (new URL(session.url).hostname !== 'billing.stripe.com' || new URL(session.url).protocol !== 'https:') {
        sendJson(res, 502, { error: 'The billing provider returned an invalid settings link.' });
        return true;
      }
      sendJson(res, 200, { url: session.url });
      return true;
    }
    if (req.method === 'PATCH' && url.pathname === '/api/subscriptions/change-plan') {
      const input = await readJson(req);
      const plan = planById(input?.planId);
      if (!plan || !record?.subscriptionId || !subscriptionIsCurrent(record)) {
        sendJson(res, 400, { error: 'Choose a valid plan for an active subscription.' });
        return true;
      }
      const current = await stripe(`/subscriptions/${record.subscriptionId}`);
      const item = current.items?.data?.[0];
      if (!item) {
        sendJson(res, 409, { error: 'The current subscription cannot be updated. Contact support.' });
        return true;
      }
      const product = await stripe('/products', 'POST', { name: `Academix ${plan.name}` }, `product-${record.subscriptionId}-${plan.id}`);
      const nextPrice = await stripe('/prices', 'POST', {
        currency: plan.currency,
        unit_amount: String(Math.round(plan.price * 100)),
        'recurring[interval]': plan.interval,
        product: product.id,
      }, `price-${record.subscriptionId}-${plan.id}`);
      if (plan.price > (planById(record.planId)?.price ?? 0)) {
        await stripe(`/subscriptions/${record.subscriptionId}`, 'POST', {
          'items[0][id]': item.id,
          'items[0][price]': nextPrice.id,
          proration_behavior: 'always_invoice',
          'metadata[planId]': plan.id,
          'metadata[userId]': user.id,
        }, `upgrade-${record.subscriptionId}-${plan.id}`);
      } else {
        const schedule = await stripe('/subscription_schedules', 'POST', { from_subscription: record.subscriptionId });
        await stripe(`/subscription_schedules/${schedule.id}`, 'POST', {
          end_behavior: 'release',
          'phases[0][items][0][price]': item.price.id,
          'phases[0][start_date]': String(current.current_period_start),
          'phases[0][end_date]': String(current.current_period_end),
          'phases[1][items][0][price]': nextPrice.id,
          'phases[1][start_date]': String(current.current_period_end),
          'phases[1][metadata][planId]': plan.id,
          'phases[1][metadata][userId]': user.id,
        });
        record.pendingPlanId = plan.id;
        subscriptions.set(record.userId, record);
        await saveJson(subscriptionsFile, [...subscriptions.values()]);
      }
      sendJson(res, 200, { ok: true, effectiveAt: plan.price < (planById(record.planId)?.price ?? 0) ? record.currentPeriodEnd : 'immediately' });
      return true;
    }
    sendJson(res, 405, { error: 'Unsupported subscription request.' });
    return true;
  } catch (error) {
    const status = error.status === 429 ? 429 : error.status && error.status < 500 ? 400 : 502;
    console.error('Subscription request failed:', error);
    sendJson(res, status, { error: error.message || 'Unable to complete your billing request.' });
    return true;
  }
}
