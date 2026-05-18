import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Vibration,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { DHIKR_LIST, DUA_LIST, DhikrItem, DuaItem } from '@/constants/dhikr';
import type { Lang } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';

type Tab = 'dhikr' | 'doa' | 'tasbih';

// Sesuaikan ring dengan lebar layar agar tidak overflow di HP kecil
const SCREEN_W = Dimensions.get('window').width;
const RING_SIZE = Math.min(240, SCREEN_W - 80);
const STROKE = 14;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CATEGORY_COLORS: Record<string, string> = {
  umum: '#10B981',
  pagi: '#F59E0B',
  petang: '#8B5CF6',
  sholat: '#3B82F6',
  khusus: '#EF4444',
  harian: '#10B981',
  ibadah: '#3B82F6',
};

const CATEGORY_LABELS: Record<Lang, Record<string, string>> = {
  id: {
    umum: 'umum',
    pagi: 'pagi',
    petang: 'petang',
    sholat: 'sholat',
    khusus: 'khusus',
    harian: 'harian',
    ibadah: 'ibadah',
  },
  en: {
    umum: 'general',
    pagi: 'morning',
    petang: 'evening',
    sholat: 'prayer',
    khusus: 'special',
    harian: 'daily',
    ibadah: 'worship',
  },
};

const DHIKR_TEXT: Record<Lang, Record<string, string>> = {
  id: {
    evidence: 'Dalil Hadits',
    completed: 'selesai',
    of: 'dari',
    tapHint: 'Tap untuk dzikir',
    vibrationOn: 'Getar On',
    vibrationOff: 'Getar Off',
  },
  en: {
    evidence: 'Hadith Evidence',
    completed: 'complete',
    of: 'of',
    tapHint: 'Tap for dhikr',
    vibrationOn: 'Vibrate On',
    vibrationOff: 'Vibrate Off',
  },
};

const DHIKR_CONTENT_EN: Record<string, Partial<Pick<DhikrItem, 'title' | 'translation' | 'hadith'>>> = {
  subhanallah: {
    translation: 'Glory be to Allah',
    hadith:
      'The Messenger of Allah ﷺ said that whoever says Subhanallah 33 times, Alhamdulillah 33 times, and Allahu Akbar 33 times after each prayer will be forgiven, even if their sins are like the foam of the sea. (Muslim no. 597)',
  },
  alhamdulillah: {
    translation: 'All praise is for Allah',
    hadith:
      'The Messenger of Allah ﷺ said: "Alhamdulillah fills the scale, and Subhanallah and Alhamdulillah fill what is between the heavens and the earth." (Muslim no. 223)',
  },
  allahuakbar: {
    translation: 'Allah is the Greatest',
    hadith:
      'The Messenger of Allah ﷺ said that saying tasbih one hundred times records a thousand good deeds and removes a thousand bad deeds. (Muslim no. 2698)',
  },
  'la-ilaha-illallah': {
    translation: 'There is no god but Allah',
    hadith:
      'The Messenger of Allah ﷺ said that saying this remembrance one hundred times in a day brings great reward, forgiveness, and protection on that day. (Bukhari no. 3293)',
  },
  istighfar: {
    translation: 'I seek Allah\'s forgiveness',
    hadith:
      'The Messenger of Allah ﷺ said that whoever keeps seeking forgiveness, Allah grants a way out from every difficulty and provision from where they do not expect. (Abu Dawud no. 1518)',
  },
  sholawat: {
    title: 'Salawat',
    translation: 'O Allah, send blessings upon Muhammad',
    hadith:
      'The Messenger of Allah ﷺ said that whoever sends one blessing upon him, Allah sends ten blessings upon that person, removes ten sins, and raises them ten degrees. (Muslim no. 408)',
  },
  hauqalah: {
    translation: 'There is no power and no strength except through Allah',
    hadith:
      'The Messenger of Allah ﷺ said that La hawla wala quwwata illa billah is one of the treasures of Paradise. (Bukhari no. 6384; Muslim no. 2704)',
  },
  'tasbih-pagi': {
    title: 'Morning Tasbih',
    translation: 'Glory be to Allah and all praise is for Him',
    hadith:
      'The Messenger of Allah ﷺ said that whoever says Subhanallahi wa bihamdihi one hundred times in the morning and evening will not be surpassed on the Day of Resurrection except by someone who said the same or more. (Muslim no. 2692)',
  },
  'tasbih-sholat': {
    title: 'Tasbih After Prayer',
    translation: 'Glory be to Allah, all praise is for Allah, Allah is the Greatest',
    hadith:
      'Abu Hurairah reported that the Messenger of Allah ﷺ said that whoever says tasbih, tahmid, and takbir 33 times after prayer will be forgiven even if their sins are like the foam of the sea. (Muslim no. 597)',
  },
};

const DUA_CONTENT_EN: Record<string, Partial<Pick<DuaItem, 'title' | 'translation' | 'hadith'>>> = {
  'doa-makan': {
    title: 'Du\'a Before Eating',
    translation: 'In the name of Allah and with the blessing of Allah',
    hadith:
      'The Messenger of Allah ﷺ said that when one of you eats, they should mention the name of Allah. If they forget at the beginning, they should say: Bismillahi awwalahu wa akhirahu. (Abu Dawud no. 3767; Tirmidhi no. 1858)',
  },
  'doa-selesai-makan': {
    title: 'Du\'a After Eating',
    translation: 'All praise is for Allah who fed us, gave us drink, and made us Muslims',
    hadith:
      'Mu\'adh ibn Anas reported that whoever says this supplication after eating will have their past sins forgiven. (Abu Dawud no. 3850; Tirmidhi no. 3457)',
  },
  'doa-tidur': {
    title: 'Du\'a Before Sleep',
    translation: 'In Your name, O Allah, I die and I live',
    hadith:
      'Hudhayfah reported that when the Prophet ﷺ wanted to sleep, he placed his right hand under his cheek and recited this supplication. (Bukhari no. 6312)',
  },
  'doa-bangun-tidur': {
    title: 'Du\'a Upon Waking',
    translation: 'All praise is for Allah who gave us life after causing us to die, and to Him is the resurrection',
    hadith:
      'Al-Bara ibn Azib reported that when the Prophet ﷺ woke from sleep, he recited this supplication. (Bukhari no. 6312)',
  },
  'doa-masuk-rumah': {
    title: 'Du\'a Entering the Home',
    translation: 'O Allah, I ask You for the best entrance and the best exit',
    hadith:
      'The Messenger of Allah ﷺ said that when a person mentions Allah while entering the home and while eating, shaytan says there is no lodging and no dinner for them. (Muslim no. 2018)',
  },
  'doa-keluar-rumah': {
    title: 'Du\'a Leaving the Home',
    translation: 'In the name of Allah, I place my trust in Allah. There is no power and no strength except through Allah',
    hadith:
      'The Messenger of Allah ﷺ said that whoever recites this when leaving home is told: you are sufficed, protected, and shaytan is kept away. (Abu Dawud no. 5095)',
  },
  'doa-masuk-masjid': {
    title: 'Du\'a Entering the Mosque',
    translation: 'O Allah, open for me the doors of Your mercy',
    hadith:
      'Abu Humayd or Abu Usayd reported that the Messenger of Allah ﷺ taught this supplication for entering the mosque. (Muslim no. 713)',
  },
  'doa-qunut': {
    title: 'Qunut for Fajr',
    translation: 'O Allah, guide me among those You have guided, and grant me well-being among those You have granted well-being',
    hadith:
      'Al-Hasan ibn Ali reported that the Messenger of Allah ﷺ taught him words to say in the qunut of witr. (Abu Dawud no. 1425; Tirmidhi no. 464)',
  },
  'doa-bercermin': {
    title: 'Du\'a Looking in the Mirror',
    translation: 'O Allah, You have made my appearance beautiful, so make my character beautiful',
    hadith:
      'Ibn Masud reported that the Prophet ﷺ would recite this supplication when looking in the mirror. (Ahmad no. 3759; Ibn Hibban no. 959)',
  },
  'doa-naik-kendaraan': {
    title: 'Du\'a Riding a Vehicle',
    translation: 'Glory be to the One who has subjected this to us, for we could not have controlled it ourselves',
    hadith:
      'Ali ibn Rabi\'ah reported seeing Ali recite this supplication when mounting his ride, saying that he saw the Messenger of Allah ﷺ do the same. (Abu Dawud no. 2602; Tirmidhi no. 3447)',
  },
};

export default function DhikrScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();
  const copy = DHIKR_TEXT[lang];
  const [activeTab, setActiveTab] = useState<Tab>('dhikr');
  const [selectedDhikr, setSelectedDhikr] = useState<DhikrItem>(DHIKR_LIST[0]);
  const [count, setCount] = useState(0);
  const [vibrate, setVibrate] = useState(true);
  const [expandedDhikr, setExpandedDhikr] = useState<string | null>(null);
  const [expandedDua, setExpandedDua] = useState<string | null>(null);

  const openTasbih = (dhikr: DhikrItem) => {
    setSelectedDhikr(dhikr);
    setCount(0);
    setActiveTab('tasbih');
  };

  const handleTap = () => {
    const next = count + 1;
    setCount(next);
    if (vibrate) Vibration.vibrate(20);
    if (next % selectedDhikr.target === 0) {
      Vibration.vibrate([0, 60, 80, 60, 80, 120]);
    }
  };

  const currentInRound = count % selectedDhikr.target;
  const displayCount = currentInRound === 0 && count > 0 ? selectedDhikr.target : currentInRound;
  const progress = displayCount / selectedDhikr.target;
  const rounds = Math.floor(count / selectedDhikr.target);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'dhikr', label: t('tab_dhikr_inner'), icon: 'list-outline' },
    { id: 'doa', label: t('tab_doa'), icon: 'hand-left-outline' },
    { id: 'tasbih', label: t('tab_tasbih'), icon: 'radio-button-on-outline' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={{ color: C.text, fontSize: FontSize.xxl, fontWeight: '800' }}>{t('dhikr_title')}</Text>
        <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
          {t('dhikr_subtitle')}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              { borderBottomColor: activeTab === tab.id ? C.primary : 'transparent' },
            ]}
          >
            <Ionicons name={tab.icon} size={15} color={activeTab === tab.id ? C.primary : C.textMuted} />
            <Text style={{
              color: activeTab === tab.id ? C.primary : C.textSecondary,
              fontWeight: activeTab === tab.id ? '700' : '400',
              fontSize: FontSize.sm,
              marginLeft: 5,
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Dzikir Tab ── */}
      {activeTab === 'dhikr' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 32 }}
        >
          {DHIKR_LIST.map(dhikr => {
            const catColor = CATEGORY_COLORS[dhikr.category] ?? C.primary;
            const isExpanded = expandedDhikr === dhikr.id;
            const item = lang === 'en' ? { ...dhikr, ...DHIKR_CONTENT_EN[dhikr.id] } : dhikr;
            return (
              <Card key={dhikr.id} style={{ borderLeftWidth: 3, borderLeftColor: catColor, padding: Spacing.md }}>

                {/* Title + kategori badge */}
                <View style={styles.titleRow}>
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: `${catColor}20`, flexShrink: 0 }]}>
                    <Text style={{ color: catColor, fontSize: 10, fontWeight: '700' }}>
                      {CATEGORY_LABELS[lang][dhikr.category] ?? dhikr.category}
                    </Text>
                  </View>
                </View>

                {/* Arabic */}
                <Text style={{ color: C.text, fontSize: 22, textAlign: 'right', lineHeight: 40, fontFamily: 'serif', marginBottom: Spacing.xs }}>
                  {dhikr.arabic}
                </Text>

                {/* Transliteration */}
                <Text style={{ color: C.textMuted, fontSize: FontSize.xs, fontStyle: 'italic', marginBottom: Spacing.xs, lineHeight: 18 }}>
                  {dhikr.transliteration}
                </Text>

                {/* Terjemahan */}
                <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.sm }}>
                  {item.translation}
                </Text>

                {/* Hadith toggle */}
                {dhikr.hadith && (
                  <TouchableOpacity
                    onPress={() => setExpandedDhikr(isExpanded ? null : dhikr.id)}
                    style={[styles.hadithToggle, { backgroundColor: `${C.gold}12`, borderColor: `${C.gold}30` }]}
                  >
                    <Ionicons name="book-outline" size={12} color={C.gold} />
                    <Text style={{ color: C.gold, fontSize: FontSize.xs, fontWeight: '600', flex: 1, marginLeft: 6 }}>
                      {isExpanded ? t('hide_hadith') : t('show_hadith')}
                    </Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={C.gold} />
                  </TouchableOpacity>
                )}
                {isExpanded && dhikr.hadith && (
                  <View style={[styles.hadithBox, { backgroundColor: `${C.gold}10`, borderColor: `${C.gold}25` }]}>
                    <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, lineHeight: 18 }}>
                      {item.hadith}
                    </Text>
                  </View>
                )}

                {/* Footer: target + source, lalu tombol penuh */}
                <View style={[styles.dhikrFooter, { borderTopColor: C.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm }}>
                    <Ionicons name="repeat-outline" size={12} color={C.textMuted} />
                    <Text style={{ color: C.textMuted, fontSize: FontSize.xs, flex: 1 }} numberOfLines={1}>
                      {dhikr.target}x{dhikr.source ? ` · ${dhikr.source}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openTasbih(dhikr)}
                    style={[styles.startBtn, { backgroundColor: catColor }]}
                  >
                    <Ionicons name="play" size={13} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: FontSize.sm, fontWeight: '700', marginLeft: 6 }}>
                      {t('start_tasbih')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* ── Doa Tab ── */}
      {activeTab === 'doa' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: 32 }}
        >
          {DUA_LIST.map(dua => {
            const catColor = CATEGORY_COLORS[dua.category] ?? C.primary;
            const isOpen = expandedDua === dua.id;
            const item = lang === 'en' ? { ...dua, ...DUA_CONTENT_EN[dua.id] } : dua;
            return (
              <TouchableOpacity
                key={dua.id}
                onPress={() => setExpandedDua(isOpen ? null : dua.id)}
                activeOpacity={0.85}
              >
                <Card style={{ borderLeftWidth: 3, borderLeftColor: isOpen ? catColor : C.border, padding: Spacing.md }}>
                  {/* Header row */}
                  <View style={styles.duaHeaderRow}>
                    <View style={{ flex: 1, marginRight: Spacing.sm }}>
                      <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '600' }} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {dua.source && (
                        <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                          {dua.source}
                        </Text>
                      )}
                    </View>
                    <View style={styles.duaBadgeRow}>
                      <View style={[styles.pill, { backgroundColor: `${catColor}18` }]}>
                        <Text style={{ color: catColor, fontSize: 10, fontWeight: '700' }}>{CATEGORY_LABELS[lang][dua.category] ?? dua.category}</Text>
                      </View>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color={C.textMuted} />
                    </View>
                  </View>

                  {isOpen && (
                    <View style={{ marginTop: Spacing.md }}>
                      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginBottom: Spacing.md }} />

                      {/* Arabic */}
                      <Text style={{ color: C.text, fontSize: 20, textAlign: 'right', lineHeight: 38, fontFamily: 'serif', marginBottom: Spacing.sm }}>
                        {dua.arabic}
                      </Text>

                      {/* Transliteration */}
                      {dua.transliteration && (
                        <Text style={{ color: C.gold, fontSize: FontSize.xs, fontStyle: 'italic', marginBottom: Spacing.sm, lineHeight: 19 }}>
                          {dua.transliteration}
                        </Text>
                      )}

                      {/* Terjemahan */}
                      <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, lineHeight: 21, marginBottom: Spacing.md }}>
                        {item.translation}
                      </Text>

                      {/* Hadith */}
                      {dua.hadith && (
                        <View style={[styles.hadithBox, { backgroundColor: `${C.gold}10`, borderColor: `${C.gold}25` }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <Ionicons name="book-outline" size={12} color={C.gold} />
                            <Text style={{ color: C.gold, fontSize: FontSize.xs, fontWeight: '700' }}>
                              {copy.evidence}
                            </Text>
                          </View>
                          <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, lineHeight: 18 }}>
                            {item.hadith}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Tasbih Tab ── */}
      {activeTab === 'tasbih' && (
        <View style={{ flex: 1 }}>
          {/* Selector chips horizontal */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingVertical: 10, gap: Spacing.sm }}
            style={{ flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }}
          >
            {DHIKR_LIST.map(d => {
              const item = lang === 'en' ? { ...d, ...DHIKR_CONTENT_EN[d.id] } : d;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => { setSelectedDhikr(d); setCount(0); }}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor: selectedDhikr.id === d.id ? C.primary : C.card,
                      borderColor: selectedDhikr.id === d.id ? C.primary : C.border,
                    },
                  ]}
                >
                  <Text style={{
                    color: selectedDhikr.id === d.id ? '#fff' : C.text,
                    fontSize: FontSize.xs,
                    fontWeight: '600',
                  }}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Main counter area */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.lg, paddingBottom: Spacing.md, paddingHorizontal: Spacing.md }}>

            {/* Dzikir text */}
            <View style={{ alignItems: 'center', paddingHorizontal: Spacing.md }}>
              <Text style={{ color: C.text, fontSize: 22, textAlign: 'center', fontFamily: 'serif', lineHeight: 40 }}>
                {selectedDhikr.arabic}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: FontSize.xs, fontStyle: 'italic', marginTop: 4, textAlign: 'center' }} numberOfLines={2}>
                {selectedDhikr.transliteration}
              </Text>
            </View>

            {/* Ring area */}
            <View style={{ alignItems: 'center' }}>
              {/* Rounds badge di atas ring */}
              {rounds > 0 ? (
                <View style={[styles.roundsBadge, { backgroundColor: C.gold }]}>
                  <Ionicons name="repeat" size={11} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginLeft: 3 }}>
                    {rounds}× {copy.completed}
                  </Text>
                </View>
              ) : (
                <View style={{ height: 28 }} />
              )}

              {/* Ring + tap circle */}
              <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={C.border}
                    strokeWidth={STROKE}
                    fill="none"
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={progress === 1 ? C.success : C.primary}
                    strokeWidth={STROKE}
                    fill="none"
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                </Svg>

                <Pressable
                  onPress={handleTap}
                  style={({ pressed }) => [
                    styles.tapCircle,
                    {
                      backgroundColor: pressed ? `${C.primary}E0` : C.surface,
                      borderColor: progress > 0 ? C.primary : C.border,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <Text style={{ color: C.primary, fontSize: 56, fontWeight: '900', lineHeight: 64, textAlign: 'center' }}>
                    {displayCount}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>
                    {copy.of} {selectedDhikr.target}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                    <Ionicons name="finger-print-outline" size={13} color={C.textMuted} />
                    <Text style={{ color: C.textMuted, fontSize: 10 }}>{copy.tapHint}</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Bottom controls */}
            <View style={{ width: '100%', gap: 8 }}>
              {/* Source */}
              {selectedDhikr.source && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Ionicons name="information-circle-outline" size={12} color={C.textMuted} />
                  <Text style={{ color: C.textMuted, fontSize: 10, flex: 1, textAlign: 'center' }} numberOfLines={1}>
                    {selectedDhikr.source}
                  </Text>
                </View>
              )}

              {/* 3 tombol */}
              <View style={styles.controlRow}>
                <TouchableOpacity
                  onPress={() => setCount(0)}
                  style={[styles.controlBtn, { backgroundColor: C.card, borderColor: C.border, flex: 1 }]}
                >
                  <Ionicons name="refresh-outline" size={15} color={C.textSecondary} />
                  <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginLeft: 4 }}>{t('reset')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setVibrate(!vibrate)}
                  style={[styles.controlBtn, {
                    backgroundColor: vibrate ? C.primaryMuted : C.card,
                    borderColor: vibrate ? C.primary : C.border,
                    flex: 1,
                  }]}
                >
                  <Ionicons
                    name={vibrate ? 'phone-portrait-outline' : 'volume-mute-outline'}
                    size={15}
                    color={vibrate ? C.primary : C.textSecondary}
                  />
                  <Text style={{ color: vibrate ? C.primary : C.textSecondary, fontSize: FontSize.xs, marginLeft: 4 }}>
                    {vibrate ? copy.vibrationOn : copy.vibrationOff}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('dhikr')}
                  style={[styles.controlBtnIcon, { backgroundColor: C.card, borderColor: C.border }]}
                >
                  <Ionicons name="list-outline" size={15} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  hadithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    marginBottom: 6,
  },
  hadithBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: 4,
    marginBottom: 4,
  },
  dhikrFooter: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    width: '100%',
  },
  duaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  selectorChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  roundsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
  },
  tapCircle: {
    width: RING_SIZE - STROKE * 2 - 12,
    height: RING_SIZE - STROKE * 2 - 12,
    borderRadius: (RING_SIZE - STROKE * 2 - 12) / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  controlBtnIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
});
