import { create } from 'zustand';
import { getSettings, updateSettings } from '@/services/storageService';
import type { Lang } from '@/constants/i18n';

interface LanguageStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  init: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  lang: 'id',
  setLang: (lang) => {
    set({ lang });
    updateSettings({ language: lang });
  },
  init: async () => {
    const settings = await getSettings();
    set({ lang: settings.language ?? 'id' });
  },
}));
