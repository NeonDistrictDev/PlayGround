import { defineConfig } from 'vite'

export default defineConfig({
  preview: {
    // Permit the worker's public preview tunnel without allowing arbitrary hosts.
    allowedHosts: ['.omgithub.com']
  }
})
