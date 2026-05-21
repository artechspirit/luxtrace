import { Tabs, useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import Ionicons from '@expo/vector-icons/Ionicons'

export default function OperatorTabsLayout() {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const router = useRouter()

  // Double-guard: if somehow a non-operator reaches here, redirect
  useEffect(() => {
    if (user && user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
      router.replace('/(tabs)')
    }
  }, [user])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C9A84C',
        tabBarInactiveTintColor: '#4a5568',
        tabBarStyle: [
          styles.tabBar,
          {
            height: Platform.OS === 'ios'
              ? 50 + (insets.bottom > 0 ? insets.bottom : 12)
              : 60 + (insets.bottom > 0 ? insets.bottom : 8),
            paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 12 : 8),
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'INVENTORY',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'storefront' : 'storefront-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activate"
        options={{
          title: 'ACTIVATE',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'radio' : 'radio-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'SELL',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 168, 76, 0.1)',
    paddingTop: 10,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 2,
  },
})
