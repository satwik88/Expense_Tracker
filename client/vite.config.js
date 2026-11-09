import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SSL_DIR = join(__dirname, 'ssl')
const SSL_KEY = join(SSL_DIR, 'key.pem')
const SSL_CERT = join(SSL_DIR, 'cert.pem')

// Local HTTPS is opt-in: only enable it when a dev certificate is present.
// client/ssl/ is gitignored, so a fresh clone falls back to plain HTTP.
const hasLocalCert = fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: process.env.NODE_ENV !== 'production' && hasLocalCert
      ? {
          key: fs.readFileSync(SSL_KEY),
          cert: fs.readFileSync(SSL_CERT)
        }
      : undefined
  }
})
