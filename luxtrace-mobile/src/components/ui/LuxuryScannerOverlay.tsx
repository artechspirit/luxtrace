import React from 'react'
import { StyleSheet, View, Text, Platform } from 'react-native'

interface LuxuryScannerOverlayProps {
  title?: string
  subtitle?: string
}

export function LuxuryScannerOverlay({
  title = 'SCAN QR CODE',
  subtitle = 'Align within the glowing frame boundary',
}: LuxuryScannerOverlayProps) {
  return (
    <View style={styles.overlayContainer}>
      <View style={styles.headerSpacer}>
        <Text style={styles.instructionText}>{title}</Text>
        <Text style={styles.instructionSubtext}>{subtitle}</Text>
      </View>

      <View style={styles.scannerRow}>
        <View style={styles.opaqueSide} />
        <View style={styles.scanTarget}>
          {/* Glowing frame borders */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          {/* Scanning line indicator */}
          <View style={styles.scanLine} />
        </View>
        <View style={styles.opaqueSide} />
      </View>

      <View style={styles.footerSpacer} />
    </View>
  )
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerSpacer: {
    height: '25%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.7)',
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  instructionSubtext: {
    color: '#00FFB2',
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 1,
  },
  scannerRow: {
    flexDirection: 'row',
    height: 250,
  },
  opaqueSide: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.7)',
  },
  scanTarget: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#00FFB2',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#00FFB2',
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  footerSpacer: {
    height: '25%',
    backgroundColor: 'rgba(10,10,10,0.7)',
  },
})
