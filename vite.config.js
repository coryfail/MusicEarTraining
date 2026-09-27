import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// Relative assets work on both the GitHub Pages project URL and a custom domain.
export default defineConfig({ plugins: [preact()], base: './' })
