import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // The account/security suites run real scrypt(N=32768) key derivation
    // dozens of times per test (one per registration, login attempt, and
    // recovery). That fits vitest's 5s default on fast hardware but not on
    // slower or shared CI runners, so give it headroom rather than letting
    // throttling tests flake under load.
    testTimeout: 20000,
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
