import { registerPlugin, Capacitor } from '@capacitor/core'

export const NativeTheme = registerPlugin('NativeTheme', {
  web: {
    async setRecentsTheme() {
      // No-op in browser environment
      return
    }
  }
})

/**
 * Sync the given resolved theme ('light' or 'dark') with Android native layer.
 * @param {'light' | 'dark'} resolvedTheme
 */
export async function syncNativeTheme(resolvedTheme) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }
  try {
    await NativeTheme.setRecentsTheme({ theme: resolvedTheme })
  } catch (err) {
    console.warn('Failed to sync theme with native Android:', err)
  }
}

