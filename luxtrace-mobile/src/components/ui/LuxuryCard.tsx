import React from 'react'
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native'

interface LuxuryCardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  glow?: boolean
}

export function LuxuryCard({ children, style, glow = false }: LuxuryCardProps) {
  return (
    <View style={[
      styles.card,
      glow && styles.glow,
      style
    ]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 42, 37, 0.12)',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 255, 178, 0.18)',
    padding: 20,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
  },
  glow: {
    shadowColor: '#00FFB2',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    borderColor: 'rgba(0, 255, 178, 0.35)',
    backgroundColor: 'rgba(15, 42, 37, 0.18)',
  },
})
