import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { LogoSvgIcon } from '@/components/LogoSvgIcon';
import { SURAH_LIST, SurahMeta } from '@/constants/surah';
import { JUZ_LIST, type JuzMeta } from '@/constants/juz';
import {
  ARABIC_SCRIPTS,
  ArabicScript,
  DEFAULT_ARABIC_SCRIPT,
  fetchChapterNameTranslations,
  normalizeArabicScript,
} from '@/services/quranService';
import {
  getItem,
  setItem,
  getBookmarks,
  removeBookmark,
  getLastRead,
  type BookmarkItem,
  type LastReadData,
} from '@/services/storageService';

type DisplayMode = 'normal' | 'tajweed' | 'pemula';
type BrowseMode = 'surah' | 'juz';

const STORAGE_KEY = 'muslimmate_quran_prefs';

interface QuranPrefs {
  script: ArabicScript;
  displayMode: DisplayMode;
  fontSize: number;
  showTranslation: boolean;
}

const DEFAULT_PREFS: QuranPrefs = {
  script: DEFAULT_ARABIC_SCRIPT,
  displayMode: 'normal',
  fontSize: 26,
  showTranslation: true,
};

const MODE_OPTIONS: {
  id: DisplayMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  color: string;
}[] = [
  { id: 'normal',  icon: 'book-outline',         label: 'Normal',  desc: 'Standar + bookmark',  color: '#10B981' },
  { id: 'tajweed', icon: 'color-palette-outline', label: 'Tajwid',  desc: 'Warna hukum tajwid',  color: '#7B1FA2' },
  { id: 'pemula',  icon: 'school-outline',        label: 'Belajar', desc: 'Kata per kata + latin', color: '#F59E0B' },
];

const ARABIC_FONT_MIN = 18;
const ARABIC_FONT_MAX = 40;
const ARABIC_FONT_PREVIEW_TEXT = '\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650';
const ARABIC_FONT_FAMILY_WEB = "'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', 'Traditional Arabic', 'Times New Roman', serif";
const ARABIC_FONT_FAMILY_DEFAULT = Platform.select({
  ios: 'Geeza Pro',
  android: 'Noto Naskh Arabic',
  web: ARABIC_FONT_FAMILY_WEB,
  default: 'serif',
}) as string;
const getArabicFontFamily = (activeScript: ArabicScript): string => {
  if (Platform.OS === 'web') return ARABIC_FONT_FAMILY_WEB;
  if (Platform.OS === 'ios') return 'Geeza Pro';
  if (Platform.OS === 'android') {
    if (activeScript === 'indopak') return 'Noto Nastaliq Urdu';
    return 'Noto Naskh Arabic';
  }
  return ARABIC_FONT_FAMILY_DEFAULT;
};

const BROWSE_OPTIONS: { id: BrowseMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { id: 'surah', icon: 'book-outline', label: 'Surah' },
  { id: 'juz', icon: 'library-outline', label: 'Juz' },
];

const SURAH_BY_NUMBER = new Map<number, SurahMeta>(SURAH_LIST.map(s => [s.number, s]));
const SURAH_AYAH_COUNT = new Map<number, number>(SURAH_LIST.map(s => [s.number, s.ayahCount]));

const countAyahInRange = (range: JuzMeta): number => {
  if (range.startSurah === range.endSurah) {
    return Math.max(0, range.endAyah - range.startAyah + 1);
  }
  let total = 0;
  const startMax = SURAH_AYAH_COUNT.get(range.startSurah) ?? range.startAyah;
  total += Math.max(0, startMax - range.startAyah + 1);
  for (let surahNo = range.startSurah + 1; surahNo < range.endSurah; surahNo += 1) {
    total += SURAH_AYAH_COUNT.get(surahNo) ?? 0;
  }
  total += range.endAyah;
  return total;
};

export default function QuranScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();

  const [search, setSearch] = useState('');
  const [chapterTranslations, setChapterTranslations] = useState<Record<number, string>>({});
  const [browseMode, setBrowseMode] = useState<BrowseMode>('surah');
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarkHistory, setShowBookmarkHistory] = useState(false);
  const [bookmarkHistory, setBookmarkHistory] = useState<BookmarkItem[]>([]);
  const [lastRead, setLastRead] = useState<LastReadData | null>(null);

  const [script, setScript]               = useState<ArabicScript>(DEFAULT_PREFS.script);
  const arabicFontFamily = getArabicFontFamily(script);
  const [displayMode, setDisplayMode]     = useState<DisplayMode>(DEFAULT_PREFS.displayMode);
  const [fontSize, setFontSize]           = useState(DEFAULT_PREFS.fontSize);
  const [showTranslation, setShowTranslation] = useState(DEFAULT_PREFS.showTranslation);

  useEffect(() => {
    getItem<QuranPrefs>(STORAGE_KEY).then(saved => {
      if (saved) {
        setScript(normalizeArabicScript(saved.script));
        setDisplayMode(saved.displayMode ?? DEFAULT_PREFS.displayMode);
        setFontSize(saved.fontSize ?? DEFAULT_PREFS.fontSize);
        setShowTranslation(saved.showTranslation ?? DEFAULT_PREFS.showTranslation);
      }
    });
    getBookmarks().then(setBookmarkHistory);
    getLastRead().then(setLastRead);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const existing = (await getItem<Record<string, unknown>>(STORAGE_KEY)) ?? {};
      if (!active) return;
      await setItem(STORAGE_KEY, { ...existing, script, displayMode, fontSize, showTranslation });
    })();
    return () => { active = false; };
  }, [script, displayMode, fontSize, showTranslation]);

  useEffect(() => {
    let active = true;
    fetchChapterNameTranslations(lang)
      .then(names => {
        if (active) setChapterTranslations(names);
      })
      .catch(() => {
        if (active) setChapterTranslations({});
      });
    return () => { active = false; };
  }, [lang]);

  useEffect(() => {
    if (!showBookmarkHistory) return;
    getBookmarks().then(setBookmarkHistory);
  }, [showBookmarkHistory]);

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return SURAH_LIST;
    const q = search.toLowerCase().trim();
    return SURAH_LIST.filter(
      s =>
        s.englishName.toLowerCase().includes(q) ||
        s.indonesianName.toLowerCase().includes(q) ||
        (chapterTranslations[s.number] ?? '').toLowerCase().includes(q) ||
        s.name.includes(search) ||
        String(s.number).startsWith(q)
    );
  }, [search, chapterTranslations]);

  const enrichJuzList = useMemo(() => {
    return JUZ_LIST.map(j => {
      const startSurah = SURAH_BY_NUMBER.get(j.startSurah);
      const endSurah = SURAH_BY_NUMBER.get(j.endSurah);
      const totalAyah = countAyahInRange(j);
      return {
        ...j,
        totalAyah,
        startSurahName: startSurah?.englishName ?? `Surah ${j.startSurah}`,
        endSurahName: endSurah?.englishName ?? `Surah ${j.endSurah}`,
        startSurahMeaning: lang === 'id'
          ? (startSurah?.indonesianName ?? '')
          : (chapterTranslations[j.startSurah] ?? ''),
        endSurahMeaning: lang === 'id'
          ? (endSurah?.indonesianName ?? '')
          : (chapterTranslations[j.endSurah] ?? ''),
      };
    });
  }, [chapterTranslations, lang]);

  const filteredJuz = useMemo(() => {
    if (!search.trim()) return enrichJuzList;
    const q = search.toLowerCase().trim();
    return enrichJuzList.filter(j => {
      const haystack = [
        `juz ${j.number}`,
        String(j.number),
        j.startSurahName,
        j.endSurahName,
        j.startSurahMeaning,
        j.endSurahMeaning,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, enrichJuzList]);

  const getSurahMeaning = (item: SurahMeta) =>
    lang === 'id' ? item.indonesianName : (chapterTranslations[item.number] ?? '');

  const getModeTitle = (id: DisplayMode) => {
    if (id === 'tajweed') return t('mode_tajweed');
    if (id === 'pemula') return t('mode_beginner');
    return t('mode_normal');
  };

  const getModeDesc = (id: DisplayMode) => {
    if (id === 'tajweed') return t('mode_tajweed_desc');
    if (id === 'pemula') return t('mode_beginner_desc');
    return t('mode_normal_desc');
  };

  const openReader = (surahNumber: number, startAyah = 1) => {
    router.push({
      pathname: '/quran/[surahId]',
      params: {
        surahId: String(surahNumber),
        script,
        mode: displayMode,
        fontSize: String(fontSize),
        showTranslation: showTranslation ? 'true' : 'false',
        startAyah: String(Math.max(1, startAyah)),
      },
    } as any);
  };

  const openSurah = (item: SurahMeta) => openReader(item.number, 1);

  const openJuz = (item: JuzMeta) => {
    router.push({
      pathname: '/quran/[surahId]',
      params: {
        surahId: String(item.startSurah),
        script,
        mode: displayMode,
        fontSize: String(fontSize),
        showTranslation: showTranslation ? 'true' : 'false',
        startAyah: String(Math.max(1, item.startAyah)),
        juz: String(item.number),
        juzStartSurah: String(item.startSurah),
        juzStartAyah: String(item.startAyah),
        juzEndSurah: String(item.endSurah),
        juzEndAyah: String(item.endAyah),
      },
    } as any);
  };

  const groupedBookmarks = useMemo(() => {
    const out = new Map<string, BookmarkItem[]>();
    bookmarkHistory.forEach(item => {
      const kind = item.kind ?? (item.ayahNumber === 0 ? 'surah' : 'ayah');
      const label = item.groupName?.trim() || (kind === 'surah' ? t('favorite_surah') : t('favorite_ayah'));
      if (!out.has(label)) out.set(label, []);
      out.get(label)!.push(item);
    });
    return Array.from(out.entries()).map(([groupName, items]) => ({ groupName, items }));
  }, [bookmarkHistory, t]);

  const openBookmarkTarget = (bookmark: BookmarkItem) => {
    setShowBookmarkHistory(false);
    openReader(bookmark.surahNumber, Math.max(1, bookmark.ayahNumber || 1));
  };

  const deleteBookmarkItem = async (bookmark: BookmarkItem) => {
    await removeBookmark(bookmark.surahNumber, bookmark.ayahNumber, bookmark.kind);
    const refreshed = await getBookmarks();
    setBookmarkHistory(refreshed);
  };

  const renderSurah = ({ item }: { item: SurahMeta }) => (
    <TouchableOpacity
      onPress={() => openSurah(item)}
      style={[styles.surahCard, { backgroundColor: C.surface, borderColor: C.border }]}
      activeOpacity={0.78}
    >
      <View style={styles.numBadge}>
        <View style={styles.numOrnament}>
          <View style={[styles.numDiamondOuter, { borderColor: C.primary, backgroundColor: `${C.primary}12` }]} />
          <View style={[styles.numDiamondInner, { borderColor: `${C.primary}90` }]} />
          <Text style={[styles.numBadgeText, { color: C.primary }]}>{item.number}</Text>
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.1 }}>{item.englishName}</Text>
        <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {getSurahMeaning(item) ? `${getSurahMeaning(item)} · ` : ''}{item.ayahCount} {t('verses_unit')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={[styles.surahTypePill, {
            backgroundColor: item.type === 'Makkiyyah' ? `${C.gold}14` : `${C.primary}12`,
            borderColor: item.type === 'Makkiyyah' ? `${C.gold}35` : `${C.primary}30`,
          }]}>
            <Text style={{ color: item.type === 'Makkiyyah' ? C.gold : C.primary, fontSize: 9, fontWeight: '700' }}>
              {item.type === 'Makkiyyah' ? t('meccan') : t('medinan')}
            </Text>
          </View>
          <Text style={{ color: C.textMuted, fontSize: 10 }}>{t('juz_label')} {item.juz}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ color: C.text, fontSize: 22, fontFamily: arabicFontFamily, lineHeight: 34 }}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );

  const renderJuz = ({ item }: { item: (typeof enrichJuzList)[number] }) => (
    <TouchableOpacity
      onPress={() => openJuz(item)}
      style={[styles.juzCard, { backgroundColor: C.surface, borderColor: C.border }]}
      activeOpacity={0.78}
    >
      <View style={[styles.juzBadge, { backgroundColor: `${C.primary}15`, borderColor: `${C.primary}30` }]}>
        <Text style={{ color: `${C.primary}90`, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>JUZ</Text>
        <Text style={{ color: C.primary, fontSize: 22, fontWeight: '900', marginTop: -2 }}>{item.number}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
          {item.startSurahName} – {item.endSurahName}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {item.startSurahMeaning}{item.startSurah === item.endSurah ? '' : ` ${t('range_to')} ${item.endSurahMeaning}`}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <View style={[styles.surahTypePill, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}28` }]}>
            <Text style={{ color: C.primary, fontSize: 9, fontWeight: '700' }}>{item.totalAyah} {t('verses_unit')}</Text>
          </View>
          <Text style={{ color: C.textMuted, fontSize: 10 }}>
            {item.startSurah}:{item.startAyah} → {item.endSurah}:{item.endAyah}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
    </TouchableOpacity>
  );

  const SurahListHeader = () => (
    <View style={[styles.listLabelRow, { borderBottomColor: C.border }]}>
      <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>
        {search.trim() ? `${filteredSurahs.length} ${t('list_surah_results')}` : t('list_surah_count')}
      </Text>
    </View>
  );

  const JuzListHeader = () => (
    <View style={[styles.listLabelRow, { borderBottomColor: C.border }]}>
      <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>
        {search.trim() ? `${filteredJuz.length} ${t('list_juz_results')}` : t('list_juz_count')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.simpleHeader, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={[styles.quranIconBadge, { backgroundColor: `${C.primary}15`, borderColor: `${C.primary}30` }]}>
          <LogoSvgIcon name="quran" size={23} color={C.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: C.primary, fontSize: 26, fontFamily: arabicFontFamily, lineHeight: 38 }}>
            {'\u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064A\u0645'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <View style={[styles.headerPill, { backgroundColor: `${C.primary}14` }]}>
              <Text style={{ color: C.primary, fontSize: 10, fontWeight: '700' }}>114 {t('surah_label')}</Text>
            </View>
            <View style={[styles.headerPill, { backgroundColor: `${C.gold}14` }]}>
              <Text style={{ color: C.gold, fontSize: 10, fontWeight: '700' }}>30 {t('juz_label')}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowBookmarkHistory(true)}
            style={[styles.settingsBtn, { backgroundColor: C.card, borderColor: C.border }]}
          >
            <Ionicons name="bookmarks-outline" size={18} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={[styles.settingsBtn, { backgroundColor: C.card, borderColor: C.border }]}
          >
            <Ionicons name="options-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {lastRead && (
        <TouchableOpacity
          onPress={() => openReader(lastRead.surahNumber, lastRead.ayahNumber)}
          style={[styles.lastReadCard, { backgroundColor: `${C.primary}09`, borderColor: `${C.primary}28` }]}
          activeOpacity={0.82}
        >
          <View style={[styles.lastReadIcon, { backgroundColor: `${C.primary}18` }]}>
            <Ionicons name="play-circle" size={24} color={C.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: C.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>{t('last_read_surah').toUpperCase()}</Text>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
              {lastRead.surahName} · {t('verse_label')} {lastRead.ayahNumber}
            </Text>
          </View>
          <View style={[styles.lastReadContinueBtn, { backgroundColor: C.primary }]}>
            <Ionicons name="play" size={11} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.browseModeRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {BROWSE_OPTIONS.map(opt => {
          const active = browseMode === opt.id;
          const label = opt.id === 'surah' ? t('surah_label') : t('juz_label');
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setBrowseMode(opt.id)}
              style={[styles.browseModeBtn, {
                borderColor: active ? `${C.primary}60` : C.border,
                backgroundColor: active ? `${C.primary}14` : C.card,
              }]}
              activeOpacity={0.78}
            >
              <Ionicons name={opt.icon} size={14} color={active ? C.primary : C.textMuted} />
              <Text style={{ color: active ? C.primary : C.textMuted, fontSize: 12, fontWeight: '800', marginLeft: 6 }}>
                {label}
              </Text>
              {active && (
                <View style={[styles.browseModeActiveDot, { backgroundColor: C.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.searchWrap, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={[styles.searchBox, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('search_surah')}
            placeholderTextColor={C.textMuted}
            style={{ flex: 1, color: C.text, fontSize: 14, marginLeft: 10, paddingVertical: 0 }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {browseMode === 'surah' ? (
        <FlatList
          data={filteredSurahs}
          keyExtractor={item => String(item.number)}
          renderItem={renderSurah}
          ListHeaderComponent={SurahListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
        />
      ) : (
        <FlatList
          data={filteredJuz}
          keyExtractor={item => `juz-${item.number}`}
          renderItem={renderJuz}
          ListHeaderComponent={JuzListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
        />
      )}

      {/* â”€â”€ Modal History Bookmark â”€â”€ */}
      <Modal visible={showBookmarkHistory} transparent animationType="slide">
        <Pressable style={[styles.overlay, { backgroundColor: C.overlay }]} onPress={() => setShowBookmarkHistory(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: C.surface }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800' }}>{t('bookmark_title')}</Text>
                <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                  {t('bookmark_desc')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBookmarkHistory(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {bookmarkHistory.length === 0 ? (
                <View style={[styles.emptyBookmarkBox, { backgroundColor: C.card, borderColor: C.border }]}>
                  <Ionicons name="bookmark-outline" size={20} color={C.textMuted} />
                  <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, marginTop: 8, textAlign: 'center' }}>
                    {t('no_bookmarks')}
                  </Text>
                </View>
              ) : (
                groupedBookmarks.map(group => (
                  <View key={group.groupName} style={{ marginBottom: Spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="folder-open-outline" size={13} color={C.primary} />
                      <Text style={{ color: C.primary, fontSize: 12, fontWeight: '800', marginLeft: 6 }}>
                        {group.groupName}
                      </Text>
                      <Text style={{ color: C.textMuted, fontSize: 10, marginLeft: 6 }}>
                        {group.items.length} {t('item_unit')}
                      </Text>
                    </View>

                    {group.items.map((item, idx) => {
                      const isSurah = (item.kind ?? (item.ayahNumber === 0 ? 'surah' : 'ayah')) === 'surah';
                      return (
                        <View
                          key={`${item.surahNumber}-${item.ayahNumber}-${idx}`}
                          style={[styles.bookmarkRow, { backgroundColor: C.card, borderColor: C.border }]}
                        >
                          <TouchableOpacity onPress={() => openBookmarkTarget(item)} style={{ flex: 1 }}>
                            <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700' }} numberOfLines={1}>
                              {isSurah ? item.surahName : `${item.surahName} · ${t('verse_label')} ${item.ayahNumber}`}
                            </Text>
                            {!isSurah && item.translation ? (
                              <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 3 }} numberOfLines={2}>
                                {item.translation}
                              </Text>
                            ) : (
                              <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 3 }}>
                                {isSurah ? t('favorite_surah_desc') : t('favorite_ayah_desc')}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => openBookmarkTarget(item)}
                            style={[styles.bookmarkActionBtn, { borderColor: C.border }]}
                          >
                            <Ionicons name="open-outline" size={15} color={C.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => deleteBookmarkItem(item)}
                            style={[styles.bookmarkActionBtn, { borderColor: '#EF444455', backgroundColor: '#EF444414' }]}
                          >
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* â”€â”€ Modal Pengaturan Lanjutan â”€â”€ */}
      <Modal visible={showSettings} transparent animationType="slide">
        <Pressable style={[styles.overlay, { backgroundColor: C.overlay }]} onPress={() => setShowSettings(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: C.surface }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800' }}>
                    {t('settings_advanced')}
                  </Text>
                  <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                    {t('quran_settings_subtitle')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowSettings(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Mode tampilan */}
              <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{t('display_mode_label')}</Text>
              <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
                {MODE_OPTIONS.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setDisplayMode(m.id)}
                    style={[styles.optionRow, {
                      backgroundColor: displayMode === m.id ? C.primaryMuted : C.card,
                      borderColor: displayMode === m.id ? C.primary : C.border,
                    }]}
                  >
                    <View style={[styles.radio, { borderColor: displayMode === m.id ? C.primary : C.border }]}>
                      {displayMode === m.id && <View style={[styles.radioDot, { backgroundColor: C.primary }]} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name={m.icon} size={16} color={displayMode === m.id ? C.primary : C.textMuted} />
                        <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{getModeTitle(m.id)}</Text>
                      </View>
                      <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>{getModeDesc(m.id)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tulisan Arab */}
              <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{t('arabic_script_label')}</Text>
              <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
                {ARABIC_SCRIPTS.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setScript(s.id)}
                    style={[styles.optionRow, {
                      backgroundColor: script === s.id ? C.primaryMuted : C.card,
                      borderColor: script === s.id ? C.primary : C.border,
                    }]}
                  >
                    <View style={[styles.radio, { borderColor: script === s.id ? C.primary : C.border }]}>
                      {script === s.id && <View style={[styles.radioDot, { backgroundColor: C.primary }]} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>{s.name}</Text>
                        <Text style={{ color: C.text, fontSize: 20, fontFamily: getArabicFontFamily(s.id) }}>{s.sample}</Text>
                      </View>
                      <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>{s.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Ukuran Huruf */}
              <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{t('arabic_font_size_label')}</Text>
              <View style={[styles.fontRow, { backgroundColor: C.card, borderColor: C.border, marginBottom: Spacing.xl }]}>
                <TouchableOpacity
                  onPress={() => setFontSize(v => Math.max(ARABIC_FONT_MIN, v - 2))}
                  style={[styles.fontBtn, { borderColor: C.border }]}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={18} color={C.textSecondary} />
                  <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>{t('font_small')}</Text>
                </TouchableOpacity>
                <View style={[styles.fontPreview, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Text
                    style={{
                      color: C.text,
                      fontSize,
                      fontFamily: arabicFontFamily,
                      lineHeight: Math.round(fontSize * 1.8),
                      textAlign: 'center',
                    }}
                  >
                    {ARABIC_FONT_PREVIEW_TEXT}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 10 }}>{fontSize}px</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFontSize(v => Math.min(ARABIC_FONT_MAX, v + 2))}
                  style={[styles.fontBtn, { borderColor: C.border }]}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={18} color={C.textSecondary} />
                  <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>{t('font_large')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: C.textMuted, fontSize: 10, marginTop: -18, marginBottom: Spacing.xl }}>
                {t('font_size_hint')} ({ARABIC_FONT_MIN}-{ARABIC_FONT_MAX}px).
              </Text>

              {/* Terjemahan */}
              <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{t('translation_label')}</Text>
              <TouchableOpacity
                onPress={() => setShowTranslation(v => !v)}
                style={[styles.toggleRow, {
                  backgroundColor: showTranslation ? C.primaryMuted : C.card,
                  borderColor: showTranslation ? C.primary : C.border,
                  marginBottom: Spacing.xl,
                }]}
              >
                <Ionicons name="language-outline" size={18} color={showTranslation ? C.primary : C.textSecondary} />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '600' }}>
                    {t('show_translation')}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                    {t('translation_language_desc')}
                  </Text>
                </View>
                <View style={[styles.toggle, { backgroundColor: showTranslation ? C.primary : C.border }]}>
                  <View style={[styles.toggleThumb, { transform: [{ translateX: showTranslation ? 18 : 2 }] }]} />
                </View>
              </TouchableOpacity>

              {/* Reset */}
              <TouchableOpacity
                onPress={() => {
                  setScript(DEFAULT_PREFS.script);
                  setDisplayMode(DEFAULT_PREFS.displayMode);
                  setFontSize(DEFAULT_PREFS.fontSize);
                  setShowTranslation(DEFAULT_PREFS.showTranslation);
                }}
                style={[styles.resetBtn, { borderColor: C.border }]}
              >
                <Ionicons name="refresh-outline" size={15} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontSize: FontSize.sm, marginLeft: 6 }}>
                  {t('reset_defaults')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quranIconBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  browseModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  browseModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 4,
  },
  browseModeActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: 2,
  },

  // Search
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },

  // Last Read
  lastReadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  lastReadIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastReadContinueBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyBookmarkBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: 8,
    gap: 8,
  },
  bookmarkActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // List label
  listLabelRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Surah/Juz list rows
  surahTypePill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  surahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  juzCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  juzBadge: {
    width: 56,
    minHeight: 62,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  numBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numOrnament: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  numDiamondOuter: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 1.2,
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
  },
  numDiamondInner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  numBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textAlign: 'center',
  },

  // Modal
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  fontBtn: {
    width: 62,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  fontPreview: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 86,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
});
