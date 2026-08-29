// Lazy-load the Capacitor biometric plugin only when first needed.
// In a plain browser (npm run dev / Vercel), the module is unavailable
// and the code falls back to WebAuthn gracefully.
async function loadBiometricPlugin() {
  try {
    const mod = await import('capacitor-biometric-authentication')
    return { auth: mod.default, errorCode: mod.BiometricErrorCode }
  } catch {
    return { auth: null, errorCode: null }
  }
}

let _pluginPromise = null
function getPlugin() {
  if (!_pluginPromise) _pluginPromise = loadBiometricPlugin()
  return _pluginPromise
}

export const AUTH = {
  KEYS: { biometric: 'mt_biometric', pin: 'mt_pin_hash', lockEnabled: 'mt_lock_enabled' },

  async isBiometricSupported() {
    const { auth } = await getPlugin()
    if (auth) {
      return await auth.isAvailable()
    }
    return !!(navigator.credentials && navigator.credentials.create &&
              navigator.credentials.get && window.PublicKeyCredential)
  },

  isBiometricEnabled() {
    return !!localStorage.getItem(this.KEYS.biometric)
  },

  isPinEnabled() {
    return !!localStorage.getItem(this.KEYS.pin)
  },

  isLockEnabled() {
    return localStorage.getItem(this.KEYS.lockEnabled) === '1'
  },

  setLockEnabled(enabled) {
    localStorage.setItem(this.KEYS.lockEnabled, enabled ? '1' : '0')
  },

  async setupBiometric() {
    const { auth } = await getPlugin()
    if (auth) {
      const result = await auth.register({
        reason: 'Set up biometric unlock',
        title: 'Biometric Setup',
        subtitle: 'Enroll your fingerprint or face',
        fallbackTitle: 'Use PIN instead',
      })
      if (!result.success) {
        throw new Error(result.error?.message || 'Biometric setup cancelled')
      }
    } else {
      const publicKey = {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Money Tracker', id: location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'user',
          displayName: 'Money Tracker User'
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000
      }
      const cred = await navigator.credentials.create({ publicKey })
      localStorage.setItem(this.KEYS.biometric, JSON.stringify({
        id: cred.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(cred.rawId))),
        type: cred.type
      }))
    }
    if (!auth) {
      // WebAuthn path: credential already stored above — do NOT overwrite with '1'
      return
    }
    localStorage.setItem(this.KEYS.biometric, '1')
  },

  async verifyBiometric() {
    const { auth, errorCode } = await getPlugin()
    if (auth) {
      const result = await auth.authenticate({
        reason: 'Unlock Money Tracker',
        title: 'Biometric Login',
        fallbackTitle: 'Use PIN instead',
      })
      if (!result.success) {
        const code = result.error?.code
        if (code === errorCode?.USER_CANCELLED || code === errorCode?.BUTTON_CANCEL) {
          return false
        }
        if (code === errorCode?.NOT_ENROLLED) {
          throw new Error('No biometrics enrolled. Set up fingerprint or face unlock in your device settings.')
        }
        if (code === errorCode?.LOCKED_OUT) {
          throw new Error('Too many attempts. Unlock your device and try again.')
        }
        return false
      }
      return true
    }

    const stored = localStorage.getItem(this.KEYS.biometric)
    if (!stored || stored === '1') return false
    const parsed = JSON.parse(stored)
    const publicKey = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{
        type: parsed.type,
        id: new Uint8Array(atob(parsed.rawId).split('').map(c => c.charCodeAt(0))),
        transports: ['internal']
      }],
      timeout: 60000
    }
    const cred = await navigator.credentials.get({ publicKey })
    return !!cred
  },

  async setPin(pin) {
    const buf = new TextEncoder().encode(pin)
    const hash = await crypto.subtle.digest('SHA-256', buf)
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(this.KEYS.pin, hex)
  },

  async verifyPin(pin) {
    const stored = localStorage.getItem(this.KEYS.pin)
    if (!stored) return false
    const buf = new TextEncoder().encode(pin)
    const hash = await crypto.subtle.digest('SHA-256', buf)
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    return hex === stored
  },

  async changePin(oldPin, newPin) {
    const ok = await this.verifyPin(oldPin)
    if (!ok) return { ok: false, error: 'Incorrect PIN' }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return { ok: false, error: 'PIN must be exactly 4 digits' }
    }
    await this.setPin(newPin)
    return { ok: true }
  },

  isUnlocked() {
    return sessionStorage.getItem('mt_unlocked') === '1'
  },

  unlock() {
    sessionStorage.setItem('mt_unlocked', '1')
  },

  lock() {
    sessionStorage.removeItem('mt_unlocked')
  },

  clearLock() {
    localStorage.removeItem(this.KEYS.biometric)
    localStorage.removeItem(this.KEYS.pin)
    this.setLockEnabled(false)
    this.lock()
  },

  removePin() {
    localStorage.removeItem(this.KEYS.pin)
    if (!this.isBiometricEnabled()) {
      this.setLockEnabled(false)
    }
  },

  removeBiometric() {
    localStorage.removeItem(this.KEYS.biometric)
    if (!this.isPinEnabled()) {
      this.setLockEnabled(false)
    }
  },

  // Recovery: clears biometric (and PIN if present) and unlocks — use only as last resort
  recoverFromBiometricOnly() {
    localStorage.removeItem(this.KEYS.biometric)
    localStorage.removeItem(this.KEYS.pin)
    this.setLockEnabled(false)
    this.lock()
  }
}
