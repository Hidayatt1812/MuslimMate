import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import type { Lang } from '@/constants/i18n';

const AI_CHAT_TEXT: Record<Lang, Record<string, string>> = {
  id: {
    title: 'Dalam Pengembangan',
    subtitle: 'Fitur AI Assistant sedang kami kerjakan.\nNantikan kehadirannya di versi berikutnya.',
    back: 'Kembali',
  },
  en: {
    title: 'In Development',
    subtitle: 'The AI Assistant feature is currently being built.\nLook forward to it in the next version.',
    back: 'Back',
  },
};

export default function AIChatScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { lang } = useTranslation();
  const copy = AI_CHAT_TEXT[lang];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '700' }}>AI Assistant</Text>
        </View>
      </View>

      {/* Under Development */}
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: `${C.primary}18` }]}>
          <Ionicons name="construct-outline" size={52} color={C.primary} />
        </View>

        <Text style={[styles.title, { color: C.text }]}>
          {copy.title}
        </Text>

        <Text style={[styles.subtitle, { color: C.textMuted }]}>
          {copy.subtitle}
        </Text>

        <View style={[styles.badge, { backgroundColor: `${C.gold}18`, borderColor: `${C.gold}40` }]}>
          <Ionicons name="time-outline" size={14} color={C.gold} />
          <Text style={{ color: C.gold, fontSize: FontSize.sm, marginLeft: 6 }}>
            Coming Soon
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: C.primary }]}
        >
          <Ionicons name="arrow-back" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '600', marginLeft: 8 }}>
            {copy.back}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
});

// ─── TODO: AI Chat Implementation ────────────────────────────────────────────
// Uncomment and restore full implementation when ready to develop.
// Dependencies needed:
//   - services/aiService.ts (sendAIMessage, ChatMessage, SUGGESTED_QUESTIONS, generateMessageId)
//   - services/storageService.ts (getSettings → s.aiApiKey, s.aiBaseUrl)
//
// Core flow:
//   1. Load API key + base URL from settings on mount
//   2. Show welcome message from assistant
//   3. User types → sendMessage() → calls sendAIMessage(messages, apiKey, baseUrl)
//   4. Append response to messages list
//   5. Show suggested questions when messages.length <= 1
// ─────────────────────────────────────────────────────────────────────────────
