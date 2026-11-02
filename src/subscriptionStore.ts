import { create } from 'zustand';

import { getSubscription, type SubscriptionDetails } from './subscriptionService';

interface SubscriptionState {
  userId: string | null;
  details: SubscriptionDetails | null;
  loading: boolean;
  error: string | null;
  loadForUser: (userId: string) => Promise<void>;
  setDetails: (userId: string, details: SubscriptionDetails) => void;
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  userId: null,
  details: null,
  loading: false,
  error: null,

  loadForUser: async (userId) => {
    const current = get();
    if (current.userId === userId && (current.loading || current.details)) return;
    set({ userId, details: null, loading: true, error: null });
    try {
      const details = await getSubscription();
      if (get().userId === userId) set({ details, loading: false, error: null });
    } catch (reason) {
      if (get().userId === userId) {
        set({
          loading: false,
          error: reason instanceof Error ? reason.message : 'Unable to load subscription details.',
        });
      }
    }
  },

  setDetails: (userId, details) => set({ userId, details, loading: false, error: null }),
  clear: () => set({ userId: null, details: null, loading: false, error: null }),
}));
