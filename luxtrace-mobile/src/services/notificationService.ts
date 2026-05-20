import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { API_BASE_URL } from '@/constants/config'

/**
 * Register for push notifications and sync the token with the database profiles table.
 */
export const registerForPushNotifications = async (authToken: string) => {
  if (!Device.isDevice) {
    console.log('[NotificationService] Simulators cannot receive native push notifications')
    return
  }

  try {
    // Check if the required native module is registered in the global Expo modules registry
    const isPushModuleAvailable = !!(global as any).expo?.modules?.ExpoPushTokenManager;
    if (!isPushModuleAvailable) {
      console.warn('[NotificationService] Native module ExpoPushTokenManager is not available. Skipping registration.')
      return
    }

    // Dynamically import expo-notifications to avoid crashes if native modules aren't linked/present
    const Notifications = await import('expo-notifications')

    // Configure notification behavior for active app
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Push notification permissions denied')
      return
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId

    const expoToken = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data

    console.log('[NotificationService] Expo Push Token:', expoToken)

    // Save token to backend
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ avatar_url: expoToken }),
    })

    if (!response.ok) {
      console.warn('[NotificationService] Failed to sync push token with backend:', await response.text())
    } else {
      console.log('[NotificationService] Push token successfully synced with backend!')
    }
  } catch (error) {
    console.error('[NotificationService] Error during push token registration:', error)
  }
}
