import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { registerForPushNotifications } from '@/services/notificationService';
import { GlobalAlert } from '@/components/ui/GlobalAlert';
import '../global.css';

export default function RootLayout() {
  const { isAuthenticated, loadSession, isLoading, token, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      registerForPushNotifications(token).catch((err) =>
        console.error('[RootLayout] Notification registration error:', err)
      );
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthCallback = segments[0] === 'auth-callback';

    // Case 1: Not logged in → force to login
    if (!isAuthenticated && !inAuthGroup && !isAuthCallback) {
      router.replace('/(auth)/login');
      return;
    }

    // Case 2: Logged in but still on auth screen → route by role
    if (isAuthenticated && inAuthGroup) {
      const role = user?.role;
      console.log('[RootLayout] Authenticated on auth screen, role:', role, '→ routing');
      if (role === 'OPERATOR' || role === 'ADMIN') {
        router.replace('/(operator)');
      } else {
        router.replace('/(tabs)');
      }
    }

    // All other cross-group enforcement is handled by each group's own _layout guard
  }, [isAuthenticated, user, segments, isLoading, fontsLoaded]);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00FFB2" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay />
      <GlobalAlert />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth-callback" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(operator)" />
        <Stack.Screen name="(consumer)/scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="products/[id]" />
      </Stack>
    </ThemeProvider>
  );
}

