import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00FFB2',
        tabBarInactiveTintColor: '#718096',
        tabBarStyle: [
          styles.tabBar,
          {
            height: Platform.OS === 'ios'
              ? 50 + (insets.bottom > 0 ? insets.bottom : 12)
              : 60 + (insets.bottom > 0 ? insets.bottom : 8),
            paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 12 : 8),
          }
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ESCROWS',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/home.png')}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'MY VAULT',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 12,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  tabIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
});
