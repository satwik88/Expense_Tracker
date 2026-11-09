// Plain Node assertion script — no test framework needed.
// Run with: npm test --prefix client
import assert from 'node:assert/strict'
import { toLocalKey, parseLocalKey, todayKey } from './dateUtils.js'

let passed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`ok ${passed} - ${name}`)
  } catch (err) {
    console.error(`not ok - ${name}`)
    console.error(err)
    process.exitCode = 1
  }
}

test('01:00 local time keeps the same calendar day', () => {
  const earlyMorning = new Date(2026, 10, 9, 1, 0, 0)
  assert.equal(toLocalKey(earlyMorning), '2026-11-09')
})

test('midnight local time keeps the same calendar day', () => {
  assert.equal(toLocalKey(new Date(2026, 10, 9, 0, 0, 0)), '2026-11-09')
})

test('23:59 local time keeps the same calendar day', () => {
  assert.equal(toLocalKey(new Date(2026, 10, 9, 23, 59, 59)), '2026-11-09')
})

test('parseLocalKey returns local midnight', () => {
  const d = parseLocalKey('2026-11-09')
  assert.equal(d.getFullYear(), 2026)
  assert.equal(d.getMonth(), 10)
  assert.equal(d.getDate(), 9)
  assert.equal(d.getHours(), 0)
  assert.equal(d.getMinutes(), 0)
  assert.equal(d.getSeconds(), 0)
  assert.equal(d.getMilliseconds(), 0)
})

test('parse then format round-trips', () => {
  for (const key of ['2026-01-01', '2026-03-31', '2026-11-09', '2027-12-31']) {
    assert.equal(toLocalKey(parseLocalKey(key)), key)
  }
})

test('month boundary: Jan 31 + 1 day is Feb 1', () => {
  const d = parseLocalKey('2026-01-31')
  d.setDate(d.getDate() + 1)
  assert.equal(toLocalKey(d), '2026-02-01')
})

test('month boundary: Feb 28 2026 (non-leap) is the last day', () => {
  assert.equal(toLocalKey(new Date(2026, 1, 28)), '2026-02-28')
  const d = parseLocalKey('2026-02-28')
  d.setDate(d.getDate() + 1)
  assert.equal(toLocalKey(d), '2026-03-01')
})

test('month boundary: Feb 29 2028 (leap year) exists', () => {
  assert.equal(toLocalKey(new Date(2028, 1, 29)), '2028-02-29')
  const d = parseLocalKey('2028-02-29')
  d.setDate(d.getDate() + 1)
  assert.equal(toLocalKey(d), '2028-03-01')
})

test('month boundary: Dec 31 + 1 day rolls into next year', () => {
  const d = parseLocalKey('2026-12-31')
  d.setDate(d.getDate() + 1)
  assert.equal(toLocalKey(d), '2027-01-01')
})

test('todayKey matches toLocalKey(new Date())', () => {
  assert.equal(todayKey(), toLocalKey(new Date()))
})

test('IST regression: toISOString() disagrees with local key before 05:30', () => {
  const earlyMorning = new Date(2026, 10, 9, 1, 0, 0)
  const offsetMinutes = -earlyMorning.getTimezoneOffset()
  // Only meaningful when running in a timezone ahead of UTC (e.g. Asia/Kolkata).
  if (offsetMinutes > 0) {
    const isoKey = earlyMorning.toISOString().slice(0, 10)
    assert.notEqual(isoKey, toLocalKey(earlyMorning))
    assert.equal(toLocalKey(earlyMorning), '2026-11-09')
  }
})

if (process.exitCode) {
  console.error(`\n${passed} passed, some tests failed`)
} else {
  console.log(`\n${passed} passed`)
}
