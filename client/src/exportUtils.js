import { toLocalKey } from './dateUtils.js'

export const BACKUP_APP_ID = 'Money Tracker'
export const BACKUP_VERSION = 1

/**
 * Builds a versioned, schema-valid JSON backup object.
 * Strictly exports transaction entries only — never exports secrets, PIN hashes,
 * biometric credentials, or lock settings.
 *
 * @param {Array} entries
 * @param {Date} [now]
 */
export function createBackupPayload(entries, now = new Date()) {
  const safeTransactions = Array.isArray(entries) ? entries : []
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    transactions: safeTransactions,
  }
}

/**
 * Generates the standardized filename: MoneyTracker_Backup_YYYY-MM-DD.json
 *
 * @param {Date} [date]
 */
export function getBackupFilename(date = new Date()) {
  const dateKey = toLocalKey(date)
  return `MoneyTracker_Backup_${dateKey}.json`
}

/**
 * Extracts transactions array from either:
 * - Versioned object: { app: 'Money Tracker', version: 1, transactions: [...] }
 * - Legacy plain array: [ { id: '...', ... } ]
 *
 * Returns null if the format is unrecognised / invalid.
 *
 * @param {*} raw
 */
export function parseBackupData(raw) {
  if (Array.isArray(raw)) {
    return raw
  }
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.transactions)) {
      return raw.transactions
    }
  }
  return null
}

