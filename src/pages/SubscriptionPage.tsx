import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { BrandMark, Icon } from '../components/ui';
import {
  cancelSubscription,
  getSubscription,
  openBillingPortal,
  resumeSubscription,
  skipSubscription,
  subscriptionConfig,
  trackSubscriptionEvent,
  type SubscriptionDetails,
  type SubscriptionPlan,
} from '../subscriptionService';
import { useApp } from '../store';
import { useSubscriptionStore } from '../subscriptionStore';

function priceLabel(plan: SubscriptionPlan) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency.toUpperCase() }).format(plan.price);
}

function studentLimit(plan: SubscriptionPlan) {
  return plan.limits.maxStudentsPerClass === null ? 'Unlimited students per class' : `Up to ${plan.limits.maxStudentsPerClass} students per class`;
}

export default function SubscriptionPage({ onboarding = false, onBack }: { onboarding?: boolean; onBack?: () => void }) {
  const user = useApp((state) => state.user);
  const authChecked = useApp((state) => state.authChecked);
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const setSharedSubscription = useSubscriptionStore((state) => state.setDetails);
  const location = useLocation();
  const navigate = useNavigate();
  const enabledPlans = subscriptionConfig.plans.filter((plan) => plan.enabled);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cancelPrompt, setCancelPrompt] = useState(false);
  const [checkoutConfirmed, setCheckoutConfirmed] = useState(false);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const viewed = useRef(false);
  const selectedPlan = enabledPlans.find((plan) => plan.id === selectedPlanId);
  const isEducator = user?.role === 'faculty' || user?.role === 'scholar';
  const onboardingFlow = onboarding || new URLSearchParams(location.search).get('flow') === 'onboarding';
  const managementMode = !onboardingFlow;
  const syncPlanToStore = useCallback((current: SubscriptionDetails) => {
    const currentUser = useApp.getState().user;
    const plan = current.planId === 'starter' || current.planId === 'plus' || current.planId === 'pro' ? current.planId : 'free';
    const planStatus = current.status === 'active' || current.status === 'trialing' || current.status === 'past_due' ? current.status : 'free';
    if (currentUser && (currentUser.plan !== plan || currentUser.planStatus !== planStatus)) {
      setAuthenticatedUser({ ...currentUser, plan, planStatus });
    }
  }, [setAuthenticatedUser]);

  const refreshSubscription = useCallback(async () => {
    try {
      const current = await getSubscription();
      setSubscription(current);
      if (new URLSearchParams(location.search).get('source') === 'profile' && current.planId !== 'free') {
        setSelectedPlanId(current.planId);
      }
      const currentUser = useApp.getState().user;
      if (currentUser) setSharedSubscription(currentUser.id, current);
      syncPlanToStore(current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load subscription details.');
    }
  }, [location.search, setSharedSubscription, syncPlanToStore]);

  useEffect(() => {
    if (!authChecked || !useApp.getState().user || viewed.current) return;
    viewed.current = true;
    void trackSubscriptionEvent('subscription_screen_viewed').catch((reason: unknown) => console.error('Unable to record subscription page view:', reason));
  }, [authChecked, user?.id]);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (managementMode || new URLSearchParams(location.search).has('checkout')) void refreshSubscription();
  }, [authChecked, location.search, managementMode, navigate, refreshSubscription, user]);

  useEffect(() => {
    if (!authChecked || !useApp.getState().user) return;
    const params = new URLSearchParams(location.search);
    if (params.get('checkout') === 'cancelled') {
      setNotice('Checkout was cancelled. Your account is still on the Free plan.');
      setCheckoutConfirmed(false);
    }
    if (params.get('checkout') !== 'success') return;
    let active = true;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const current = await getSubscription();
        if (!active) return;
        setSubscription(current);
        const currentUser = useApp.getState().user;
        if (currentUser) setSharedSubscription(currentUser.id, current);
        syncPlanToStore(current);
        if (current.status === 'active' || current.status === 'trialing') {
          setCheckoutConfirmed(true);
          setNotice('');
        } else if (['past_due', 'incomplete', 'unpaid'].includes(current.status)) {
          setError('Payment could not be completed. Please retry checkout or continue with the Free plan.');
        } else if (attempts < 15) {
          window.setTimeout(() => void check(), 2000);
        } else {
          setNotice('Your payment is still being confirmed. You can continue using Academix; this page will update when billing confirms.');
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to confirm your payment.');
      }
    };
    void check();
    return () => { active = false; };
  }, [authChecked, location.search, setSharedSubscription, syncPlanToStore]);

  const skip = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await skipSubscription();
      setAuthenticatedUser(updated);
      navigate('/', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue with the Free plan.');
    } finally {
      setBusy(false);
    }
  };

  const continueWithPlan = async () => {
    if (!selectedPlan) return;
    const checkoutParams = new URLSearchParams({ plan: selectedPlan.id });
    if (onboardingFlow) checkoutParams.set('flow', 'onboarding');
    navigate(`/checkout?${checkoutParams.toString()}`);
  };

  const handleRadioKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = (index + direction + enabledPlans.length) % enabledPlans.length;
    choosePlan(enabledPlans[next].id);
    cardRefs.current[next]?.focus();
  };

  const choosePlan = (planId: string) => {
    setSelectedPlanId(planId);
    void trackSubscriptionEvent('plan_selected', planId).catch((reason: unknown) => console.error('Unable to record selected plan:', reason));
  };

  const runSubscriptionAction = async (action: 'cancel' | 'resume') => {
    setBusy(true);
    setError('');
    try {
      if (action === 'cancel') await cancelSubscription();
      else await resumeSubscription();
      await refreshSubscription();
      setCancelPrompt(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your subscription.');
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    setError('');
    try {
      const portal = await openBillingPortal();
      window.location.assign(portal.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open billing settings.');
      setBusy(false);
    }
  };

  if (!authChecked || !user) return <main className="p-8 text-center" aria-live="polite">Loading your account…</main>;
  const profilePlanMode = new URLSearchParams(location.search).get('source') === 'profile';
  const currentPlan = subscriptionConfig.plans.find((plan) => plan.id === subscription?.planId);
  const activePlan = currentPlan;
  const step = onboardingFlow ? 4 : undefined;

  return <div className="min-h-screen bg-surface px-4 pb-36 pt-5 sm:px-8 sm:pb-10">
    <header className="mx-auto flex max-w-6xl items-center justify-between">
      <Link to="/" aria-label="Academix home"><BrandMark /></Link>
      {onboardingFlow ? <span className="text-sm font-medium text-on-surface-variant">Set up your profile</span> : profilePlanMode
        ? <Link to="/profile" className="btn-ghost"><Icon name="arrow_back" /> Back to profile</Link>
        : <Link to="/" className="btn-ghost"><Icon name="arrow_back" /> Back to Academix</Link>}
    </header>
    <main className="mx-auto mt-8 max-w-6xl">
      {onboardingFlow && <div className="mb-6 flex items-center justify-between">
        <span className="eyebrow text-secondary">Step {step} of 4</span>
        <button type="button" onClick={() => onBack ? onBack() : navigate('/onboarding?step=4')} className="btn-ghost"><Icon name="arrow_back" /> Back</button>
      </div>}

      {checkoutConfirmed && <section role="status" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <Icon name="check_circle" className="!text-4xl text-emerald-700" fill />
        <h1 className="mt-2 font-headline text-3xl font-semibold text-primary">You’re on {activePlan?.name ?? 'your new plan'}. Welcome!</h1>
        <p className="mt-2 text-sm text-on-surface-variant">A receipt will be sent to {user.email}.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2"><Link to="/" className="btn-primary">Continue to Academix</Link><Link to="/subscription#billing" className="btn-outline">Billing settings</Link></div>
      </section>}

      {managementMode && <section id="billing" className="mb-8 rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="font-headline text-2xl font-semibold text-primary">Your subscription</h2>
        {subscription ? <>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><p className="eyebrow">Current plan</p><p className="mt-1 text-lg font-semibold text-primary">{activePlan?.name ?? 'Free'}</p><p className="text-sm text-on-surface-variant">{activePlan ? `${priceLabel(activePlan)} / month` : 'No charge'}</p></div>
            <div><p className="eyebrow">Status</p><p className="mt-1 text-sm font-semibold capitalize text-primary">{subscription.status.replace(/_/g, ' ')}</p><p className="text-sm text-on-surface-variant">{subscription.currentPeriodEnd ? `Next billing date: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : ''}</p></div>
            <div><p className="eyebrow">Payment method</p><p className="mt-1 text-sm text-primary">{subscription.paymentMethodLast4 ? `•••• ${subscription.paymentMethodLast4}` : 'Managed securely by Stripe'}</p></div>
          </div>
          {subscription.cancelAtPeriodEnd && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your plan remains active until {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'the end of your billing period'}.</p>}
          {subscription.status === 'past_due' && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your payment needs attention. Update your payment method to keep your paid features.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {subscription.customerId && <button type="button" disabled={busy} onClick={() => void openPortal()} className="btn-outline">Update payment method</button>}
            {subscription.subscriptionId && (subscription.cancelAtPeriodEnd
              ? <button type="button" disabled={busy} onClick={() => void runSubscriptionAction('resume')} className="btn-outline">Resume subscription</button>
              : <button type="button" disabled={busy} onClick={() => setCancelPrompt(true)} className="btn-outline">Cancel subscription</button>)}
          </div>
          {subscription.invoices.length > 0 && <div className="mt-6 border-t border-outline-variant/50 pt-4">
            <h3 className="font-semibold text-primary">Invoice history</h3>
            <ul className="mt-2 divide-y divide-outline-variant/40">{subscription.invoices.map((invoice) => <li key={invoice.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{new Date(invoice.date).toLocaleDateString()} · {invoice.status}</span><span>{new Intl.NumberFormat(undefined, { style: 'currency', currency: invoice.currency.toUpperCase() }).format(invoice.amount / 100)}</span>{invoice.url && <a className="font-semibold text-secondary underline" href={invoice.url} target="_blank" rel="noreferrer">View</a>}
            </li>)}</ul>
          </div>}
          {cancelPrompt && <div role="alertdialog" aria-modal="true" aria-labelledby="cancel-subscription-title" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <h3 id="cancel-subscription-title" className="font-semibold text-primary">Cancel your subscription?</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Paid access continues through the end of your current billing period.</p>
            <div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void runSubscriptionAction('cancel')} className="btn-primary">Confirm cancellation</button><button type="button" onClick={() => setCancelPrompt(false)} className="btn-outline">Keep my plan</button></div>
          </div>}
        </> : <p className="mt-3 text-sm text-on-surface-variant" aria-live="polite">Loading billing details…</p>}
      </section>}

      <div className="mb-8 text-center">
        <p className="eyebrow text-secondary">{managementMode ? 'Plans and billing' : 'One last step'}</p>
        <h1 className="mt-2 font-headline text-4xl font-semibold text-primary">Choose your plan</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-on-surface-variant sm:text-base">Unlock more tools for your classes and community. You can always upgrade later.</p>
        {!isEducator && <p className="mx-auto mt-3 max-w-2xl rounded-xl bg-secondary-fixed/70 p-3 text-sm text-on-secondary-fixed">Plans are mainly for people who run classes and communities.</p>}
      </div>

      <section role="radiogroup" aria-label="Subscription plans" className="grid items-stretch gap-4 md:grid-cols-3">
        {enabledPlans.map((plan, index) => {
          const selected = selectedPlanId === plan.id;
          const isCurrentPlan = profilePlanMode && subscription?.planId === plan.id;
          const isDowngrade = profilePlanMode && currentPlan && plan.price < currentPlan.price;
          const actionLabel = isCurrentPlan
            ? 'Current plan'
            : isDowngrade
              ? 'Downgrade (applies at the end of the billing period)'
              : profilePlanMode && currentPlan && plan.price > currentPlan.price
                ? `Upgrade to ${plan.name}`
                : `Choose ${plan.name}`;
          const features = [
            ...(plan.id !== 'starter' ? ['Everything in the previous plan'] : []),
            'Profile and page customization, including animated profile frames',
            studentLimit(plan),
            ...(plan.features.newsBoard ? ['Create and manage a News Board'] : []),
          ];
          const order = plan.recommended ? 'order-first md:order-2' : plan.id === 'starter' ? 'md:order-1' : 'md:order-3';
          return <article key={plan.id} className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${order} ${plan.recommended ? 'border-2 border-secondary shadow-md' : selected ? 'border-2 border-secondary' : 'border-outline-variant/70'}`}>
            {plan.recommended && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-white">Most popular</span>}
            <button
              ref={(element) => { cardRefs.current[index] = element; }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${plan.name}, ${priceLabel(plan)} US dollars per month`}
              onClick={() => choosePlan(plan.id)}
              onKeyDown={(event) => handleRadioKey(event, index)}
              className="flex w-full flex-1 flex-col rounded-lg text-left outline-none focus-visible:ring-4 focus-visible:ring-secondary/30"
            >
              <span className="flex items-center justify-between">
                <span className="font-headline text-2xl font-semibold text-primary">{plan.name}</span>
                {selected && <Icon name="check_circle" fill className="text-secondary" />}
              </span>
              <span className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-bold tracking-tight text-primary">{priceLabel(plan)}</span><span className="text-sm text-on-surface-variant">/ month</span></span>
              <span className="sr-only">{plan.price} {plan.currency === 'usd' ? 'US dollars' : plan.currency.toUpperCase()} per month</span>
              <ul className="mt-6 space-y-3">
                {features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-on-surface-variant"><Icon name="check" className="shrink-0 text-secondary" /><span>{feature}</span></li>)}
              </ul>
              <span className="sr-only">Select {plan.name}</span>
            </button>
            <button
              type="button"
              disabled={isCurrentPlan}
              onClick={() => choosePlan(plan.id)}
              className="btn-outline mt-6 w-full"
            >{actionLabel}</button>
          </article>;
        })}
      </section>

      <div className="mt-8 overflow-x-auto rounded-xl border border-outline-variant/60 bg-white">
        <table className="w-full min-w-[460px] text-left text-sm">
          <caption className="sr-only">Compare subscription plan features</caption>
          <thead><tr className="border-b border-outline-variant/50"><th className="p-3 font-semibold text-primary">Compare plans</th>{enabledPlans.map((plan) => <th key={plan.id} className="p-3 text-center font-semibold text-primary">{plan.name}</th>)}</tr></thead>
          <tbody>
            <tr className="border-b border-outline-variant/30"><th scope="row" className="p-3 font-medium">Students per class</th>{enabledPlans.map((plan) => <td key={plan.id} className="p-3 text-center">{plan.limits.maxStudentsPerClass ?? 'Unlimited'}</td>)}</tr>
            <tr className="border-b border-outline-variant/30"><th scope="row" className="p-3 font-medium">Customization</th>{enabledPlans.map((plan) => <td key={plan.id} className="p-3 text-center">{plan.features.customization ? 'Included' : '—'}</td>)}</tr>
            <tr><th scope="row" className="p-3 font-medium">News Board</th>{enabledPlans.map((plan) => <td key={plan.id} className="p-3 text-center">{plan.features.newsBoard ? 'Included' : '—'}</td>)}</tr>
          </tbody>
        </table>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-sm font-medium text-on-error-container">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-secondary-fixed p-3 text-sm text-on-secondary-fixed">{notice}</p>}
      <p className="mt-4 text-center text-xs text-on-surface-variant">You can change or cancel your plan at any time. Paid subscriptions auto-renew monthly until cancelled. Taxes may apply based on your location. By continuing, you agree to our <Link to="/terms" className="underline">Terms of Service</Link>, <Link to="/privacy" className="underline">Privacy Policy</Link>, <Link to="/cancellation-policy" className="underline">cancellation policy</Link>, and <Link to="/refund-policy" className="underline">refund policy</Link>.</p>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/60 bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="mx-auto flex max-w-6xl flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          {onboardingFlow && !checkoutConfirmed && <button type="button" disabled={busy} onClick={() => void skip()} className="btn-outline min-h-11 sm:min-w-48">Skip for now</button>}
          <button type="button" disabled={busy || !selectedPlan || (profilePlanMode && selectedPlan.id === subscription?.planId)} onClick={() => void continueWithPlan()} className="btn-primary min-h-11 sm:min-w-64">
            {busy ? 'Please wait…' : selectedPlan
              ? profilePlanMode && currentPlan && selectedPlan.price > currentPlan.price
                ? `Upgrade to ${selectedPlan.name}`
                : profilePlanMode && currentPlan && selectedPlan.price < currentPlan.price
                  ? `Downgrade to ${selectedPlan.name}`
                  : profilePlanMode && selectedPlan.id === subscription?.planId
                    ? 'Current plan'
                    : `Continue with ${selectedPlan.name}`
              : 'Choose a plan to continue'}
            {!busy && selectedPlan && <Icon name="arrow_forward" />}
          </button>
          {managementMode && <button type="button" onClick={() => navigate('/')} className="btn-outline min-h-11">Done</button>}
        </div>
      </div>
    </main>
  </div>;
}
