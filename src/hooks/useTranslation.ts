import { translations, PRAYER_NAMES, type TranslationKey } from '@/constants/i18n';
import { useLanguageStore } from '@/stores/languageStore';

export function useTranslation() {
  const { lang, setLang } = useLanguageStore();
  const t = (key: TranslationKey): string => translations[lang][key];
  const pn = (name: string): string => PRAYER_NAMES[lang][name] ?? name;
  return { t, lang, setLang, pn };
}
