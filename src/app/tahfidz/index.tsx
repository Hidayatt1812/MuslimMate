import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Lang } from '@/constants/i18n';
import { SURAH_LIST } from '@/constants/surah';
import { useTranslation } from '@/hooks/useTranslation';
import { getTahfidzPlans, saveTahfidzPlan, deleteTahfidzPlan, TahfidzPlan } from '@/services/storageService';

type TahfidzIndexCopy = {
  newPlan: string;
  emptyTitle: string;
  emptyDesc: string;
  memorized: string;
  totalVerses: string;
  dailyTargetShort: string;
  progressComplete: string;
  startLearning: string;
  addTitle: string;
  dailyTarget: string;
  perDay: string;
  createPlan: string;
  deletePlanTitle: string;
  deletePlanMessage: (surahName: string) => string;
  delete: string;
};

const TAHFIDZ_INDEX_TEXT: Record<Lang, TahfidzIndexCopy> = {
  id: {
    newPlan: 'Baru',
    emptyTitle: 'Belum ada rencana hafalan',
    emptyDesc: 'Tap tombol "Baru" untuk mulai menghafal Al-Qur\'an',
    memorized: 'Dihafal',
    totalVerses: 'Total Ayat',
    dailyTargetShort: 'Target/Hari',
    progressComplete: 'selesai',
    startLearning: 'Mulai Belajar',
    addTitle: 'Pilih Surah untuk Dihafal',
    dailyTarget: 'Target harian:',
    perDay: 'ayat/hari',
    createPlan: 'Buat Rencana',
    deletePlanTitle: 'Hapus Rencana',
    deletePlanMessage: surahName => `Hapus rencana hafalan ${surahName}?`,
    delete: 'Hapus',
  },
  en: {
    newPlan: 'New',
    emptyTitle: 'No memorization plan yet',
    emptyDesc: 'Tap "New" to start memorizing the Qur\'an',
    memorized: 'Memorized',
    totalVerses: 'Total Verses',
    dailyTargetShort: 'Target/Day',
    progressComplete: 'complete',
    startLearning: 'Start Learning',
    addTitle: 'Choose a Surah to Memorize',
    dailyTarget: 'Daily target:',
    perDay: 'verses/day',
    createPlan: 'Create Plan',
    deletePlanTitle: 'Delete Plan',
    deletePlanMessage: surahName => `Delete memorization plan for ${surahName}?`,
    delete: 'Delete',
  },
};

export default function TahfidzIndexScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang } = useTranslation();
  const copy = TAHFIDZ_INDEX_TEXT[lang];
  const [plans, setPlans] = useState<TahfidzPlan[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [dailyTarget, setDailyTarget] = useState('5');
  const [searchSurah, setSearchSurah] = useState('');

  const loadPlans = useCallback(async () => {
    const p = await getTahfidzPlans();
    setPlans(p);
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const createPlan = async () => {
    const surahMeta = SURAH_LIST.find(s => s.number === selectedSurah)!;
    const plan: TahfidzPlan = {
      id: `tahfidz_${Date.now()}`,
      surahNumber: selectedSurah,
      surahName: surahMeta.englishName,
      targetAyahs: Array.from({ length: surahMeta.ayahCount }, (_, i) => i + 1),
      memorizedAyahs: [],
      dailyTarget: parseInt(dailyTarget, 10) || 5,
      createdAt: new Date().toISOString(),
      lastStudied: '',
    };
    await saveTahfidzPlan(plan);
    setShowAdd(false);
    await loadPlans();
  };

  const deletePlan = (plan: TahfidzPlan) => {
    Alert.alert(
      copy.deletePlanTitle,
      copy.deletePlanMessage(plan.surahName),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: copy.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteTahfidzPlan(plan.id);
            await loadPlans();
          },
        },
      ]
    );
  };

  const searchQuery = searchSurah.trim().toLowerCase();
  const filteredSurahs = SURAH_LIST.filter(s =>
    s.englishName.toLowerCase().includes(searchQuery) ||
    s.indonesianName.toLowerCase().includes(searchQuery) ||
    s.number.toString().includes(searchSurah)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginLeft: Spacing.md, flex: 1 }}>
          {t('menu_tahfidz')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={[styles.addBtn, { backgroundColor: C.primary }]}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.sm }}>{copy.newPlan}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 }}>
        {plans.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: Spacing.xxl }}>
            <Ionicons name="school-outline" size={64} color={C.textMuted} />
            <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.md }}>
              {copy.emptyTitle}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginTop: 8 }}>
              {copy.emptyDesc}
            </Text>
          </Card>
        ) : (
          plans.map(plan => {
            const progress = plan.memorizedAyahs.length / plan.targetAyahs.length;
            return (
              <Card key={plan.id} variant="outlined">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700' }}>
                      {SURAH_LIST.find(s => s.number === plan.surahNumber)?.name ?? plan.surahName}
                    </Text>
                    <Text style={{ color: C.textSecondary, fontSize: FontSize.sm }}>{plan.surahName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deletePlan(plan)} style={{ padding: 4 }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={C.error} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm }}>
                  <View>
                    <Text style={{ color: C.primary, fontSize: FontSize.xl, fontWeight: '800' }}>
                      {plan.memorizedAyahs.length}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{copy.memorized}</Text>
                  </View>
                  <View>
                    <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800' }}>
                      {plan.targetAyahs.length}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{copy.totalVerses}</Text>
                  </View>
                  <View>
                    <Text style={{ color: C.gold, fontSize: FontSize.xl, fontWeight: '800' }}>
                      {plan.dailyTarget}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{copy.dailyTargetShort}</Text>
                  </View>
                </View>

                <ProgressBar
                  progress={progress}
                  height={8}
                  label={`${Math.round(progress * 100)}% ${copy.progressComplete}`}
                  showLabel
                  style={{ marginTop: Spacing.sm }}
                />

                <TouchableOpacity
                  onPress={() => router.push(`/tahfidz/${plan.id}` as any)}
                  style={[styles.studyBtn, { backgroundColor: C.primary }]}
                >
                  <Ionicons name="play-circle-outline" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.md, marginLeft: 6 }}>
                    {copy.startLearning}
                  </Text>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add Plan Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
            <Text style={{ color: C.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.md }}>
              {copy.addTitle}
            </Text>

            <TextInput
              value={searchSurah}
              onChangeText={setSearchSurah}
              placeholder={t('search_surah')}
              placeholderTextColor={C.textMuted}
              style={[styles.input, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
            />

            <ScrollView style={{ maxHeight: 240, marginVertical: Spacing.md }}>
              {filteredSurahs.slice(0, 20).map(s => (
                <TouchableOpacity
                  key={s.number}
                  onPress={() => setSelectedSurah(s.number)}
                  style={[
                    styles.surahOption,
                    {
                      backgroundColor: selectedSurah === s.number ? C.primaryMuted : C.card,
                      borderColor: selectedSurah === s.number ? C.primary : C.border,
                    },
                  ]}
                >
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs, width: 24 }}>{s.number}</Text>
                  <Text style={{ color: C.text, fontSize: FontSize.md, flex: 1 }}>{s.englishName}</Text>
                  {selectedSurah === s.number && <Ionicons name="checkmark-circle" size={16} color={C.primary} />}
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs }}>{s.ayahCount} {t('verses_unit')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <Text style={{ color: C.text, fontSize: FontSize.md }}>{copy.dailyTarget}</Text>
              <TextInput
                value={dailyTarget}
                onChangeText={setDailyTarget}
                keyboardType="number-pad"
                style={[styles.smallInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
              />
              <Text style={{ color: C.textSecondary, fontSize: FontSize.sm }}>{copy.perDay}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity
                onPress={() => setShowAdd(false)}
                style={[styles.modalBtn, { backgroundColor: C.card, flex: 1 }]}
              >
                <Text style={{ color: C.textSecondary, fontWeight: '700' }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createPlan}
                style={[styles.modalBtn, { backgroundColor: C.primary, flex: 1 }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{copy.createPlan}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.lg },
  studyBtn: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, maxHeight: '80%' },
  input: { borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, borderWidth: 1 },
  surahOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 4, gap: Spacing.sm },
  smallInput: { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6, fontSize: FontSize.md, borderWidth: 1, width: 60, textAlign: 'center' },
  modalBtn: { padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center' },
});
