import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pub = (file) => resolve(__dirname, '../public', file)

// Rasterise the brand mark (electric-blue 6-petal asterisk) for use in emails,
// which cannot render SVG. High density keeps it crisp when scaled down.
await sharp(pub('logo-mark.svg'), { density: 600 })
  .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(pub('logo-mark.png'))

console.log('✓ logo-mark.png')
