// @ts-ignore
import { dirname, resolve } from 'node:path'
// @ts-ignore
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'kovaa',
      // the proper extensions will be added
      fileName: 'kovaa',
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})