import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (v: boolean) => void;
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  onboardingCompleted: typeof window !== 'undefined'
    ? localStorage.getItem('onboarding_completed') === 'true'
    : false,
  setOnboardingCompleted: (v) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_completed', String(v));
    }
    set({ onboardingCompleted: v });
  },
  activeTab: 0,
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
