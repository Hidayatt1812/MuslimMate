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
  isQFProxyConfigured,
  getQFSessionStatus,
} from '@/services/quranFoundationAuthService';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URI =
  process.env.EXPO_PUBLIC_QF_REDIRECT_URI ??
  AuthSession.makeRedirectUri({ scheme: 'muslimmate', path: 'oauth' });

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const configured = isQFProxyConfigured();
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionScope, setSessionScope] = useState<string | undefined>();

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
    getQFSessionStatus().then(status => {
      setLoggedIn(status.loggedIn);
      setSessionScope(status.scope);
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
      setSessionScope(tokens.scope);
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
          setSessionScope(undefined);
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
            Sinkronisasi aman melalui Quran Foundation API
          </Text>
        </View>

        {loggedIn ? (
          /* ── Sudah login ── */
          <View style={styles.section}>
            <View style={[styles.connectedBadge, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.connectedText}>Terhubung dengan Quran.com</Text>
            </View>
            <Text style={[styles.syncNote, { color: C.textSecondary }]}>
              Bookmark dan sesi baca dikirim melalui backend proxy MuslimMate. Secret API tetap berada di server.
            </Text>
            {sessionScope ? (
              <View style={[styles.scopePill, { borderColor: C.border, backgroundColor: C.card }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
                <Text style={{ color: C.textMuted, fontSize: FontSize.xs, flex: 1 }} numberOfLines={2}>
                  Scope aktif: {sessionScope}
                </Text>
              </View>
            ) : null}

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
            {!configured && (
              <View style={[styles.configWarning, { backgroundColor: '#F59E0B14', borderColor: '#F59E0B45' }]}>
                <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                <Text style={{ color: C.textSecondary, fontSize: FontSize.xs, flex: 1, lineHeight: 18 }}>
                  Proxy Quran Foundation belum dikonfigurasi. Isi EXPO_PUBLIC_QF_CLIENT_ID dan EXPO_PUBLIC_QF_PROXY_BASE_URL untuk mengaktifkan login.
                </Text>
              </View>
            )}
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
              style={[styles.loginBtn, (!configured || !request || loading) && styles.disabled]}
              onPress={() => promptAsync()}
              disabled={!configured || !request || loading}
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
              Menggunakan OAuth 2.0 + PKCE dari Quran.Foundation.{'\n'}
              Token exchange dan User API diproses lewat backend proxy.
            </Text>

            <View style={[styles.redirectBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.redirectLabel, { color: C.textMuted }]}>REDIRECT URI AKTIF</Text>
              <Text selectable style={[styles.redirectValue, { color: C.text }]}>
                {REDIRECT_URI}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  { icon: 'bookmark' as const, label: 'Sinkronisasi bookmark ayat lintas perangkat' },
  { icon: 'time-outline' as const, label: 'Rekam sesi tilawah & progres membaca' },
  { icon: 'shield-checkmark-outline' as const, label: 'QF client secret tersimpan di backend proxy' },
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
  syncNote: { fontSize: FontSize.xs, lineHeight: 18 },
  scopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  configWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
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
  redirectBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 6,
  },
  redirectLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0 },
  redirectValue: { fontSize: FontSize.xs, lineHeight: 18 },
});
