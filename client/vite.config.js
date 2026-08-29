import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SSL_DIR = join(__dirname, 'ssl')

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: process.env.NODE_ENV !== 'production'
      ? {
          key: fs.readFileSync(join(SSL_DIR, 'key.pem')),
          cert: fs.readFileSync(join(SSL_DIR, 'cert.pem'))
        }
      : undefined
  }
})
