import { useState, useEffect, useCallback } from 'react'
import { AUTH } from './auth'

const LockIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12h0" />
  </svg>
)

const FingerprintIcon = (props) => (
  <svg width="24" height="24" viewBox="0 0 512 512" fill="currentColor" {...props}>
    <path d="M48 256C48 141.1 141.1 48 256 48c63.1 0 119.6 28.1 157.8 72.5c8.6 10.1 23.8 11.2 33.8 2.6s11.2-23.8 2.6-33.8C403.3 34.6 333.7 0 256 0C114.6 0 0 114.6 0 256l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40zm458.5-52.9c-2.7-13-15.5-21.3-28.4-18.5s-21.3 15.5-18.5 28.4c2.9 13.9 4.5 28.3 4.5 43.1l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40c0-18.1-1.9-35.8-5.5-52.9zM256 80c-19 0-37.4 3-54.5 8.6c-15.2 5-18.7 23.7-8.3 35.9c7.1 8.3 18.8 10.8 29.4 7.9c10.6-2.9 21.8-4.4 33.4-4.4c70.7 0 128 57.3 128 128l0 24.9c0 25.2-1.5 50.3-4.4 75.3c-1.7 14.6 9.4 27.8 24.2 27.8c11.8 0 21.9-8.6 23.3-20.3c3.3-27.4 5-55 5-82.7l0-24.9c0-97.2-78.8-176-176-176zM150.7 148.7c-9.1-10.6-25.3-11.4-33.9-.4C93.7 178 80 215.4 80 256l0 24.9c0 24.2-2.6 48.4-7.8 71.9C68.8 368.4 80.1 384 96.1 384c10.5 0 19.9-7 22.2-17.3c6.4-28.1 9.7-56.8 9.7-85.8l0-24.9c0-27.2 8.5-52.4 22.9-73.1c7.2-10.4 8-24.6-.2-34.2zM256 160c-53 0-96 43-96 96l0 24.9c0 35.9-4.6 71.5-13.8 106.1c-3.8 14.3 6.7 29 21.5 29c9.5 0 17.9-6.2 20.4-15.4c10.5-39 15.9-79.2 15.9-119.7l0-24.9c0-28.7 23.3-52 52-52s52 23.3 52 52l0 24.9c0 36.3-3.5 72.4-10.4 107.9c-2.7 13.9 7.7 27.2 21.8 27.2c10.2 0 19-7 21-17c7.7-38.8 11.6-78.3 11.6-118.1l0-24.9c0-53-43-96-96-96zm24 96c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 24.9c0 59.9-11 119.3-32.5 175.2l-5.9 15.3c-4.8 12.4 1.4 26.3 13.8 31s26.3-1.4 31-13.8l5.9-15.3C267.9 411.9 280 346.7 280 280.9l0-24.9z"/>
  </svg>
)

const DeleteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
    <line x1="18" y1="9" x2="12" y2="15"/>
    <line x1="12" y1="9" x2="18" y2="15"/>
  </svg>
)

export default function LockScreen({ onUnlock }) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          // NO_CREDENTIALS / NOT_ENROLLED means the stored flag is stale —
          // auto-retrigger setup so the user can re-enroll without ever
          // seeing the fail counter. This handles the case where the native
          // key was cleared (e.g. OS factory reset, biometric cleared in
          // device settings) but localStorage still says "enabled".
          if (bioError.startsWith('[no-credential]')) {
            await AUTH.setupBiometric()
            AUTH.unlock()
            onUnlock()
          } else {
            const newFailCount = bioFailCount + 1
            setBioFailCount(newFailCount)
            setBioError(newFailCount >= 3 ? 'Too many failed attempts' : 'Biometric failed')
            if (newFailCount >= 3) setShowRecovery(true)
          }
        }
      } else if (action === 'setup') {
        await AUTH.setupBiometric()
        AUTH.unlock()
        onUnlock()
      }
    } catch (e) {
      // NO_CREDENTIALS thrown from the native register path means the key
      // doesn't exist yet — fall back to setup automatically.
      if (e?.message?.includes('NO_CREDENTIALS') || e?.message?.includes('Call register')) {
        // setup is the right path; re-call without wrapping to avoid double-loading
        try {
          await AUTH.setupBiometric()
          AUTH.unlock()
          onUnlock()
        } catch (_) {
          setBioError('Biometric setup failed. Try again.')
        }
      } else {
        setBioError(e?.message || 'Authentication failed')
      }
    } finally {
      setBioLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUnlock, bioFailCount, bioError])

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

        {/* Title area — hidden in biometric-only mode */}
        {hasPin && (
          <>
            <div className="lock-subtitle">{pinSubtitle}</div>

          </>
        )}
        {!hasPin && (
          <div className="lock-subtitle">Unlock with biometrics</div>
        )}

        {/* PIN dots — hidden in biometric-only mode */}
        {hasPin && (
          <div className="pin-dots">
            {dots.map((_, i) => (
              <div key={i} className={`pin-dot ${i < displayPin.length ? 'filled' : ''}`} />
            ))}
          </div>
        )}

        {/* PIN error — hidden in biometric-only mode */}
        {hasPin && <div className="pin-error">{pinError}</div>}

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
              <FingerprintIcon className={bioLoading ? 'pulse-icon' : ''} />
            </button>
          </div>
        )}

        {/* Confirm-back button */}
        {pinMode === 'confirm-pin' && hasPin && (
          <button className="pin-toggle" onClick={() => { setPinMode('setup'); setPinConfirm(''); setPinError('') }}>
            ← Back
          </button>
        )}

        {/* Biometric-only view */}
        {isBiometricOnly && (
          <div>
            <button
              className="biometric-btn"
              onClick={() => { setBioError(''); setShowRecovery(false); setBioFailCount(0); handleBiometric('verify'); }}
              disabled={bioLoading}
            >
              <FingerprintIcon className={bioLoading ? 'pulse-icon' : ''} />
            </button>
            <div className="biometric-label">
              {biometricSupported ? 'Touch ID / Face ID' : 'Set up biometric unlock'}
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
