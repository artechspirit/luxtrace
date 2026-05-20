import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native'

interface LuxuryButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export function LuxuryButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: LuxuryButtonProps) {
  const isPrimary = variant === 'primary'
  const isDanger = variant === 'danger'

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary && styles.primaryBtn,
        variant === 'secondary' && styles.secondaryBtn,
        isDanger && styles.dangerBtn,
        (disabled || loading) && styles.disabledBtn,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#0A0A0A' : isDanger ? '#ef4444' : '#00FFB2'} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            isDanger && styles.dangerText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  primaryBtn: {
    backgroundColor: '#00FFB2',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderColor: '#00FFB2',
    borderWidth: 1.5,
  },
  dangerBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1.5,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  primaryText: {
    color: '#0A0A0A',
  },
  secondaryText: {
    color: '#00FFB2',
  },
  dangerText: {
    color: '#ef4444',
  },
})
