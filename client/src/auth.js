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

// ── PIN hashing helpers ──
//
// The app lock is a UI gate, not encryption: everything in localStorage
// (including mt_entries) is readable by anyone with access to the device or
// a devtools console. This code only makes the PIN itself expensive to
// brute-force; it does not protect the transaction data.

const PBKDF2_ITERATIONS = 150000
const PIN_MAX_ATTEMPTS = 5
// Escalating lockouts applied on the 5th, 10th, 15th... consecutive failure.
const PIN_LOCK_DELAYS_MS = [30 * 1000, 60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000]
const OLD_PIN_HEX = /^[0-9a-f]{64}$/i

const bytesToB64 = (bytes) => btoa(String.fromCharCode(...bytes))
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

async function sha256Hex(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function derivePin(pin, salt, iterations) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256
  )
  return new Uint8Array(bits)
}

// Length-independent, early-exit-free comparison.
function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

// The app lock is a UI gate. Data in localStorage is NOT encrypted — see the
// note above the hashing helpers.
export const AUTH = {
  KEYS: {
    biometric: 'mt_biometric',
    pin: 'mt_pin_hash',
    lockEnabled: 'mt_lock_enabled',
    pinFails: 'mt_pin_fails',
    pinLockUntil: 'mt_pin_lock_until',
  },

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
    const stored = localStorage.getItem(this.KEYS.pin)
    if (!stored) return false
    if (OLD_PIN_HEX.test(stored)) return true
    try {
      const rec = JSON.parse(stored)
      return !!(rec && rec.v === 2 && rec.salt && rec.hash)
    } catch {
      return false
    }
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
        reason: 'Confirm to enable biometric unlock',
        title: 'Biometric Setup',
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
        if (code === errorCode?.NOT_ENROLLED || code === errorCode?.NO_CREDENTIALS) {
          // Credential flag is set but no native key exists (first-time
          // enrollment didn't actually persist, or the OS cleared the key).
          // Throw a distinguishable error so the caller can auto-re-enroll.
          throw new Error('NO_CREDENTIALS: ' + (result.error?.message || 'No credential registered'))
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
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const hash = await derivePin(pin, salt, PBKDF2_ITERATIONS)
    localStorage.setItem(this.KEYS.pin, JSON.stringify({
      v: 2,
      salt: bytesToB64(salt),
      hash: bytesToB64(hash),
      iter: PBKDF2_ITERATIONS,
    }))
    this.resetPinFailures()
  },

  async verifyPin(pin) {
    if (this.getPinLockRemainingMs() > 0) return false
    const stored = localStorage.getItem(this.KEYS.pin)
    if (!stored) return false

    let ok = false
    let needsUpgrade = false

    if (OLD_PIN_HEX.test(stored)) {
      // Legacy v1 record: unsalted SHA-256 hex. Verify, then upgrade in place.
      ok = (await sha256Hex(pin)) === stored.toLowerCase()
      needsUpgrade = ok
    } else {
      try {
        const rec = JSON.parse(stored)
        if (rec && rec.v === 2 && rec.salt && rec.hash) {
          const iterations = Number(rec.iter) || PBKDF2_ITERATIONS
          const derived = await derivePin(pin, b64ToBytes(rec.salt), iterations)
          ok = constantTimeEqual(derived, b64ToBytes(rec.hash))
        }
      } catch {
        ok = false
      }
    }

    if (!ok) {
      this.recordPinFailure()
      return false
    }

    this.resetPinFailures()
    if (needsUpgrade) await this.setPin(pin)
    return true
  },

  /** Milliseconds until PIN entry is allowed again (0 when not locked). */
  getPinLockRemainingMs() {
    const until = Number(localStorage.getItem(this.KEYS.pinLockUntil) || '0')
    const remaining = until - Date.now()
    if (remaining <= 0) {
      if (until) localStorage.removeItem(this.KEYS.pinLockUntil)
      return 0
    }
    return remaining
  },

  recordPinFailure() {
    const fails = Number(localStorage.getItem(this.KEYS.pinFails) || '0') + 1
    localStorage.setItem(this.KEYS.pinFails, String(fails))
    if (fails % PIN_MAX_ATTEMPTS === 0) {
      const tier = Math.min(
        Math.floor(fails / PIN_MAX_ATTEMPTS) - 1,
        PIN_LOCK_DELAYS_MS.length - 1
      )
      localStorage.setItem(this.KEYS.pinLockUntil, String(Date.now() + PIN_LOCK_DELAYS_MS[tier]))
    }
    return fails
  },

  resetPinFailures() {
    localStorage.removeItem(this.KEYS.pinFails)
    localStorage.removeItem(this.KEYS.pinLockUntil)
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
    this.resetPinFailures()
    this.setLockEnabled(false)
    this.lock()
  },

  removePin() {
    localStorage.removeItem(this.KEYS.pin)
    this.resetPinFailures()
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
    this.resetPinFailures()
    this.setLockEnabled(false)
    this.lock()
  }
}
