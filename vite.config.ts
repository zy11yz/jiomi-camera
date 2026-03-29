import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  base: isProd ? '/jiomi-camera/' : '/',
  plugins: isProd ? [react()] : [react(), basicSsl()],
  server: {
    https: true,
    host: true,
  },
})
