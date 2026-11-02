import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type FormEvent } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { BrandMark, Icon } from '../components/ui';
import { createNotification } from '../notificationsService';
import {
  createCheckoutPaymentIntent,
  getSubscription,
  subscriptionConfig,
  trackSubscriptionEvent,
  type CheckoutPaymentIntent,
  type SubscriptionDetails,
  type SubscriptionPlan,
} from '../subscriptionService';
import { useApp } from '../store';
import { useSubscriptionStore } from '../subscriptionStore';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripeTestMode = import.meta.env.DEV || import.meta.env.VITE_STRIPE_TEST_MODE === 'true';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const billingCountries = [
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['GB', 'United Kingdom'],
  ['AU', 'Australia'],
  ['NZ', 'New Zealand'],
  ['IE', 'Ireland'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['IN', 'India'],
  ['AE', 'United Arab Emirates'],
  ['OTHER', 'Other country'],
];

function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount);
}

function billingCountryName(country: string) {
  return new Intl.DisplayNames(undefined, { type: 'region' }).of(country) ?? country;
}

function friendlyPaymentError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('insufficient')) return 'There are insufficient funds on this card. Try another card.';
  if (normalized.includes('expired')) return 'This card has expired. Use a different card.';
  if (normalized.includes('security code') || normalized.includes('cvc')) return 'The security code is incorrect. Check it and try again.';
  if (normalized.includes('authentication')) return 'Card authentication could not be completed. Try again or use another card.';
  if (normalized.includes('declined')) return 'Your card was declined. Try another card or contact your bank.';
  if (normalized.includes('network') || normalized.includes('fetch')) return 'A network error interrupted checkout. Check your connection and retry.';
  return message || 'Payment could not be completed. Try another card.';
}

function SuccessCheckmark() {
  return <div className="payment-success-mark" aria-hidden="true">
    <svg viewBox="0 0 96 96" role="presentation">
      <circle className="payment-success-ring" cx="48" cy="48" r="44" />
      <circle className="payment-success-circle" cx="48" cy="48" r="36" />
      <path className="payment-success-check" d="M29 49l13 13 26-28" />
    </svg>
  </div>;
}

function PaymentForm({
  plan,
  amountDue,
  name,
  country,
  postalCode,
  disabled,
  onProcessing,
  onFailure,
  onSuccess,
}: {
  plan: SubscriptionPlan;
  amountDue: number;
  name: string;
  country: string;
  postalCode: string;
  disabled: boolean;
  onProcessing: (processing: boolean) => void;
  onFailure: (message: string) => void;
  onSuccess: () => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [elementError, setElementError] = useState('');
  const [paymentMethodSaved, setPaymentMethodSaved] = useState(true);
  const clearElementError: NonNullable<ComponentProps<typeof PaymentElement>['onChange']> = () => setElementError('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || disabled) return;
    if (!paymentMethodSaved) {
      setElementError('A saved payment method is required for monthly subscription renewals.');
      return;
    }

    onProcessing(true);
    setElementError('');
    void trackSubscriptionEvent('payment_submitted', plan.id).catch((reason: unknown) => console.error('Unable to record payment submission:', reason));
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?plan=${encodeURIComponent(plan.id)}&payment=return`,
          payment_method_data: {
            billing_details: {
              name,
              address: {
                country,
                postal_code: postalCode,
              },
            },
          },
        },
        redirect: 'if_required',
      });
      if (result.error) {
        const message = friendlyPaymentError(result.error.message ?? '');
        setElementError(message);
        onFailure(message);
        return;
      }
      await onSuccess();
    } catch (reason) {
      const message = friendlyPaymentError(reason instanceof Error ? reason.message : '');
      setElementError(message);
      onFailure(message);
    } finally {
      onProcessing(false);
    }
  };

  return <form onSubmit={(event) => void submit(event)} className="space-y-5">
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-primary" htmlFor="cardholder-name">Cardholder name</label>
      <input id="cardholder-name" value={name} readOnly autoComplete="cc-name" className="input bg-surface-container-low" aria-label="Cardholder name" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-primary" htmlFor="payment-billing-country">Billing country</label>
        <input id="payment-billing-country" value={billingCountryName(country)} readOnly autoComplete="country" className="input bg-surface-container-low" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-primary" htmlFor="payment-postal-code">Postal code</label>
        <input id="payment-postal-code" value={postalCode} readOnly autoComplete="postal-code" className="input bg-surface-container-low" />
      </div>
    </div>
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-primary">Card details</label>
      <div id="stripe-payment-element" aria-describedby={elementError ? 'stripe-payment-error' : undefined} aria-disabled={disabled} className={`rounded-xl border border-outline-variant/70 bg-white p-3 focus-within:ring-2 focus-within:ring-secondary/30 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
        <PaymentElement
          onChange={clearElementError}
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>
      <p className="mt-1 text-xs text-on-surface-variant">Card number, expiry, and security code are entered securely with Stripe.</p>
    </div>
    <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3">
      <input
        id="save-card"
        type="checkbox"
        checked={paymentMethodSaved}
        disabled={disabled}
        onChange={(event) => {
          setPaymentMethodSaved(event.target.checked);
          setElementError('');
        }}
        className="mt-0.5 h-4 w-4 accent-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      />
      <label htmlFor="save-card" className="text-sm text-on-surface-variant">Save this card for monthly renewals (required for subscription billing).</label>
    </div>
    {elementError && <p id="stripe-payment-error" role="alert" aria-live="polite" className="flex items-start gap-2 rounded-lg bg-error-container p-3 text-sm text-on-error-container">
      <Icon name="error" className="shrink-0" />{elementError}
    </p>}
    <p className="rounded-lg bg-secondary-fixed/60 p-3 text-xs leading-relaxed text-on-secondary-fixed">
      This subscription renews automatically every month until cancelled. You can cancel at any time from billing settings.
    </p>
    <button id="stripe-pay-submit" type="submit" disabled={!stripe || !elements || disabled} className="btn-primary min-h-12 w-full text-base">
      {disabled ? <><span className="payment-spinner" aria-hidden="true" />Processing...</> : <><Icon name="lock" />Pay {money(amountDue / 100, plan.currency)} and subscribe</>}
    </button>
    <p className="text-center text-xs leading-relaxed text-on-surface-variant">
      Secured payment. Your card details are encrypted by Stripe and never stored on Academix servers. Taxes are calculated for your billing location.
      {' '}By paying, you agree to our <Link to="/terms" className="underline">Terms</Link>, <Link to="/privacy" className="underline">Privacy Policy</Link>, and <Link to="/cancellation-policy" className="underline">Cancellation Policy</Link>.
    </p>
  </form>;
}

export default function CheckoutPage() {
  const user = useApp((state) => state.user);
  const authChecked = useApp((state) => state.authChecked);
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const location = useLocation();
  const navigate = useNavigate();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const planId = search.get('plan') ?? '';
  const plan = subscriptionConfig.plans.find((item) => item.id === planId && item.enabled);
  const onboardingFlow = search.get('flow') === 'onboarding';
  const setSharedSubscription = useSubscriptionStore((state) => state.setDetails);
  const requestId = useRef('');
  const paymentConfirmed = useRef(false);
  const viewedCheckout = useRef(false);
  const failureNotificationSent = useRef(false);
  const mounted = useRef(true);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionDetails | null>(null);
  const [intent, setIntent] = useState<CheckoutPaymentIntent | null>(null);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billingName, setBillingName] = useState(user?.name ?? '');
  const [country, setCountry] = useState('US');
  const [otherCountryCode, setOtherCountryCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [activationDelayed, setActivationDelayed] = useState(false);
  const [success, setSuccess] = useState<SubscriptionDetails | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  useEffect(() => {
    if (user && !billingName) setBillingName(user.name);
  }, [billingName, user]);

  const finishConfirmedPayment = useCallback(async () => {
    if (!plan || paymentConfirmed.current) return;
    paymentConfirmed.current = true;
    setConfirming(true);
    setError('');
    const startedAt = Date.now();
    let activeSubscription: SubscriptionDetails | null = null;
    while (mounted.current) {
      try {
        const current = await getSubscription();
        if (current.planId === plan.id && ['active', 'trialing'].includes(current.status)) {
          activeSubscription = current;
          break;
        }
      } catch (reason) {
        console.error('Unable to refresh subscription while confirming payment:', reason);
      }
      if (Date.now() - startedAt >= 10_000) setActivationDelayed(true);
      await new Promise((resolve) => window.setTimeout(resolve, 1800));
    }

    if (!activeSubscription || !mounted.current) return;
    setSharedSubscription(user?.id ?? '', activeSubscription);
    if (user) sessionStorage.removeItem(`academix.checkout.${user.id}.${plan.id}`);
    if (user) {
      setAuthenticatedUser({
        ...user,
        plan: activeSubscription.planId as 'starter' | 'plus' | 'pro',
        planStatus: activeSubscription.status as 'active' | 'trialing',
      });
      void createNotification(user, {
        id: `payment-success-${activeSubscription.subscriptionId ?? plan.id}`,
        type: 'system',
        category: 'payment_successful',
        senderName: 'Payment successful',
        text: `You’re now on ${plan.name}.`,
        href: '/subscription#billing',
      }).catch((reason: unknown) => console.error('Unable to create subscription notification:', reason));
    }
    setSuccess(activeSubscription);
    setConfirming(false);
  }, [plan, setAuthenticatedUser, setSharedSubscription, user]);

  useEffect(() => {
    mounted.current = true;
    if (!authChecked) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!plan) {
      navigate('/subscription', { replace: true });
      return;
    }
    if (useSubscriptionStore.getState().userId !== user.id) useSubscriptionStore.getState().loadForUser(user.id);
    if (!viewedCheckout.current) {
      viewedCheckout.current = true;
      void trackSubscriptionEvent('checkout_viewed', plan.id).catch((reason: unknown) => console.error('Unable to record checkout view:', reason));
    }
    let active = true;
    void getSubscription().then((current) => {
      if (!active) return;
      setCurrentSubscription(current);
      const attemptedCheckout = sessionStorage.getItem(`academix.checkout.${user.id}.${plan.id}`);
      const failedAuthentication = search.get('payment') === 'return' && search.get('redirect_status') &&
        search.get('redirect_status') !== 'succeeded';
      if (!failedAuthentication && attemptedCheckout && current.planId === plan.id && ['active', 'trialing'].includes(current.status)) {
        void finishConfirmedPayment();
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your current subscription.');
    });
    if (search.get('payment') === 'return' && search.get('redirect_status') &&
      search.get('redirect_status') !== 'succeeded') {
      setError('Card authentication was not completed. Try again or use another card.');
      void trackSubscriptionEvent('payment_failed', plan.id).catch((reason: unknown) => console.error('Unable to record authentication failure:', reason));
    } else if (search.get('payment') === 'return') {
      void finishConfirmedPayment();
    }
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [authChecked, finishConfirmedPayment, navigate, plan, search, user]);

  useEffect(() => {
    return () => {
      if (!paymentConfirmed.current && plan) {
        void trackSubscriptionEvent('checkout_abandoned', plan.id).catch((reason: unknown) => console.error('Unable to record abandoned checkout:', reason));
      }
    };
  }, [plan]);

  const startCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!plan || starting || intent) return;
    if (!billingName.trim()) {
      setValidationError('Enter the name shown on your card.');
      return;
    }
    const billingCountry = country === 'OTHER' ? otherCountryCode.trim().toUpperCase() : country;
    if (!/^[A-Z]{2}$/.test(billingCountry)) {
      setValidationError('Enter a valid two-letter billing country code.');
      return;
    }
    if (!postalCode.trim()) {
      setValidationError('Enter your billing postal code.');
      return;
    }
    if (!stripePublishableKey) {
      setError('Secure card entry is not configured. Please contact support or try again later.');
      return;
    }

    setStarting(true);
    setValidationError('');
    setError('');
    try {
      const storageKey = `academix.checkout.${user?.id}.${plan.id}`;
      requestId.current = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      sessionStorage.setItem(storageKey, requestId.current);
      const created = await createCheckoutPaymentIntent(plan.id, requestId.current, {
        cardholderName: billingName,
        country: billingCountry,
        postalCode,
      });
      if (created.mode === 'scheduled') {
        paymentConfirmed.current = true;
        setScheduledAt(created.effectiveAt ?? '');
        return;
      }
      setIntent(created);
      if (!created.clientSecret) {
        setConfirming(true);
        void finishConfirmedPayment();
      }
    } catch (reason) {
      const message = friendlyPaymentError(reason instanceof Error ? reason.message : '');
      setError(message);
      void trackSubscriptionEvent('payment_failed', plan.id).catch((analyticsError: unknown) => console.error('Unable to record failed payment attempt:', analyticsError));
      if (user && !failureNotificationSent.current) {
        failureNotificationSent.current = true;
        void createNotification(user, {
          id: `payment-failed-${plan.id}-${Date.now()}`,
          type: 'system',
          category: 'payment_failed',
          senderName: 'Payment failed',
          text: `Your ${plan.name} subscription was not charged. Try another card at checkout.`,
          href: '/subscription#billing',
        }).catch((notificationError: unknown) => console.error('Unable to create payment-failed notification:', notificationError));
      }
    } finally {
      setStarting(false);
    }
  };

  if (!authChecked || !user || !plan) return <main className="p-8 text-center" aria-live="polite">Loading checkout…</main>;
  const currentPlan = subscriptionConfig.plans.find((item) => item.id === currentSubscription?.planId);
  const billingCountry = country === 'OTHER' ? otherCountryCode.trim().toUpperCase() : country;
  const prorationCredit = intent?.prorationCredit ?? 0;
  const amountDue = scheduledAt ? 0 : intent?.amountDue ?? Math.round(plan.price * 100);
  const taxAmount = scheduledAt ? 0 : intent?.taxAmount ?? 0;
  const renewalDate = intent?.currentPeriodEnd ?? currentSubscription?.currentPeriodEnd;
  const backToPlans = onboardingFlow ? '/subscription?flow=onboarding' : '/subscription?source=profile';

  return <div className="min-h-screen bg-surface px-4 pb-36 pt-5 sm:px-8 sm:pb-10">
    <header className="mx-auto flex max-w-6xl items-center justify-between">
      <Link to="/" aria-label="Academix home"><BrandMark /></Link>
      {stripeTestMode && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Test mode</span>}
      <Link to={backToPlans} className="btn-ghost"><Icon name="arrow_back" /> Cancel</Link>
    </header>

    <main className="mx-auto mt-8 max-w-6xl">
      <h1 className="font-headline text-3xl font-semibold text-primary sm:text-4xl">Secure checkout</h1>
      <p className="mt-2 text-sm text-on-surface-variant">Finish setting up your {plan.name} subscription.</p>
      <details className="mt-5 rounded-xl border border-outline-variant/60 bg-white p-4 shadow-sm md:hidden" open={summaryExpanded} onToggle={(event) => setSummaryExpanded(event.currentTarget.open)}>
        <summary className="cursor-pointer list-none font-semibold text-primary">Order summary · {money(amountDue / 100, plan.currency)}</summary>
        <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
          <p>{plan.name} · billed monthly</p>
          {prorationCredit > 0 && <p>Credit for unused time: −{money(prorationCredit / 100, plan.currency)}</p>}
          <p>Tax: {taxAmount ? money(taxAmount / 100, plan.currency) : 'Calculated for your billing location'}</p>
          <p className="font-semibold text-primary">Total due today: {money(amountDue / 100, plan.currency)}</p>
        </div>
      </details>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="hidden rounded-2xl border border-outline-variant/60 bg-white p-6 shadow-sm md:block">
          <h2 className="font-headline text-xl font-semibold text-primary">Order summary</h2>
          <div className="mt-5 rounded-xl bg-surface-container-low p-4">
            <p className="text-sm text-on-surface-variant">{plan.name} subscription</p>
            <p className="mt-1 text-2xl font-bold text-primary">{money(plan.price, plan.currency)} <span className="text-sm font-normal text-on-surface-variant">/ month</span></p>
            <p className="mt-1 text-xs text-on-surface-variant">Billed monthly. Renews automatically until cancelled.</p>
          </div>
          {currentPlan && currentPlan.id !== plan.id && <p className="mt-4 text-sm text-on-surface-variant">
            {plan.price > currentPlan.price ? 'Upgrade with prorated billing' : `Downgrade from ${currentPlan.name} at period end`}
          </p>}
          <dl className="mt-5 space-y-3 text-sm">
            {prorationCredit > 0 && <div className="flex justify-between gap-4 text-on-surface-variant"><dt>Credit for unused time</dt><dd>−{money(prorationCredit / 100, plan.currency)}</dd></div>}
            <div className="flex justify-between gap-4 text-on-surface-variant"><dt>Tax</dt><dd>{taxAmount ? money(taxAmount / 100, plan.currency) : 'Calculated for your billing location'}</dd></div>
            <div className="flex justify-between gap-4 border-t border-outline-variant/60 pt-3 font-semibold text-primary"><dt>Total due today</dt><dd>{money(amountDue / 100, plan.currency)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-on-surface-variant">Next renewal: {renewalDate ? new Date(renewalDate).toLocaleDateString() : 'one month from activation'}</p>
          <Link to={backToPlans} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline"><Icon name="arrow_back" /> Change plan</Link>
        </aside>

        <section className="rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="payment-title">
          {success ? <div className="payment-success-content text-center" role="status" aria-live="polite">
            <SuccessCheckmark />
            <h2 className="mt-4 font-headline text-3xl font-semibold text-primary">Payment successful</h2>
            <p className="mt-2 text-on-surface-variant">Welcome to {plan.name}! Your subscription is now active.</p>
            <dl className="mx-auto mt-5 max-w-sm space-y-2 rounded-xl bg-surface-container-low p-4 text-left text-sm">
              <div className="flex justify-between gap-4"><dt>Plan</dt><dd className="font-semibold">{plan.name}</dd></div>
              <div className="flex justify-between gap-4"><dt>Amount paid</dt><dd className="font-semibold">{money((success.invoices[0]?.amount ?? amountDue) / 100, plan.currency)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Next billing date</dt><dd className="font-semibold">{success.currentPeriodEnd ? new Date(success.currentPeriodEnd).toLocaleDateString() : 'One month from today'}</dd></div>
              {success.paymentMethodLast4 && <div className="flex justify-between gap-4"><dt>Card</dt><dd className="font-semibold">{success.paymentMethodBrand ? `${success.paymentMethodBrand} ` : ''}ending in {success.paymentMethodLast4}</dd></div>}
            </dl>
            <p className="mt-3 text-xs text-on-surface-variant">A receipt was sent to {user.email}.</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Link to="/profile" className="btn-primary min-h-11">Go to my profile</Link>
              <Link to="/subscription#billing" className="btn-outline min-h-11">View billing details</Link>
            </div>
          </div> : scheduledAt ? <div className="text-center" role="status" aria-live="polite">
            <Icon name="event_available" className="!text-5xl text-secondary" />
            <h2 className="mt-3 font-headline text-2xl font-semibold text-primary">Plan change scheduled</h2>
            <p className="mt-2 text-sm text-on-surface-variant">{plan.name} will begin {new Date(scheduledAt).toLocaleDateString()}. Your current plan stays active until then.</p>
            <Link to="/subscription#billing" className="btn-primary mt-5">View billing details</Link>
          </div> : confirming ? <div className="py-12 text-center" role="status" aria-live="polite">
            <span className="payment-spinner payment-spinner-large" aria-hidden="true" />
            <h2 className="mt-4 font-headline text-2xl font-semibold text-primary">{activationDelayed ? 'Payment received, activating your plan…' : 'Confirming your payment…'}</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Keep this page open while Stripe confirms your subscription.</p>
          </div> : <div className="payment-form-content">
            <h2 id="payment-title" className="font-headline text-xl font-semibold text-primary">Payment details</h2>
            {!intent ? <form onSubmit={(event) => void startCheckout(event)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="billing-name" className="mb-1.5 block text-sm font-semibold text-primary">Cardholder name</label>
                <input id="billing-name" value={billingName} onChange={(event) => setBillingName(event.target.value)} autoComplete="cc-name" aria-invalid={validationError.includes('name')} aria-describedby={validationError.includes('name') ? 'billing-name-error' : undefined} className={`input ${validationError.includes('name') ? 'border-red-600' : ''}`} />
                {validationError.includes('name') && <p id="billing-name-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-700"><Icon name="error" /> {validationError}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="billing-country" className="mb-1.5 block text-sm font-semibold text-primary">Billing country</label>
                  <select id="billing-country" value={country} onChange={(event) => setCountry(event.target.value)} autoComplete="country" aria-invalid={validationError.includes('country')} aria-describedby={validationError.includes('country') ? 'billing-country-error' : undefined} className={`input ${validationError.includes('country') ? 'border-red-600' : ''}`}>
                    {billingCountries.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  </select>
                  {country === 'OTHER' && <input
                    value={otherCountryCode}
                    onChange={(event) => setOtherCountryCode(event.target.value.slice(0, 2).toUpperCase())}
                    aria-label="Two-letter billing country code"
                    aria-invalid={validationError.includes('country')}
                    aria-describedby={validationError.includes('country') ? 'billing-country-error' : undefined}
                    autoComplete="country"
                    placeholder="2-letter country code"
                    maxLength={2}
                    className={`input mt-2 ${validationError.includes('country') ? 'border-red-600' : ''}`}
                  />}
                  {validationError.includes('country') && <p id="billing-country-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-700"><Icon name="error" /> {validationError}</p>}
                </div>
                <div>
                  <label htmlFor="billing-postal" className="mb-1.5 block text-sm font-semibold text-primary">Postal code</label>
                  <input id="billing-postal" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} autoComplete="postal-code" aria-invalid={validationError.includes('postal')} aria-describedby={validationError.includes('postal') ? 'billing-postal-error' : undefined} className={`input ${validationError.includes('postal') ? 'border-red-600' : ''}`} />
                  {validationError.includes('postal') && <p id="billing-postal-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-700"><Icon name="error" /> {validationError}</p>}
                </div>
              </div>
              {error && <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container"><Icon name="error" /> {error}</p>}
              <button type="submit" disabled={starting} className="btn-primary hidden min-h-12 w-full md:flex">
                {starting ? <><span className="payment-spinner" aria-hidden="true" />Preparing secure payment…</> : <><Icon name="lock" />Continue to secure payment</>}
              </button>
              <p className="text-center text-xs text-on-surface-variant">Card details are collected by Stripe and never pass through Academix servers.</p>
            </form> : intent.clientSecret && stripePromise ? <div className="mt-5">
              <Elements
                key={intent.clientSecret}
                stripe={stripePromise}
                options={{
                  clientSecret: intent.clientSecret,
                  appearance: { theme: 'stripe', variables: { colorPrimary: '#0B5BD3', borderRadius: '10px', fontFamily: 'Plus Jakarta Sans, sans-serif' } },
                }}
              >
                <PaymentForm
                  plan={plan}
                  amountDue={amountDue}
                  name={billingName}
                  country={billingCountry}
                  postalCode={postalCode}
                  disabled={processing}
                  onProcessing={setProcessing}
                  onFailure={(message) => {
                    setError(message);
                    void trackSubscriptionEvent('payment_failed', plan.id).catch((reason: unknown) => console.error('Unable to record failed payment:', reason));
                    if (!failureNotificationSent.current) {
                      failureNotificationSent.current = true;
                      void createNotification(user, {
                        id: `payment-failed-${plan.id}-${Date.now()}`,
                        type: 'system',
                        category: 'payment_failed',
                        senderName: 'Payment failed',
                        text: `Your ${plan.name} subscription was not charged. Try another card at checkout.`,
                        href: '/subscription#billing',
                      }).catch((reason: unknown) => console.error('Unable to create payment-failed notification:', reason));
                    }
                  }}
                  onSuccess={finishConfirmedPayment}
                />
              </Elements>
              {error && <button type="button" onClick={() => setError('')} className="btn-outline mt-3 w-full">Retry payment</button>}
              <button type="button" disabled={processing} onClick={() => setIntent(null)} className="btn-ghost mt-3 w-full">Edit billing details</button>
            </div> : <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error || 'Secure card entry is unavailable. Please contact support.'}</p>}
            <div className="mt-5 flex items-center justify-center gap-2 border-t border-outline-variant/50 pt-4 text-xs text-on-surface-variant"><Icon name="lock" /> Secured payment · Powered by Stripe</div>
          </div>}
        </section>
      </div>
      {error && !success && !confirming && intent && <p role="alert" className="mx-auto mt-4 max-w-xl rounded-lg bg-error-container p-3 text-center text-sm text-on-error-container">{error}</p>}
      <Link to={backToPlans} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline md:hidden"><Icon name="arrow_back" /> Change plan</Link>
    </main>
    {!success && !scheduledAt && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/60 bg-white/95 p-3 shadow-lg backdrop-blur md:hidden" style={{ paddingBottom: 'calc(.75rem + env(safe-area-inset-bottom))' }}>
      <p className="mb-2 text-center text-xs text-on-surface-variant">Total due today: {money(amountDue / 100, plan.currency)}</p>
      {intent?.clientSecret && <p className="text-center text-sm font-semibold text-primary">Use the secure payment button above</p>}
      {!intent && <button type="button" disabled={starting} onClick={() => {
        const form = document.querySelector<HTMLFormElement>('.payment-form-content form');
        form?.requestSubmit();
      }} className="btn-primary min-h-11 w-full">{starting ? 'Preparing secure payment…' : `Continue · ${money(amountDue / 100, plan.currency)}`}</button>}
      {intent?.clientSecret && <button type="button" disabled={processing} onClick={() => {
        document.querySelector<HTMLFormElement>('.payment-form-content form')?.requestSubmit();
      }} className="btn-primary min-h-11 w-full">{processing ? 'Processing…' : `Pay ${money(amountDue / 100, plan.currency)} and subscribe`}</button>}
    </div>}
  </div>;
}
