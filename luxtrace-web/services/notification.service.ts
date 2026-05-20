import { profileRepository } from '@/repositories/profile.repository'

export const notificationService = {
  /**
   * Send an Expo Push Notification to a user
   */
  async sendPushNotification(userId: string, title: string, body: string) {
    try {
      const profile = await profileRepository.findByUserId(userId)
      if (!profile || !profile.avatar_url) {
        console.log(`User ${userId} does not have a registered profile or token`)
        return
      }

      const token = profile.avatar_url.trim()
      if (!token.startsWith('ExponentPushToken[')) {
        console.log(`User ${userId} does not have a valid Expo push token (avatar_url: ${token})`)
        return
      }

      console.log(`[Push Notification] Sending to user ${userId} (${token}): ${title} - ${body}`)

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title,
          body,
        }),
      })

      const resData = await response.json()
      console.log('[Push Notification] Expo API response:', JSON.stringify(resData))
    } catch (error) {
      console.error('[Push Notification] Failed to send push notification:', error)
    }
  }
}
