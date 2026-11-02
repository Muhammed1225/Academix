import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from './ui';
import { subscriptionConfig, trackSubscriptionEvent, type SubscriptionAnalyticsEvent } from '../subscriptionService';
import { useSubscriptionStore } from '../subscriptionStore';
import type { AuthenticatedUser } from '../store';

type PaidPlan = 'starter' | 'plus' | 'pro';
type ButtonState = 'free' | PaidPlan | 'past_due' | 'resume';

interface ButtonConfig {
  label: string;
  mobileLabel: string;
  icon: string;
  to: string;
  style: 'gold' | 'warning';
}

const profileButtonConfig: Record<ButtonState, ButtonConfig> = {
  free: {
    label: 'Get Pro / Premium subscription',
    mobileLabel: 'Upgrade plan',
    icon: 'auto_awesome',
    to: '/subscription?source=profile',
    style: 'gold',
  },
  starter: {
    label: 'Get Pro / Premium subscription',
    mobileLabel: 'Upgrade plan',
    icon: 'auto_awesome',
    to: '/subscription?source=profile',
    style: 'gold',
  },
  plus: {
    label: 'Get premium subscription',
    mobileLabel: 'Go premium',
    icon: 'workspace_premium',
    to: '/subscription?source=profile',
    style: 'gold',
  },
  pro: {
    label: 'Manage subscription',
    mobileLabel: 'Manage plan',
    icon: 'workspace_premium',
    to: '/subscription#billing',
    style: 'gold',
  },
  past_due: {
    label: 'Fix payment',
    mobileLabel: 'Fix payment',
    icon: 'warning',
    to: '/subscription#billing',
    style: 'warning',
  },
  resume: {
    label: 'Resume subscription',
    mobileLabel: 'Resume plan',
    icon: 'workspace_premium',
    to: '/subscription#billing',
    style: 'gold',
  },
};

function getButtonState(planId: string, status: string, cancelAtPeriodEnd: boolean, currentPeriodEnd?: string): ButtonState {
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  const canceledButActive = status === 'canceled' && currentPeriodEnd && Date.parse(currentPeriodEnd) > Date.now();
  if ((cancelAtPeriodEnd && (status === 'active' || status === 'trialing')) || canceledButActive) return 'resume';
  if (planId === 'starter' || planId === 'plus' || planId === 'pro') return planId;
  return 'free';
}

export function SubscriptionPlanBadge({ planId }: { planId: string }) {
  if (planId === 'pro') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F5C84B] to-[#D9A21B] px-2 py-1 text-[11px] font-bold text-[#3A2A00]">
      <Icon name="workspace_premium" className="!text-[13px]" /> Premium
    </span>;
  }
  if (planId === 'starter' || planId === 'plus') {
    return <span className="inline-flex items-center rounded-full bg-surface-container-low px-2 py-1 text-[11px] font-semibold text-on-surface-variant">
      {planId === 'starter' ? 'Starter' : 'Pro'}
    </span>;
  }
  return null;
}

export default function SubscriptionButton({ user }: { user: AuthenticatedUser }) {
  const details = useSubscriptionStore((state) => state.details);
  const loading = useSubscriptionStore((state) => state.loading);
  const error = useSubscriptionStore((state) => state.error);
  const userId = useSubscriptionStore((state) => state.userId);
  const loadForUser = useSubscriptionStore((state) => state.loadForUser);

  useEffect(() => {
    if (userId !== user.id || (!details && !loading && !error)) void loadForUser(user.id);
  }, [details, error, loadForUser, loading, user.id, userId]);

  if (loading || userId !== user.id) {
    return <div className="h-10 w-full animate-pulse rounded-lg bg-surface-container-high lg:w-56" role="status" aria-label="Loading subscription" />;
  }

  const currentPlan = details?.planId ?? 'free';
  const state = details ? getButtonState(details.planId, details.status, details.cancelAtPeriodEnd, details.currentPeriodEnd) : 'free';
  const config = details ? profileButtonConfig[state] : {
    label: 'Subscription',
    mobileLabel: 'Subscription',
    icon: 'payments',
    to: '/subscription#billing',
    style: 'gold' as const,
  };
  const planLabel = subscriptionConfig.plans.find((plan) => plan.id === currentPlan)?.name ?? 'Free';
  const analyticsEvent: SubscriptionAnalyticsEvent = 'profile_subscription_button_clicked';
  const ariaLabel = `${config.label}, current plan: ${planLabel}`;

  return <Link
      to={config.to}
      aria-label={ariaLabel}
      onClick={() => void trackSubscriptionEvent(analyticsEvent, currentPlan)
        .catch((reason: unknown) => console.error('Unable to record subscription button click:', reason))}
      className={`subscription-gold-button ${config.style === 'warning' ? 'subscription-gold-button-warning' : ''}`}
    >
      <Icon name={config.icon} className="shrink-0 !text-[18px]" />
      <span className="hidden lg:inline">{config.label}</span>
      <span className="lg:hidden">{config.mobileLabel}</span>
    </Link>;
}
