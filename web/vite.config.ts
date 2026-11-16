import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Two pages: the coach's app at / and the client app at /app/.
export default defineConfig({
  plugins: [react()],
  // The dev server refuses hosts it doesn't know. This lets any ngrok tunnel through, to try the
  // client app on a phone.
  server: { allowedHosts: ['.ngrok-free.app', '.ngrok.app'] },
  build: { rolldownOptions: { input: ['index.html', 'app/index.html'] } },
})
