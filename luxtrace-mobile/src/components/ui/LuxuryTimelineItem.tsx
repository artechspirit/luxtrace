import React from 'react'
import { StyleSheet, View, Text, Platform } from 'react-native'

interface LuxuryTimelineItemProps {
  title: string
  actor: string
  date: string
  time?: string
  isLast?: boolean
  isFraud?: boolean
  children?: React.ReactNode
}

export function LuxuryTimelineItem({
  title,
  actor,
  date,
  time,
  isLast = false,
  isFraud = false,
  children,
}: LuxuryTimelineItemProps) {
  const accentColor = isFraud ? '#FF0055' : '#00FFB2'

  return (
    <View style={styles.timelineItem}>
      {/* Date and Time column */}
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{date}</Text>
        {time && <Text style={styles.subTimeText}>{time}</Text>}
      </View>

      {/* Vertical timeline node indicator */}
      <View style={styles.nodeColumn}>
        <View style={[styles.outerNodeCircle, isFraud && styles.outerCircleRed]}>
          <View style={[
            styles.innerNodeDot,
            { backgroundColor: accentColor },
            isFraud ? styles.glowRed : styles.glowGreen,
          ]} />
        </View>
        {!isLast && <View style={[styles.timelineLine, isFraud && styles.timelineLineRed]} />}
      </View>

      {/* Content details card column */}
      <View style={styles.cardColumn}>
        <View style={[styles.eventCard, isFraud && styles.eventCardRed]}>
          <Text style={[styles.eventTitle, { color: accentColor }]}>
            {title}
          </Text>
          <Text style={styles.eventActor}>
            ACTOR: {actor.toUpperCase()}
          </Text>
          {children}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
    minHeight: 90,
  },
  timeColumn: {
    width: 65,
    paddingRight: 10,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  subTimeText: {
    color: '#4a5568',
    fontSize: 9,
    marginTop: 2,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  nodeColumn: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  outerNodeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 255, 178, 0.1)',
    borderColor: 'rgba(0, 255, 178, 0.25)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  outerCircleRed: {
    backgroundColor: 'rgba(255, 0, 85, 0.1)',
    borderColor: 'rgba(255, 0, 85, 0.3)',
  },
  innerNodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  glowGreen: {
    shadowColor: '#00FFB2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  glowRed: {
    shadowColor: '#FF0055',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: 'rgba(0, 255, 178, 0.15)',
    position: 'absolute',
    top: 18,
    bottom: -18,
    zIndex: 1,
  },
  timelineLineRed: {
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
  },
  cardColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  eventCard: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    padding: 14,
  },
  eventCardRed: {
    borderColor: 'rgba(255, 0, 85, 0.15)',
    backgroundColor: 'rgba(255, 0, 85, 0.02)',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  eventActor: {
    color: '#718096',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
})
