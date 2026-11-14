import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/kvStorage';

type PreferencesState = {
  haptics: boolean;
  reduceMotion: boolean;
  showSimulatedBreakdown: boolean;
  setHaptics: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setShowSimulatedBreakdown: (value: boolean) => void;
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      haptics: true,
      reduceMotion: false,
      showSimulatedBreakdown: true,
      setHaptics: (haptics) => set({ haptics }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setShowSimulatedBreakdown: (showSimulatedBreakdown) => set({ showSimulatedBreakdown }),
    }),
    {
      name: 'bloxybox.preferences',
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ haptics, reduceMotion, showSimulatedBreakdown }) => ({ haptics, reduceMotion, showSimulatedBreakdown }),
    },
  ),
);
