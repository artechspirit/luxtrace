import React, { useEffect, useState, useRef } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Platform,
  Animated,
  Easing,
} from 'react-native'

interface LuxuryLoaderProps {
  isOpen: boolean
  title?: string
  steps?: string[]
  onFinished: () => void
}

const DEFAULT_STEPS = [
  'Initializing Sepolia Web3 handshake...',
  'Broadcasting transaction to Ethereum network...',
  'Awaiting proof-of-authority block finality (~12s)...',
  'Validating hardware signature via NFC-gate...',
  'Updating digital twin ownership records...',
]

export function LuxuryLoader({
  isOpen,
  title = 'EXECUTING BLOCKCHAIN SYNC',
  steps = DEFAULT_STEPS,
  onFinished,
}: LuxuryLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const rotateAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      rotateAnim.setValue(0)
      pulseAnim.setValue(0.8)
      return
    }

    // Determine interval to span exactly 12.5 seconds for the steps
    const stepDuration = 12500 / steps.length
    
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1
        } else {
          clearInterval(stepInterval)
          // Timeout slightly to allow reading the final step, then call finish
          setTimeout(() => {
            onFinished()
          }, 1000)
          return prev
        }
      })
    }, stepDuration)

    // Spin animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()

    // Pulse animation for core dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start()

    return () => {
      clearInterval(stepInterval)
    }
  }, [isOpen, steps])

  // Interpolations for spinning
  const outerRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  })

  const innerRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  })

  const pulseStyle = {
    transform: [{ scale: pulseAnim }],
    opacity: pulseAnim.interpolate({
      inputRange: [0.8, 1.2],
      outputRange: [0.6, 1.0],
    }),
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isOpen}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Glowing background hint */}
          <View style={styles.bgGlow} />

          {/* Concentric Rotating Rings Spinner */}
          <View style={styles.spinnerWrapper}>
            {/* Outer ring */}
            <Animated.View
              style={[
                styles.outerRing,
                { transform: [{ rotate: outerRotate }] },
              ]}
            />
            {/* Inner ring */}
            <Animated.View
              style={[
                styles.innerRing,
                { transform: [{ rotate: innerRotate }] },
              ]}
            />
            {/* Core pulsing dot */}
            <Animated.View style={[styles.coreDot, pulseStyle]} />
          </View>

          {/* Heading */}
          <Text style={styles.titleText}>{title}</Text>

          {/* Current Step (Pulsing / Glowing text) */}
          <Text style={styles.currentStepText}>{steps[currentStep]}</Text>

          {/* Steps List */}
          <View style={styles.stepsListContainer}>
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStep
              const isActive = idx === currentStep
              return (
                <View key={idx} style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepDot,
                      isCompleted && styles.stepDotCompleted,
                      isActive && styles.stepDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepItemText,
                      isCompleted && styles.stepTextCompleted,
                      isActive && styles.stepTextActive,
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Footer info */}
          <Text style={styles.secureText}>
            DO NOT CLOSE OR REFRESH THIS APP
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: 'rgba(11, 15, 14, 0.65)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 178, 0.1)',
    padding: 30,
    alignItems: 'center',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 200,
    backgroundColor: 'rgba(0, 255, 178, 0.02)',
    pointerEvents: 'none',
  },
  spinnerWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  outerRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#00FFB2',
    borderBottomColor: 'rgba(0, 255, 178, 0.2)',
  },
  innerRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRightColor: '#00E6A8',
    borderLeftColor: 'rgba(0, 230, 168, 0.2)',
  },
  coreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00FFB2',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Bold',
    textTransform: 'uppercase',
  },
  currentStepText: {
    color: '#00FFB2',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 24,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    height: 24,
  },
  stepsListContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 20,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27272A', // zinc-800
    marginRight: 12,
  },
  stepDotCompleted: {
    backgroundColor: '#00FFB2',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  stepDotActive: {
    backgroundColor: '#00FFB2',
  },
  stepItemText: {
    color: '#52525B', // zinc-600
    fontSize: 10.5,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  stepTextCompleted: {
    color: '#71717A', // zinc-500
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: '#27272A',
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  secureText: {
    color: '#718096',
    fontSize: 8.5,
    letterSpacing: 1.5,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Bold',
    textTransform: 'uppercase',
  },
})
