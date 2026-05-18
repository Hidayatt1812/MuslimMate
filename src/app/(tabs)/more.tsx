import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Pressable,
  Clipboard,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { isQFLoggedIn } from '@/services/quranFoundationAuthService';
import { useTranslation } from '@/hooks/useTranslation';
import type { Lang } from '@/constants/i18n';
import {
  submitSupportForm,
  type SupportDonationMethod,
} from '@/services/supportService';

interface DonationMethod {
  id: Exclude<SupportDonationMethod, 'none' | 'other'>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  name: string;
  number: string;
  color: string;
}

const DONATION_METHODS: DonationMethod[] = [
  {
    id: 'bri',
    icon: 'card-outline',
    label: 'Bank BRI',
    name: 'Muhammad Hidayat Tasidin',
    number: '753801009146532',
    color: '#005BAC',
  },
  {
    id: 'mandiri',
    icon: 'card-outline',
    label: 'Bank Mandiri',
    name: 'Muhammad Hidayat Tas',
    number: '1180015328569',
    color: '#003D8F',
  },
  {
    id: 'ewallet',
    icon: 'phone-portrait-outline',
    label: 'E-Wallet Lainnya',
    name: 'Muhammad Hidayat Tasidin',
    number: '085756429806',
    color: '#4C3494',
  },
];

type MoreCopy = {
  accountSection: string;
  quickSection: string;
  learningSection: string;
  toolsSection: string;
  supportSection: string;
  languageHint: string;
  donationActionDesc: string;
  supportFormActionTitle: string;
  supportFormActionDesc: string;
  supportFormTitle: string;
  supportFormDesc: string;
  nameLabel: string;
  namePlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  donationMethodLabel: string;
  noDonationYet: string;
  otherDonationMethod: string;
  paymentDestinationTitle: string;
  accountOwnerLabel: string;
  accountNumberLabel: string;
  databaseNotConnectedMessage: string;
  submitSupport: string;
  supportRequiredTitle: string;
  supportRequiredMessage: string;
  supportSentTitle: string;
  supportSavedDatabaseMessage: string;
  supportSavedLocalMessage: string;
  ewalletOther: string;
};

const MORE_TEXT: Record<Lang, MoreCopy> = {
  id: {
    accountSection: 'Akun & Preferensi',
    quickSection: 'Akses Cepat',
    learningSection: 'Progres & Belajar',
    toolsSection: 'Alat Pendukung',
    supportSection: 'Bantuan & Dukungan',
    languageHint: 'Bahasa aplikasi',
    donationActionDesc: 'Bantu server, riset, dan pengembangan fitur',
    supportFormActionTitle: 'Form Support',
    supportFormActionDesc: 'Kirim masukan dan info donasi',
    supportFormTitle: 'Form Support MuslimMate',
    supportFormDesc: 'Masukan kamu akan membantu saya merapikan fitur dan mencatat dukungan yang masuk.',
    nameLabel: 'Nama',
    namePlaceholder: 'Tulis nama kamu',
    messageLabel: 'Masukan',
    messagePlaceholder: 'Tulis saran, kritik, atau catatan donasi...',
    donationMethodLabel: 'Donasi menggunakan',
    noDonationYet: 'Belum donasi',
    otherDonationMethod: 'Lainnya',
    paymentDestinationTitle: 'Tujuan pembayaran',
    accountOwnerLabel: 'Atas nama',
    accountNumberLabel: 'Nomor',
    databaseNotConnectedMessage: 'Database belum tersambung. Data disimpan lokal dulu, lalu bisa dikirim ulang nanti setelah Supabase aktif.',
    submitSupport: 'Kirim Support',
    supportRequiredTitle: 'Data belum lengkap',
    supportRequiredMessage: 'Nama dan masukan perlu diisi dulu.',
    supportSentTitle: 'Support Terkirim',
    supportSavedDatabaseMessage: 'Terima kasih. Data sudah masuk ke command support/database.',
    supportSavedLocalMessage: 'Terima kasih. Data tersimpan lokal dulu karena database belum tersambung.',
    ewalletOther: 'E-Wallet Lainnya',
  },
  en: {
    accountSection: 'Account & Preferences',
    quickSection: 'Quick Access',
    learningSection: 'Progress & Learning',
    toolsSection: 'Supporting Tools',
    supportSection: 'Help & Support',
    languageHint: 'App language',
    donationActionDesc: 'Support servers, research, and feature development',
    supportFormActionTitle: 'Support Form',
    supportFormActionDesc: 'Send feedback and donation info',
    supportFormTitle: 'MuslimMate Support Form',
    supportFormDesc: 'Your feedback helps me improve features and record incoming support.',
    nameLabel: 'Name',
    namePlaceholder: 'Enter your name',
    messageLabel: 'Feedback',
    messagePlaceholder: 'Write feedback, suggestions, or donation notes...',
    donationMethodLabel: 'Donation via',
    noDonationYet: 'No donation yet',
    otherDonationMethod: 'Other',
    paymentDestinationTitle: 'Payment destination',
    accountOwnerLabel: 'Account name',
    accountNumberLabel: 'Number',
    databaseNotConnectedMessage: 'Database is not connected yet. The data is saved locally for now and can be resent after Supabase is active.',
    submitSupport: 'Submit Support',
    supportRequiredTitle: 'Incomplete Form',
    supportRequiredMessage: 'Please fill in your name and feedback first.',
    supportSentTitle: 'Support Submitted',
    supportSavedDatabaseMessage: 'Thank you. The data has been saved to the support command/database.',
    supportSavedLocalMessage: 'Thank you. The data was saved locally because the database is not connected yet.',
    ewalletOther: 'Other E-Wallets',
  },
};

export default function MoreScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const { t, lang, setLang } = useTranslation();
  const copy = MORE_TEXT[lang];
  const [showDonation, setShowDonation] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [showDonationMethodOptions, setShowDonationMethodOptions] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportDonationMethod, setSupportDonationMethod] = useState<SupportDonationMethod>('none');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qfLoggedIn, setQfLoggedIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      isQFLoggedIn().then(setQfLoggedIn);
    }, [])
  );

  const copyToClipboard = (text: string, key: string) => {
    Clipboard.setString(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const donationMethodOptions: { value: SupportDonationMethod; label: string }[] = [
    { value: 'none', label: copy.noDonationYet },
    { value: 'bri', label: 'Bank BRI' },
    { value: 'mandiri', label: 'Bank Mandiri' },
    { value: 'ewallet', label: copy.ewalletOther },
    { value: 'other', label: copy.otherDonationMethod },
  ];

  const selectedDonationMethodLabel =
    donationMethodOptions.find(item => item.value === supportDonationMethod)?.label ?? copy.noDonationYet;
  const selectedDonationMethod = DONATION_METHODS.find(method => method.id === supportDonationMethod);

  const resetSupportForm = () => {
    setSupportName('');
    setSupportMessage('');
    setSupportDonationMethod('none');
    setShowDonationMethodOptions(false);
  };

  const closeSupportForm = () => {
    if (supportSubmitting) return;
    setShowSupportForm(false);
    setShowDonationMethodOptions(false);
  };

  const handleSubmitSupport = async () => {
    if (!supportName.trim() || !supportMessage.trim()) {
      Alert.alert(copy.supportRequiredTitle, copy.supportRequiredMessage);
      return;
    }

    setSupportSubmitting(true);
    try {
      const result = await submitSupportForm({
        name: supportName,
        message: supportMessage,
        donationMethod: supportDonationMethod,
        donationMethodLabel: selectedDonationMethodLabel,
        donationAccountName: selectedDonationMethod?.name,
        donationAccountNumber: selectedDonationMethod?.number,
        language: lang,
      });
      setShowSupportForm(false);
      resetSupportForm();
      Alert.alert(
        copy.supportSentTitle,
        result.synced ? copy.supportSavedDatabaseMessage : copy.supportSavedLocalMessage
      );
    } catch {
      Alert.alert(copy.supportSentTitle, copy.supportSavedLocalMessage);
    } finally {
      setSupportSubmitting(false);
    }
  };

  const QUICK_ITEMS = [
    {
      id: 'tracker',
      icon: 'checkmark-circle-outline' as const,
      title: t('menu_tracker'),
      description: t('menu_tracker_desc'),
      route: '/tracker',
      color: '#10B981',
    },
    {
      id: 'ramadan',
      icon: 'calendar-outline' as const,
      title: t('menu_ramadan'),
      description: t('menu_ramadan_desc'),
      route: '/fasting',
      color: '#F59E0B',
    },
    {
      id: 'qibla',
      icon: 'compass-outline' as const,
      title: t('menu_qibla'),
      description: t('menu_qibla_desc'),
      route: '/qibla',
      color: '#EF4444',
    },
    {
      id: 'quran-finder',
      icon: 'heart-outline' as const,
      title: 'Quran Finder',
      description: t('quran_finder_subtitle'),
      route: '/quran-finder',
      color: '#10B981',
    },
  ];

  const LEARNING_ITEMS = [
    {
      id: 'tahfidz',
      icon: 'school-outline' as const,
      title: t('menu_tahfidz'),
      description: t('menu_tahfidz_desc'),
      route: '/tahfidz',
      color: '#8B5CF6',
    },
    {
      id: 'statistics',
      icon: 'stats-chart-outline' as const,
      title: t('menu_statistics'),
      description: t('menu_statistics_desc'),
      route: '/statistics',
      color: '#3B82F6',
    },
  ];

  const TOOL_ITEMS = [
    {
      id: 'hijri-calendar',
      icon: 'calendar-number-outline' as const,
      title: lang === 'en' ? 'Hijri Calendar' : 'Kalender Hijriah',
      description: lang === 'en' ? 'Islamic lunar calendar & events' : 'Kalender Islam & hari besar',
      route: '/hijri-calendar',
      color: '#6366F1',
    },
    {
      id: 'ai-chat',
      icon: 'chatbubbles-outline' as const,
      title: t('menu_ai'),
      description: t('menu_ai_desc'),
      route: '/ai-chat',
      color: '#06B6D4',
    },
  ];

  const SUPPORT_ITEMS = [
    {
      id: 'support-form',
      icon: 'chatbox-ellipses-outline' as const,
      title: copy.supportFormActionTitle,
      description: copy.supportFormActionDesc,
      color: '#3B82F6',
      onPress: () => setShowSupportForm(true),
    },
    {
      id: 'donation',
      icon: 'heart-outline' as const,
      title: t('support_title'),
      description: copy.donationActionDesc,
      color: C.gold,
      onPress: () => setShowDonation(true),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Image
          source={require('../../../assets/logo/logo-transparent.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: FontSize.xxl, fontWeight: '800' }}>{t('more_title')}</Text>
          <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
            {t('more_subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shell}>
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{copy.accountSection}</Text>
            <View style={[styles.preferencePanel, { backgroundColor: C.card, borderColor: C.border }]}>
              <TouchableOpacity
                onPress={() => router.push('/login' as any)}
                activeOpacity={0.82}
                style={styles.accountRow}
              >
                <View style={[styles.rowIcon, { backgroundColor: qfLoggedIn ? '#10B9811F' : '#3B82F61A' }]}>
                  <Ionicons
                    name={qfLoggedIn ? 'checkmark-circle' : 'person-circle-outline'}
                    size={22}
                    color={qfLoggedIn ? '#10B981' : '#3B82F6'}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800' }}>
                    {qfLoggedIn ? t('qf_connected') : t('qf_login')}
                  </Text>
                  <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }} numberOfLines={2}>
                    {qfLoggedIn ? t('qf_connected_desc') : t('qf_login_desc')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={C.textMuted} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: C.border }]} />

              <View style={styles.languageRow}>
                <View style={[styles.rowIcon, { backgroundColor: '#6366F11A' }]}>
                  <Ionicons name="language-outline" size={20} color="#6366F1" />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '700' }}>{t('language_section')}</Text>
                  <Text style={{ color: C.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>{copy.languageHint}</Text>
                </View>
                <View style={[styles.segmented, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {(['id', 'en'] as const).map(code => {
                    const active = lang === code;
                    return (
                      <TouchableOpacity
                        key={code}
                        onPress={() => setLang(code)}
                        style={[
                          styles.segmentButton,
                          { backgroundColor: active ? C.primary : 'transparent' },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: active ? '#fff' : C.textSecondary, fontSize: FontSize.xs, fontWeight: '900' }}>
                          {code.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{copy.quickSection}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRail}
            >
              {QUICK_ITEMS.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(item.route as any)}
                  style={[styles.quickTile, { backgroundColor: C.card, borderColor: C.border }]}
                  activeOpacity={0.78}
                >
                  <View style={[styles.quickIcon, { backgroundColor: `${item.color}1F` }]}>
                    <Ionicons name={item.icon} size={23} color={item.color} />
                  </View>
                  <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: '800', marginTop: Spacing.sm }} numberOfLines={2}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {[
            { title: copy.learningSection, items: LEARNING_ITEMS },
            { title: copy.toolsSection, items: TOOL_ITEMS },
          ].map(section => (
            <View key={section.title} style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{section.title}</Text>
              <View style={[styles.listPanel, { backgroundColor: C.card, borderColor: C.border }]}>
                {section.items.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <TouchableOpacity
                      onPress={() => router.push(item.route as any)}
                      style={styles.featureRow}
                      activeOpacity={0.78}
                    >
                      <View style={[styles.rowIcon, { backgroundColor: `${item.color}1A` }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.md }}>
                        <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800' }}>{item.title}</Text>
                        <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2, lineHeight: 17 }} numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                    {index < section.items.length - 1 && <View style={[styles.dividerInset, { backgroundColor: C.border }]} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{copy.supportSection}</Text>
            <View style={[styles.listPanel, { backgroundColor: C.card, borderColor: C.border }]}>
              {SUPPORT_ITEMS.map((item, index) => (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    onPress={item.onPress}
                    style={styles.featureRow}
                    activeOpacity={0.78}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: `${item.color}1A` }]}>
                      <Ionicons name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800' }}>{item.title}</Text>
                      <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </View>
                    <Ionicons name={item.id === 'donation' ? 'heart' : 'arrow-forward'} size={16} color={item.color} />
                  </TouchableOpacity>
                  {index < SUPPORT_ITEMS.length - 1 && <View style={[styles.dividerInset, { backgroundColor: C.border }]} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          <View style={[styles.appInfo, { borderTopColor: C.border }]}>
            <Text style={{ color: C.primary, fontSize: FontSize.lg, fontWeight: '800', textAlign: 'center' }}>
              MuslimMate
            </Text>
            <Text style={{ color: C.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: 4 }}>
              {t('app_tagline')} - v1.0.0
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 10, textAlign: 'center', marginTop: 6, lineHeight: 16 }}>
              {t('app_quote')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Support Form */}
      <Modal visible={showSupportForm} transparent animationType="slide" onRequestClose={closeSupportForm}>
        <Pressable
          style={[styles.overlay, { backgroundColor: C.overlay }]}
          onPress={closeSupportForm}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: C.surface }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: C.border }]} />

            <View style={styles.sheetHeader}>
              <View style={[styles.donateIconBox, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="chatbox-ellipses-outline" size={22} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>
                  {copy.supportFormTitle}
                </Text>
                <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2, lineHeight: 17 }}>
                  {copy.supportFormDesc}
                </Text>
              </View>
              <TouchableOpacity onPress={closeSupportForm} hitSlop={8} disabled={supportSubmitting}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: Spacing.md }}>
              <View>
                <Text style={[styles.inputLabel, { color: C.textMuted }]}>{copy.nameLabel}</Text>
                <TextInput
                  value={supportName}
                  onChangeText={setSupportName}
                  placeholder={copy.namePlaceholder}
                  placeholderTextColor={C.textMuted}
                  editable={!supportSubmitting}
                  style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: C.textMuted }]}>{copy.messageLabel}</Text>
                <TextInput
                  value={supportMessage}
                  onChangeText={setSupportMessage}
                  placeholder={copy.messagePlaceholder}
                  placeholderTextColor={C.textMuted}
                  editable={!supportSubmitting}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.messageInput, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: C.textMuted }]}>{copy.donationMethodLabel}</Text>
                <TouchableOpacity
                  onPress={() => setShowDonationMethodOptions(v => !v)}
                  activeOpacity={0.8}
                  disabled={supportSubmitting}
                  style={[styles.dropdownButton, { backgroundColor: C.card, borderColor: C.border }]}
                >
                  <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '700' }}>
                    {selectedDonationMethodLabel}
                  </Text>
                  <Ionicons
                    name={showDonationMethodOptions ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={C.textMuted}
                  />
                </TouchableOpacity>
                {showDonationMethodOptions && (
                  <View style={[styles.dropdownMenu, { backgroundColor: C.card, borderColor: C.border }]}>
                    {donationMethodOptions.map((option, index) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          setSupportDonationMethod(option.value);
                          setShowDonationMethodOptions(false);
                        }}
                        style={[
                          styles.dropdownOption,
                          index < donationMethodOptions.length - 1 && { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth },
                        ]}
                      >
                        <Text style={{ color: C.text, fontSize: FontSize.sm, fontWeight: option.value === supportDonationMethod ? '800' : '500' }}>
                          {option.label}
                        </Text>
                        {option.value === supportDonationMethod && (
                          <Ionicons name="checkmark-circle" size={16} color={C.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {selectedDonationMethod && (
                  <View
                    style={[
                      styles.paymentPreview,
                      {
                        backgroundColor: `${selectedDonationMethod.color}12`,
                        borderColor: `${selectedDonationMethod.color}35`,
                      },
                    ]}
                  >
                    <View style={[styles.methodIcon, { backgroundColor: `${selectedDonationMethod.color}18` }]}>
                      <Ionicons name={selectedDonationMethod.icon} size={19} color={selectedDonationMethod.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text style={{ color: selectedDonationMethod.color, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
                        {copy.paymentDestinationTitle.toUpperCase()}
                      </Text>
                      <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800', marginTop: 2 }}>
                        {selectedDonationMethod.label === 'E-Wallet Lainnya' ? copy.ewalletOther : selectedDonationMethod.label}
                      </Text>
                      <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                        {copy.accountOwnerLabel}: {selectedDonationMethod.name}
                      </Text>
                      <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '900', letterSpacing: 0.6, marginTop: 4 }}>
                        {copy.accountNumberLabel}: {selectedDonationMethod.number}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(selectedDonationMethod.number, 'support-payment')}
                      style={[
                        styles.copyBtn,
                        {
                          backgroundColor: copiedKey === 'support-payment' ? '#10B98120' : C.card,
                          borderColor: copiedKey === 'support-payment' ? '#10B981' : `${selectedDonationMethod.color}55`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={copiedKey === 'support-payment' ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color={copiedKey === 'support-payment' ? '#10B981' : selectedDonationMethod.color}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={handleSubmitSupport}
                activeOpacity={0.82}
                disabled={supportSubmitting}
                style={[styles.submitSupportBtn, { backgroundColor: C.primary, opacity: supportSubmitting ? 0.75 : 1 }]}
              >
                {supportSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={17} color="#fff" />
                )}
                <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '800', marginLeft: Spacing.sm }}>
                  {copy.submitSupport}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal Donasi ── */}
      <Modal visible={showDonation} transparent animationType="slide">
        <Pressable
          style={[styles.overlay, { backgroundColor: C.overlay }]}
          onPress={() => setShowDonation(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: C.surface }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: C.border }]} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg }}>
              <View style={[styles.donateIconBox, { backgroundColor: `${C.gold}20` }]}>
                <Ionicons name="heart" size={22} color={C.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: FontSize.lg, fontWeight: '800' }}>
                  {t('donation_title')}
                </Text>
                <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                  {t('choose_payment')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDonation(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: Spacing.sm }}>
              {DONATION_METHODS.map((method, i) => {
                const isCopied = copiedKey === `${i}`;
                return (
                  <View
                    key={i}
                    style={[styles.donationCard, { backgroundColor: C.card, borderColor: C.border }]}
                  >
                    <View style={[styles.methodIcon, { backgroundColor: `${method.color}15` }]}>
                      <Ionicons name={method.icon} size={20} color={method.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '600' }}>
                        {method.label === 'E-Wallet Lainnya' ? copy.ewalletOther : method.label}
                      </Text>
                      <Text style={{ color: C.text, fontSize: FontSize.md, fontWeight: '800', letterSpacing: 0.5 }}>
                        {method.number}
                      </Text>
                      <Text style={{ color: C.textSecondary, fontSize: 11 }}>
                        a.n. {method.name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(method.number, `${i}`)}
                      style={[
                        styles.copyBtn,
                        {
                          backgroundColor: isCopied ? '#10B98120' : C.primaryMuted,
                          borderColor: isCopied ? '#10B981' : C.primary,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isCopied ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color={isCopied ? '#10B981' : C.primary}
                      />
                      <Text style={{ color: isCopied ? '#10B981' : C.primary, fontSize: 10, fontWeight: '700', marginLeft: 3 }}>
                        {isCopied ? t('copied') : t('copy')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <View style={[styles.donationNote, { backgroundColor: `${C.gold}10`, borderColor: `${C.gold}25` }]}>
              <Ionicons name="information-circle-outline" size={14} color={C.gold} />
              <Text style={{ color: C.textSecondary, fontSize: 11, flex: 1, marginLeft: 6, lineHeight: 17 }}>
                {t('donation_note')}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  shell: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: Spacing.sm,
  },
  sectionBlock: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  preferencePanel: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  segmentButton: {
    minWidth: 42,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRail: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  quickTile: {
    width: 118,
    minHeight: 112,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPanel: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  dividerInset: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 42 + Spacing.md,
  },
  appInfo: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  donateIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: FontSize.md,
  },
  messageInput: {
    minHeight: 110,
    lineHeight: 21,
  },
  dropdownButton: {
    minHeight: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownMenu: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentPreview: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitSupportBtn: {
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  donationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  donationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
});
