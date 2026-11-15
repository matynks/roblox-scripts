import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Device-local preferences (never sent to the server). */
interface Prefs {
  theme: 'system' | 'dark' | 'light';
  haptics: boolean;
  sound: boolean;
  reduceMotion: boolean;
  set: (patch: Partial<Omit<Prefs, 'set'>>) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      theme: 'dark',
      haptics: true,
      sound: true,
      reduceMotion: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'blockora.prefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set, ...rest }) => rest,
    },
  ),
);
