import { useState, useCallback, useEffect, useRef } from 'react'
import { AUTH } from './auth'

export default function LockScreen({ onUnlock }) {
  const [mode, setMode] = useState('check')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')
  const [biometricLoading, setBiometricLoading] = useState(false)

  useEffect(() => {
    // Auto-try biometric on mount if already registered
    if (AUTH.isBiometricEnabled() && AUTH.isBiometricSupported()) {
      handleBiometric('verify')
    }
  }, [])

  const handleBiometric = useCallback(async (action) => {
    setBiometricLoading(true)
    setPinError('')
    try {
      if (action === 'verify') {
        const ok = await AUTH.verifyBiometric()
        if (ok) {
          AUTH.unlock()
          onUnlock()
        } else {
          setPinError('Biometric failed')
        }
      } else if (action === 'setup') {
        await AUTH.setupBiometric()
        AUTH.unlock()
        onUnlock()
      }
    } catch (e) {
      setPinError(e?.message || 'Authentication failed')
    } finally {
      setBiometricLoading(false)
    }
  }, [onUnlock])

  const handlePinInput = useCallback((digit) => {
    setPin(p => p.length < 4 ? p + digit : p)
  }, [])

  const handlePinClear = useCallback(() => setPin(''), [])

  const handlePinConfirm = useCallback(async () => {
    if (pin.length !== 4) return
    if (mode === 'confirm-pin') {
      if (pin !== pinConfirm) {
        setPinError('PINs do not match. Try again.')
        setMode('setup-pin')
        setPin('')
        setPinConfirm('')
        return
      }
      await AUTH.setPin(pin)
      AUTH.unlock()
      onUnlock()
    } else {
      setPinConfirm('')
      setMode('confirm-pin')
      setPinError('')
    }
  }, [pin, pinConfirm, mode, onUnlock])

  const dots = Array(4).fill(0)
  const displayPin = mode === 'confirm-pin' ? pinConfirm : pin

  return (
    <div className="lock-screen">
      <div className="lock-icon-wrap">🔒</div>
      <div className="lock-title">Money Tracker</div>
      <div className="lock-subtitle">
        {mode === 'check'
          ? (AUTH.isBiometricEnabled() ? 'Unlock with biometrics' : 'Secure access')
          : mode === 'setup-pin' ? 'Set a 4-digit PIN'
          : mode === 'confirm-pin' ? 'Confirm your PIN'
          : 'Verify'}
      </div>

      {/* Biometric option */}
      {mode === 'check' && AUTH.isBiometricSupported() && (
        <div style={{ textAlign: 'center' }}>
          <button
            className="biometric-btn"
            onClick={() => handleBiometric(AUTH.isBiometricEnabled() ? 'verify' : 'setup')}
            disabled={biometricLoading}
          >
            {biometricLoading ? '⏳' : '👆'}
          </button>
          <div className="biometric-label">
            {AUTH.isBiometricEnabled() ? 'Touch ID / Face ID' : 'Set up biometric unlock'}
          </div>
        </div>
      )}

      {/* Biometric failure → PIN fallback */}
      {mode === 'check' && AUTH.isBiometricSupported() && pinError && (
        <button className="pin-toggle" onClick={() => setMode('setup-pin')}>
          Use PIN instead
        </button>
      )}

      {/* No biometric support → direct PIN setup */}
      {mode === 'check' && !AUTH.isBiometricSupported() && (
        <button className="pin-toggle" onClick={() => setMode('setup-pin')} style={{ marginTop: 16 }}>
          Set up a PIN
        </button>
      )}

      {/* PIN setup / confirm */}
      {(mode === 'setup-pin' || mode === 'confirm-pin') && (
        <div className="pin-login-wrap">
          <div className="pin-dots">
            {dots.map((_, i) => (
              <div key={i} className={`pin-dot ${i < displayPin.length ? 'filled' : ''}`} />
            ))}
          </div>
          <div className="pin-error">{pinError}</div>
          <div className="pin-keypad">
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} className="pin-key" onClick={() => handlePinInput(n)}>{n}</button>
            ))}
            <button className="pin-key clear" onClick={handlePinClear}>✕</button>
            <button className="pin-key" onClick={() => handlePinInput(0)}>0</button>
            <button className="pin-key confirm" onClick={handlePinConfirm}>✓</button>
          </div>
          {mode === 'confirm-pin' && (
            <button className="pin-toggle" onClick={() => { setMode('setup-pin'); setPinConfirm(''); setPinError('') }}>
              ← Back
            </button>
          )}
        </div>
      )}
    </div>
  )
}
