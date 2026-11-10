import assert from 'node:assert/strict'
import { createBackupPayload, getBackupFilename, parseBackupData, BACKUP_APP_ID, BACKUP_VERSION } from './exportUtils.js'

console.log('Running exportUtils tests...')

// 1. Filename format
const d = new Date(2026, 10, 10) // Nov 10, 2026
assert.equal(getBackupFilename(d), 'MoneyTracker_Backup_2026-11-10.json', 'Filename matches YYYY-MM-DD format')

// 2. Export with zero transactions
const emptyPayload = createBackupPayload([])
assert.equal(emptyPayload.app, BACKUP_APP_ID)
assert.equal(emptyPayload.version, BACKUP_VERSION)
assert.equal(typeof emptyPayload.exportedAt, 'string')
assert.deepEqual(emptyPayload.transactions, [])

// 3. Export with one transaction
const singleTx = [{ id: 'tx-1', amount: 250, type: 'withdrawal', category: 'Food', note: 'Lunch', date: '2026-11-09' }]
const singlePayload = createBackupPayload(singleTx)
assert.deepEqual(singlePayload.transactions, singleTx)

// 4. Export with multiple transactions & varied categories / types
const multiTx = [
  { id: '1', amount: 1500, type: 'deposit', category: 'Credited', note: 'Salary & bonus (50%!)', date: '2026-11-01' },
  { id: '2', amount: 45.5, type: 'withdrawal', category: 'Transport', note: 'Metro "smart card" reload <tag>', date: '2026-11-02' },
  { id: '3', amount: 700, type: 'withdrawal', category: 'Lent', note: 'Lent to friend ₹700', date: '2026-11-03' }
]
const multiPayload = createBackupPayload(multiTx)
assert.equal(multiPayload.transactions.length, 3)

// 5. Special characters and unicode preservation in JSON stringify/parse
const jsonStr = JSON.stringify(multiPayload, null, 2)
const reParsed = JSON.parse(jsonStr)
assert.deepEqual(reParsed.transactions, multiTx, 'Roundtrip JSON parse preserves special characters')

// 6. Security verification: no auth keys in backup payload
const forbiddenKeys = ['mt_pin_hash', 'mt_biometric', 'mt_lock_enabled', 'salt', 'hash', 'password', 'pin']
const jsonLower = jsonStr.toLowerCase()
for (const key of forbiddenKeys) {
  assert.ok(!jsonLower.includes(`"${key}"`), `Backup must not contain security sensitive key: ${key}`)
}

// 7. parseBackupData: handles new versioned format
const parsedVersioned = parseBackupData(reParsed)
assert.equal(parsedVersioned.length, 3)
assert.deepEqual(parsedVersioned, multiTx)

// 8. parseBackupData: backwards compatibility with legacy plain array
const legacyArray = [
  { id: 'leg-1', amount: 100, type: 'withdrawal', category: 'Bills', note: '', date: '2026-10-01' }
]
const parsedLegacy = parseBackupData(legacyArray)
assert.deepEqual(parsedLegacy, legacyArray, 'Legacy array format is supported')

// 9. parseBackupData: returns null for invalid objects
assert.equal(parseBackupData(null), null)
assert.equal(parseBackupData(undefined), null)
assert.equal(parseBackupData('invalid string'), null)
assert.equal(parseBackupData({ unknown: 'structure' }), null)
assert.equal(parseBackupData({ app: 'Money Tracker', transactions: 'not an array' }), null)

console.log('All exportUtils tests passed!')

