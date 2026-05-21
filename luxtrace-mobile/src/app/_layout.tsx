import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
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
  const { isAuthenticated, loadSession, isLoading, token } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Only OPERATOR or ADMIN roles get operator access — never treat undefined/null as operator
  const isOperator = (role: string | null | undefined) =>
    role === 'OPERATOR' || role === 'ADMIN';

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
    const inOperatorGroup = segments[0] === '(operator)';
    const inConsumerGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup && !isAuthCallback) {
      // Not logged in → force login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but on auth screen → route by role
      const role = useAuthStore.getState().user?.role;
      if (isOperator(role)) {
        router.replace('/(operator)');
      } else {
        router.replace('/');
      }
    } else if (isAuthenticated && !inAuthGroup && !isAuthCallback) {
      // Logged in — enforce role-based group access
      const role = useAuthStore.getState().user?.role;
      const isOperatorRole = isOperator(role);

      if (isOperatorRole && inConsumerGroup) {
        // Operator accidentally in consumer group → redirect to operator
        router.replace('/(operator)');
      } else if (!isOperatorRole && inOperatorGroup) {
        // Consumer accidentally in operator group → redirect to consumer
        router.replace('/');
      } else if (isOperatorRole && !inOperatorGroup && !inConsumerGroup && !isAuthCallback) {
        // Operator on root or unknown route → go to operator dashboard
        if (segments[0] === undefined) {
          router.replace('/(operator)');
        }
      }
    }
  }, [isAuthenticated, segments, isLoading, fontsLoaded]);

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
