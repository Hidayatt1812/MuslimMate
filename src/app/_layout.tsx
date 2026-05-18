import 'react-native-url-polyfill/auto'; // Diperlukan oleh Supabase di React Native
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import QuranMiniPlayer from '@/components/quran/QuranMiniPlayer';
import { useLanguageStore } from '@/stores/languageStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    useLanguageStore.getState().init();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="quran/[surahId]"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: C.background },
              animation: 'slide_from_right',
              animationTypeForReplace: 'push',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen name="qibla" options={{ headerShown: false }} />
          <Stack.Screen name="tracker" options={{ headerShown: false }} />
          <Stack.Screen name="statistics" options={{ headerShown: false }} />
          <Stack.Screen name="fasting" options={{ headerShown: false }} />
          <Stack.Screen name="tahfidz/index" options={{ headerShown: false }} />
          <Stack.Screen name="tahfidz/[planId]" options={{ headerShown: false }} />
          <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
          <Stack.Screen name="quran-finder" options={{ headerShown: false }} />
          <Stack.Screen name="hijri-calendar" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <QuranMiniPlayer />
      </View>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
