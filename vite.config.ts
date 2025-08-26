// @ts-ignore
import { dirname, resolve } from 'node:path'
// @ts-ignore
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  esbuild: {
    // drop: ['console','debugger'],
  },
  build: {
    target:'esnext',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'kovaa',
      // the proper extensions will be added
      fileName: 'kovaa',
    },
    rollupOptions: {
      plugins: [
        {
          name: 'remove-collection-handlers',
          transform(code, id) {
            if (id.endsWith('reactivity.esm-bundler.js')) {
              return code
                .replace(`mutableCollectionHandlers,`, `null,`)
                .replace(`readonlyCollectionHandlers,`, `null,`)
            }
          }
        }
      ]
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
})