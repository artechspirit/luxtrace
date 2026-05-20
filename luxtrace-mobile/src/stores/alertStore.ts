import { create } from 'zustand'

export interface AlertButton {
  text: string
  onPress?: () => void
  style?: 'default' | 'cancel' | 'destructive'
}

interface AlertState {
  isOpen: boolean
  title: string
  message: string
  buttons: AlertButton[]
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void
  hideAlert: () => void
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  buttons: [],
  showAlert: (title, message, buttons) => {
    set({
      isOpen: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK' }]
    })
  },
  hideAlert: () => set({ isOpen: false, title: '', message: '', buttons: [] })
}))
