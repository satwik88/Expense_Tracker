import https from 'https'
import express from 'express'
import cors from 'cors'
import ExcelJS from 'exceljs'
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const HOST = '0.0.0.0'

const DRIVE_PATH = 'G:/My Drive/MoneyTracker'
const DRIVE_FILE = join(DRIVE_PATH, 'money_tracker.xlsx')
const LOCAL_FILE = join(__dirname, 'money_tracker_local.xlsx')
const CLIENT_DIST = join(__dirname, '..', 'client', 'dist')

// Ensure Drive folder exists
if (!existsSync(DRIVE_PATH)) {
  mkdirSync(DRIVE_PATH, { recursive: true })
  console.log(`Created folder: ${DRIVE_PATH}`)
}

// Copy from Drive to local (if Drive file exists and not locked)
function syncToLocal() {
  if (existsSync(DRIVE_FILE)) {
    try {
      copyFileSync(DRIVE_FILE, LOCAL_FILE)
      console.log('Synced from Google Drive')
    } catch {
      console.log('Drive file locked — starting fresh local copy')
    }
  }
  if (!existsSync(LOCAL_FILE)) {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Transactions')
    ws.addRow(['id', 'date', 'type', 'amount', 'category', 'note'])
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
    })
    wb.xlsx.writeFile(LOCAL_FILE)
    console.log('Created fresh local Excel file')
  }
}

// Fire-and-forget: copy local back to Drive when Google Drive is not locking
function syncToDrive() {
  if (existsSync(LOCAL_FILE)) {
    try {
      copyFileSync(LOCAL_FILE, DRIVE_FILE)
    } catch {
      // Google Drive has the file locked — local is authoritative, Drive will catch up
    }
  }
}

// ── Express app ──
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(CLIENT_DIST))

// --- GET entries ---
app.get('/api/entries', async (req, res) => {
  try {
    const ws = workbook.getWorksheet('Transactions')
    const entries = []
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const [_leading, eId, date, type, amount, category, note] = row.values
      if (eId && amount != null) {
        entries.push({
          id: String(eId),
          date: date ? new Date(date).toISOString().split('T')[0] : '',
          type: type || '',
          amount: parseFloat(amount) || 0,
          category: category || '',
          note: note || ''
        })
      }
    })
    entries.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- POST entry ---
app.post('/api/entries', async (req, res) => {
  try {
    const { amount, type, category, note, date } = req.body
    const ws = workbook.getWorksheet('Transactions')
    let maxId = 0
    ws.eachRow((row, rn) => {
      if (rn === 1) return
      const id = parseInt(row.getCell(1).value)
      if (id > maxId) maxId = id
    })
    const newId = maxId + 1
    ws.addRow([newId, date || new Date().toISOString().split('T')[0], type, amount, category, note || ''])
    await workbook.xlsx.writeFile(LOCAL_FILE)
    syncToDrive()
    res.json({ id: String(newId), amount, type, category, note, date: date || new Date().toISOString().split('T')[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- DELETE entry ---
app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params
    const ws = workbook.getWorksheet('Transactions')
    const rowsToDelete = []
    let found = false
    ws.eachRow((row, rn) => {
      if (rn === 1) return
      if (String(row.getCell(1).value) === id) {
        rowsToDelete.push(rn)
        found = true
      }
    })
    rowsToDelete.sort((a, b) => b - a).forEach(rn => ws.spliceRows(rn, 1))
    await workbook.xlsx.writeFile(LOCAL_FILE)
    syncToDrive()
    if (found) res.json({ ok: true })
    else res.status(404).json({ error: 'Entry not found' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(CLIENT_DIST, 'index.html'))
})

// ── Start ──
syncToLocal()

const workbook = new ExcelJS.Workbook()
workbook.xlsx.readFile(LOCAL_FILE).then(() => {
  const server = https.createServer(
    {
      key: readFileSync(join(__dirname, 'ssl', 'key.pem')),
      cert: readFileSync(join(__dirname, 'ssl', 'cert.pem'))
    },
    app
  )
  server.listen(PORT, HOST, () => {
    console.log(`\n  Money Tracker running on:\n    HTTPS:   https://localhost:${PORT}\n    Local:   https://localhost:${PORT}\n    Excel:   ${LOCAL_FILE}\n`)
    console.log(`  Open on your phone (accept self-signed cert warning):`)
    console.log(`    https://<YOUR-IP>:${PORT}\n`)
  })
}).catch(err => {
  console.error('Failed to load Excel:', err.message)
  process.exit(1)
})
