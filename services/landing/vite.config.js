import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        main:           resolve(__dirname, 'index.html'),
        docs:           resolve(__dirname, 'docs.html'),
        'cf-token':     resolve(__dirname, 'cloudflare-token/index.html'),
        mesahub:        resolve(__dirname, 'mesahub/index.html'),
      },
    },
  },
})
