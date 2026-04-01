import { defineConfig } from 'vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

function fixForFileProtocol() {
  return {
    name: 'fix-for-file-protocol',
    closeBundle() {
      const file = resolve('dist/index.html')
      let html = readFileSync(file, 'utf-8')
      // Extract the inline script from <head>
      const scriptMatch = html.match(/<script type="module" crossorigin>([\s\S]*?)<\/script>/)
      if (scriptMatch) {
        // Remove it from head
        html = html.replace(scriptMatch[0], '')
        // Insert as plain script before </body>
        // Use a function replacement to avoid $& $' $` in JS being interpreted as replace patterns
        html = html.replace('</body>', () => `<script>${scriptMatch[1]}</script>\n</body>`)
      }
      writeFileSync(file, html)
    }
  }
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), fixForFileProtocol()],
  build: {
    target: 'es2015',
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife'
      }
    }
  },
  server: {
    host: true,
    port: 3000
  }
})
