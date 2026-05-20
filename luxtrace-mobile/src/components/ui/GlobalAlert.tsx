import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAlertStore } from '@/stores/alertStore'

export const GlobalAlert = () => {
  const { isOpen, title, message, buttons, hideAlert } = useAlertStore()

  if (!isOpen) return null

  const isMultiLine = buttons.length > 2

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View style={styles.backdrop}>
        <View style={styles.alertCard}>
          {/* Decorative Top Glow Bar */}
          <View style={styles.glowBar} />

          {/* Title */}
          {title ? (
            <Text style={styles.titleText}>{title.toUpperCase()}</Text>
          ) : null}

          {/* Message */}
          {message ? <Text style={styles.messageText}>{message}</Text> : null}

          {/* Buttons Row / Column */}
          <View style={[styles.buttonContainer, { flexDirection: isMultiLine ? 'column' : 'row' }]}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel'
              const isDestructive = btn.style === 'destructive'

              // Determine style overrides
              let buttonBg = '#00FFB2'
              let buttonText = '#0A0A0A'
              let borderStyle = {}

              if (isCancel) {
                buttonBg = 'transparent'
                buttonText = '#718096'
                borderStyle = { borderWidth: 1.5, borderColor: 'rgba(113, 128, 150, 0.3)' }
              } else if (isDestructive) {
                buttonBg = '#ff0055'
                buttonText = '#FFFFFF'
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    { backgroundColor: buttonBg },
                    borderStyle,
                    isMultiLine
                      ? { width: '100%', marginBottom: 8 }
                      : { flex: 1, marginHorizontal: 4 }
                  ]}
                  onPress={() => {
                    hideAlert()
                    if (btn.onPress) {
                      btn.onPress()
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, { color: buttonText }]}>
                    {btn.text.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 178, 0.2)',
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#00FFB2',
  },
  titleText: {
    fontSize: 13,
    color: '#00FFB2',
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  messageText: {
    fontSize: 12,
    color: '#a0aec0',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
})
