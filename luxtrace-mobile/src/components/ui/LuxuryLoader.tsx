import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ActivityIndicator,
  Platform,
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

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      return
    }

    // Determine interval to span exactly 12.5 seconds for the steps
    const stepDuration = 12500 / steps.length
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1
        } else {
          clearInterval(interval)
          // Timeout slightly to allow reading the final step, then call finish
          setTimeout(() => {
            onFinished()
          }, 1000)
          return prev
        }
      })
    }, stepDuration)

    return () => {
      clearInterval(interval)
    }
  }, [isOpen, steps])

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isOpen}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Animated Spinner with outer neon shadow glow */}
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color="#00FFB2" />
          </View>

          {/* Heading */}
          <Text style={styles.titleText}>{title}</Text>

          {/* Current Step Description with smooth indicator */}
          <View style={styles.stepBox}>
            <Text style={styles.stepText}>{steps[currentStep]}</Text>
          </View>

          {/* Glow ProgressBar indicator */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentStep + 1) / steps.length) * 100}%` },
              ]}
            />
          </View>

          {/* Subtext info */}
          <Text style={styles.secureText}>
            SECURED BY ETHEREUM SEPOLIA GASLESS ROUTER
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: 'rgba(15, 42, 37, 0.15)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 178, 0.25)',
    padding: 30,
    alignItems: 'center',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  spinnerContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0A0A0A',
    borderColor: 'rgba(0, 255, 178, 0.15)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  titleText: {
    color: '#00FFB2',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  stepBox: {
    height: 48,
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Medium',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00FFB2',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  secureText: {
    color: '#718096',
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Bold',
  },
})
