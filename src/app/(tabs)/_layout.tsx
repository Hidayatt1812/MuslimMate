import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LogoSvgIcon } from '@/components/LogoSvgIcon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguageStore } from '@/stores/languageStore';
import { translations } from '@/constants/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const C = Colors[colorScheme];
  const lang = useLanguageStore(s => s.lang);
  const tr = translations[lang];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tr.tab_home,
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size ?? 24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: tr.tab_quran,
          tabBarIcon: ({ color, size }) => (
            <LogoSvgIcon name="quran" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: tr.tab_prayer,
          tabBarIcon: ({ color, size }) => (
            <LogoSvgIcon name="mosque" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dhikr"
        options={{
          title: tr.tab_dhikr,
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size ?? 24} name="heart.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: tr.tab_more,
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size ?? 24} name="ellipsis" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
