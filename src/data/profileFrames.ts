import frameCatalog from '../../shared/profile-frames.json';
import { subscriptionConfig } from '../subscriptionService';
import type { AuthenticatedUser } from '../store';

export const profileFrames = frameCatalog;
export type ProfileFrameId = (typeof profileFrames)[number]['id'];

export function canUseProfileFrames(user: Pick<AuthenticatedUser, 'plan' | 'planStatus'> | null | undefined) {
  const plan = user && subscriptionConfig.plans.find((item) => item.id === user.plan);
  return Boolean(plan?.features.customization && (user?.planStatus === 'active' || user?.planStatus === 'trialing'));
}
