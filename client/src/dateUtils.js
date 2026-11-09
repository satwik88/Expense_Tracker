// Local-date helpers.
//
// Every stored date in this app is a plain 'YYYY-MM-DD' calendar day, not an
// instant in time. `Date.prototype.toISOString()` converts to UTC first, so in
// IST (UTC+5:30) anything between 00:00 and 05:30 lands on the previous day.
// Always build and parse calendar days with the local-time helpers below.

/** Format a Date as 'YYYY-MM-DD' using its *local* calendar day. */
export function toLocalKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse a 'YYYY-MM-DD' key into a Date at local midnight (not UTC midnight). */
export function parseLocalKey(key) {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Today's local calendar day as 'YYYY-MM-DD'. */
export function todayKey() {
  return toLocalKey(new Date())
}
