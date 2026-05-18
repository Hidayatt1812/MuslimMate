import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  QF_CLIENT_ID,
  QF_DISCOVERY,
  QF_SCOPES,
  exchangeQFCode,
  saveQFTokens,
  clearQFSession,
  isQFLoggedIn,
} from '@/services/quranFoundationAuthService';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'muslimmate', path: 'oauth' });

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: QF_CLIENT_ID,
      scopes: QF_SCOPES,
      redirectUri: REDIRECT_URI,
      usePKCE: true,
    },
    QF_DISCOVERY
  );

  useEffect(() => {
    isQFLoggedIn().then(v => {
      setLoggedIn(v);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && request?.codeVerifier) {
      handleCodeExchange(response.params.code, request.codeVerifier);
    } else if (response?.type === 'error') {
      Alert.alert('Login Gagal', response.error?.message ?? 'Terjadi kesalahan saat login');
    }
  }, [response, request?.codeVerifier]);

  async function handleCodeExchange(code: string, codeVerifier: string) {
    setLoading(true);
    try {
      const tokens = await exchangeQFCode(code, codeVerifier, REDIRECT_URI);
      await saveQFTokens(tokens);
      setLoggedIn(true);
      Alert.alert('Berhasil', 'Akun Quran.com kamu sudah terhubung!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Login Gagal', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Keluar', 'Yakin ingin memutuskan koneksi dengan Quran.com?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await clearQFSession();
          setLoggedIn(false);
        },
      },
    ]);
  }

  if (checking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Quran.com</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: '#10B98120' }]}>
            <Image
              source={require('../../assets/logo/logo-transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appName, { color: C.text }]}>Hubungkan Akun</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            Sinkronisasi dengan Quran.Foundation
          </Text>
        </View>

        {loggedIn ? (
          /* ── Sudah login ── */
          <View style={styles.section}>
            <View style={[styles.connectedBadge, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.connectedText}>Terhubung dengan Quran.com</Text>
            </View>

            <View style={[styles.featureList, { backgroundColor: C.card, borderColor: C.border }]}>
              {FEATURES.map((f, i) => (
                <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <Ionicons name={f.icon} size={18} color="#10B981" />
                  <Text style={[styles.featureText, { color: C.text }]}>{f.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.logoutBtn, { borderColor: C.border }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color={C.textSecondary} />
              <Text style={[styles.logoutText, { color: C.textSecondary }]}>Putuskan Koneksi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Belum login ── */
          <View style={styles.section}>
            <View style={[styles.featureList, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.featureTitle, { color: C.textMuted }]}>KEUNTUNGAN TERHUBUNG</Text>
              {FEATURES.map((f, i) => (
                <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <Ionicons name={f.icon} size={18} color="#10B981" />
                  <Text style={[styles.featureText, { color: C.text }]}>{f.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, (!request || loading) && styles.disabled]}
              onPress={() => promptAsync()}
              disabled={!request || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={styles.loginText}>Login dengan Quran.com</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.note, { color: C.textMuted }]}>
              Menggunakan OAuth 2.0 dari Quran.Foundation.{'\n'}
              Redirect URI: {REDIRECT_URI}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  { icon: 'bookmark' as const, label: 'Sinkronisasi bookmark ayat lintas perangkat' },
  { icon: 'time-outline' as const, label: 'Rekam sesi tilawah & progres membaca' },
  { icon: 'cloud-done-outline' as const, label: 'Data tersimpan aman di Quran.Foundation' },
  { icon: 'phone-portrait-outline' as const, label: 'Akses dari quran.com dan app lainnya' },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700' },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  logoArea: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  logoImage: { width: 72, height: 72 },
  appName: { fontSize: FontSize.xl, fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, textAlign: 'center' },
  section: { gap: Spacing.md },
  connectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.lg, borderWidth: 1,
    padding: Spacing.md,
  },
  connectedText: { color: '#10B981', fontWeight: '700', fontSize: FontSize.sm },
  featureList: {
    borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden',
  },
  featureTitle: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  featureText: { fontSize: FontSize.sm, flex: 1 },
  loginBtn: {
    backgroundColor: '#10B981', borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  disabled: { opacity: 0.5 },
  loginText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  logoutText: { fontSize: FontSize.sm },
  note: { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },
});
