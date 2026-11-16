import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Two pages: the coach's app at / and the client app at /app/.
export default defineConfig({
  plugins: [react()],
  build: { rolldownOptions: { input: ['index.html', 'app/index.html'] } },
})
