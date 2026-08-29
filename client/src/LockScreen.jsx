import { useState, useEffect, useCallback } from 'react'
import { AUTH } from './auth'

const LockIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const FingerprintIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 10a2 2 0 0 0-2 2v1a2 2 0 0 1-4 0V9a7 7 0 0 1 14 0v4a2 2 0 0 1-4 0v-1a2 2 0 0 0-2-2z" />
    <path d="M12 19v2" />
    <path d="M8 17v3" />
    <path d="M16 17v3" />
    <path d="M5 13a9 9 0 0 1 14 0" />
    <path d="M8.5 14.5a5.5 5.5 0 0 1 7 0" />
  </svg>
)

const DeleteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
    <line x1="18" y1="9" x2="12" y2="15"/>
    <line x1="12" y1="9" x2="18" y2="15"/>
  </svg>
)

export default function LockScreen({ onUnlock, onTryChangePin }) {
  const hasPin = AUTH.isPinEnabled()
  const hasBiometric = AUTH.isBiometricEnabled()

  const [biometricSupported, setBiometricSupported] = useState(false)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinMode, setPinMode] = useState('check') // 'check' | 'setup' | 'confirm-pin'
  const [bioLoading, setBioLoading] = useState(false)
  const [bioError, setBioError] = useState('')
  const [bioFailCount, setBioFailCount] = useState(0)
  const [showRecovery, setShowRecovery] = useState(false)

  useEffect(() => {
    AUTH.isBiometricSupported().then(setBiometricSupported)
  }, [])

  // Biometric-only: auto-verify on mount once we know support is available
  useEffect(() => {
    if (hasBiometric && !hasPin && biometricSupported) {
      handleBiometric('verify')
    }
  }, [hasBiometric, hasPin, biometricSupported])

  const handleBiometric = useCallback(async (action) => {
    setBioLoading(true)
    setBioError('')
    try {
      if (action === 'verify') {
        const ok = await AUTH.verifyBiometric()
        if (ok) {
          AUTH.unlock()
          onUnlock()
        } else {
          const newFailCount = bioFailCount + 1
          setBioFailCount(newFailCount)
          setBioError(newFailCount >= 3 ? 'Too many failed attempts' : 'Biometric failed')
          if (newFailCount >= 3) setShowRecovery(true)
        }
      } else if (action === 'setup') {
        await AUTH.setupBiometric()
        AUTH.unlock()
        onUnlock()
      }
    } catch (e) {
      setBioError(e?.message || 'Authentication failed')
    } finally {
      setBioLoading(false)
    }
  }, [onUnlock, bioFailCount])

  const handlePinInput = useCallback((digit) => {
    setPin(p => p.length < 4 ? p + digit : p)
  }, [])

  const handlePinClear = useCallback(() => setPin(p => p.slice(0, -1)), [])

  const handlePinConfirm = useCallback(async () => {
    if (pin.length !== 4) return
    if (pinMode === 'check') {
      const ok = await AUTH.verifyPin(pin)
      if (ok) {
        AUTH.unlock()
        onUnlock()
      } else {
        setPinError('Incorrect PIN')
        setPin('')
      }
    } else if (pinMode === 'confirm-pin') {
      if (pin !== pinConfirm) {
        setPinError('PINs do not match. Try again.')
        setPinMode('setup')
        setPin('')
        setPinConfirm('')
        return
      }
      await AUTH.setPin(pin)
      AUTH.unlock()
      onUnlock()
    } else {
      setPinConfirm('')
      setPinMode('confirm-pin')
      setPinError('')
    }
  }, [pin, pinConfirm, pinMode, onUnlock])

  const dots = Array(4).fill(0)
  const displayPin = pinMode === 'confirm-pin' ? pinConfirm : pin

  const isPinOnly = hasPin && !hasBiometric
  const isBiometricOnly = hasBiometric && !hasPin
  const isBoth = hasPin && hasBiometric

  const pinSubtitle = pinMode === 'setup'
    ? 'Set a 4-digit PIN'
    : pinMode === 'confirm-pin'
    ? 'Confirm your PIN'
    : 'Enter your PIN'

  return (
    <div className="lock-screen">
      <div className="lock-card">
        {/* Lock icon */}
        <div className="lock-icon-wrap">
          <LockIcon />
        </div>

        {/* Title area */}
        <div className="lock-title">Money Tracker</div>
        <div className="lock-subtitle">{pinSubtitle}</div>
        <div className="pin-helper-text">Your PIN contains at least 4 digits</div>

        {/* PIN dots */}
        <div className="pin-dots">
          {dots.map((_, i) => (
            <div key={i} className={`pin-dot ${i < displayPin.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="pin-error">{pinError}</div>

        {/* PIN keypad — shown when PIN is set (pin-only or both) */}
        {(isPinOnly || isBoth) && (
          <div className="pin-keypad">
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} className="pin-key" onClick={() => handlePinInput(n)}>{n}</button>
            ))}
            <button className="pin-key clear" onClick={handlePinClear} aria-label="Delete">
              <DeleteIcon />
            </button>
            <button className="pin-key" onClick={() => handlePinInput(0)}>0</button>
            <button className="pin-key confirm" onClick={handlePinConfirm}>OK</button>
          </div>
        )}

        {/* Fingerprint button — only shown when BOTH PIN and biometric are enabled */}
        {isBoth && biometricSupported && (
          <div className="pin-biometric-row">
            <button className="pin-biometric-btn" onClick={() => handleBiometric('verify')} disabled={bioLoading} aria-label="Fingerprint">
              <FingerprintIcon />
            </button>
          </div>
        )}

        {/* Confirm-back button */}
        {pinMode === 'confirm-pin' && (
          <button className="pin-toggle" onClick={() => { setPinMode('setup'); setPinConfirm(''); setPinError('') }}>
            ← Back
          </button>
        )}

        {/* Change PIN link — always shown when PIN is set */}
        {hasPin && onTryChangePin && (
          <button className="pin-toggle" onClick={onTryChangePin}>
            Change PIN
          </button>
        )}

        {/* Biometric-only view */}
        {isBiometricOnly && (
          <div>
            <div className="lock-subtitle" style={{ marginBottom: 1.5 }}>Unlock with biometrics</div>
            <button
              className="biometric-btn"
              onClick={() => { setBioError(''); setShowRecovery(false); setBioFailCount(0); handleBiometric('verify'); }}
              disabled={bioLoading}
            >
              {bioLoading ? '⏳' : <FingerprintIcon />}
            </button>
            <div className="biometric-label">
              {AUTH.isBiometricEnabled() ? 'Touch ID / Face ID' : 'Set up biometric unlock'}
            </div>
            {bioError && (
              <div>
                <div className="pin-error" style={{ marginTop: 12, marginBottom: 8 }}>{bioError}</div>
                <button
                  className="pin-toggle"
                  onClick={() => { setBioError(''); setShowRecovery(false); setBioFailCount(0); }}
                  style={{ marginBottom: 8 }}
                >
                  Try Again
                </button>
                {showRecovery && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                      Can't unlock? Reset App Lock settings
                    </div>
                    <button
                      className="pin-toggle"
                      style={{ marginTop: 0, fontSize: '0.75rem', padding: 0 }}
                      onClick={() => {
                        AUTH.recoverFromBiometricOnly()
                        onUnlock()
                      }}
                    >
                      Reset App Lock
                    </button>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                      This clears lock settings only — your data stays safe.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
