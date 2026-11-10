import assert from 'node:assert/strict'

console.log('Running privacy & auth logic unit tests...')

// Mock localStorage and sessionStorage
const storage = new Map()
global.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
}
const session = new Map()
global.sessionStorage = {
  getItem: (k) => session.get(k) || null,
  setItem: (k, v) => session.set(k, String(v)),
  removeItem: (k) => session.delete(k),
  clear: () => session.clear()
}

// Minimal WebCrypto polyfill if not present
if (!global.crypto || !global.crypto.subtle) {
  const { webcrypto } = await import('node:crypto')
  global.crypto = webcrypto
}

const { AUTH } = await import('./auth.js')

// 1. Initial State: No PIN or Biometric configured
AUTH.clearLock()
assert.equal(AUTH.isPinEnabled(), false, 'PIN should be disabled')
assert.equal(AUTH.isBiometricEnabled(), false, 'Biometric should be disabled')
assert.equal(AUTH.isLockEnabled(), false, 'Lock should be disabled')

// Decision logic test: Neither configured -> Case D (immediate reveal without auth)
function evaluatePrivacyAction({ hasPin, hasBiometric }) {
  if (!hasPin && !hasBiometric) {
    return 'IMMEDIATE_REVEAL'
  }
  if (hasBiometric) {
    return 'REQUEST_BIOMETRIC'
  }
  if (hasPin) {
    return 'REQUEST_PIN'
  }
}

assert.equal(evaluatePrivacyAction({
  hasPin: AUTH.isPinEnabled(),
  hasBiometric: AUTH.isBiometricEnabled()
}), 'IMMEDIATE_REVEAL', 'Case D returns IMMEDIATE_REVEAL')

// 2. Configure PIN only -> Case B
await AUTH.setPin('1234')
assert.equal(AUTH.isPinEnabled(), true, 'PIN enabled')
assert.equal(AUTH.isBiometricEnabled(), false, 'Biometric still disabled')
assert.equal(evaluatePrivacyAction({
  hasPin: AUTH.isPinEnabled(),
  hasBiometric: AUTH.isBiometricEnabled()
}), 'REQUEST_PIN', 'Case B requests PIN')

// Verify correct PIN
const correctPinResult = await AUTH.verifyPin('1234')
assert.equal(correctPinResult, true, 'Correct PIN verifies')

// Verify incorrect PIN
const wrongPinResult = await AUTH.verifyPin('9999')
assert.equal(wrongPinResult, false, 'Incorrect PIN fails')

// 3. Configure Biometric only -> Case A
AUTH.removePin()
localStorage.setItem(AUTH.KEYS.biometric, '1')
assert.equal(AUTH.isPinEnabled(), false, 'PIN removed')
assert.equal(AUTH.isBiometricEnabled(), true, 'Biometric enabled')
assert.equal(evaluatePrivacyAction({
  hasPin: AUTH.isPinEnabled(),
  hasBiometric: AUTH.isBiometricEnabled()
}), 'REQUEST_BIOMETRIC', 'Case A requests Biometric')

// 4. Configure Both -> Case C
await AUTH.setPin('4321')
assert.equal(AUTH.isPinEnabled(), true, 'PIN re-enabled')
assert.equal(AUTH.isBiometricEnabled(), true, 'Biometric still enabled')
assert.equal(evaluatePrivacyAction({
  hasPin: AUTH.isPinEnabled(),
  hasBiometric: AUTH.isBiometricEnabled()
}), 'REQUEST_BIOMETRIC', 'Case C prefers Biometric')

// 5. Verify PIN Lockout mechanism prevents brute forcing
AUTH.resetPinFailures()
assert.equal(AUTH.getPinLockRemainingMs(), 0, 'No initial lockout')
for (let i = 0; i < 4; i++) {
  await AUTH.verifyPin('0000')
}
assert.equal(AUTH.getPinLockRemainingMs(), 0, '4 failures: not locked out yet')
await AUTH.verifyPin('0000') // 5th failure
const lockMs = AUTH.getPinLockRemainingMs()
assert.ok(lockMs > 0 && lockMs <= 30000, '5th failure triggers 30s lockout')
// Trying to verify while locked out returns false immediately
assert.equal(await AUTH.verifyPin('4321'), false, 'Even correct PIN is blocked during active lockout')

// Clean up
AUTH.clearLock()
assert.equal(AUTH.getPinLockRemainingMs(), 0, 'clearLock resets lockout state')

console.log('All privacy & auth unit tests passed!')
