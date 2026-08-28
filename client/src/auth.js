export const AUTH = {
  KEYS: { biometric: 'mt_biometric', pin: 'mt_pin_hash' },

  isBiometricSupported() {
    return !!(navigator.credentials && navigator.credentials.create &&
              navigator.credentials.get && window.PublicKeyCredential)
  },

  isBiometricEnabled() {
    return !!localStorage.getItem(this.KEYS.biometric)
  },

  isPinEnabled() {
    return !!localStorage.getItem(this.KEYS.pin)
  },

  async setupBiometric() {
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
  },

  async verifyBiometric() {
    const stored = JSON.parse(localStorage.getItem(this.KEYS.biometric))
    if (!stored) return false
    const publicKey = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{
        type: stored.type,
        id: new Uint8Array(atob(stored.rawId).split('').map(c => c.charCodeAt(0))),
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

  isUnlocked() {
    return sessionStorage.getItem('mt_unlocked') === '1'
  },

  unlock() {
    sessionStorage.setItem('mt_unlocked', '1')
  },

  lock() {
    sessionStorage.removeItem('mt_unlocked')
  }
}
