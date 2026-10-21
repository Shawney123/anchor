/**
 * 拷贝自托管字体（Google Fonts 在国内不稳定，必须自托管）。
 * 字体来自 npm 上的 @fontsource 包，走 npm 通道最稳。
 *   node scripts/fetch-fonts.mjs
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'public/fonts')
mkdirSync(OUT, { recursive: true })

const FONTS = [
  {
    file: 'inter.woff2',
    from: 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  },
  {
    file: 'instrument-serif.woff2',
    from: 'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
  },
  {
    file: 'jetbrains-mono.woff2',
    from: 'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  },
]

let failed = 0
for (const f of FONTS) {
  const src = resolve(ROOT, f.from)
  if (!existsSync(src)) {
    console.error(`✗ ${f.file}  找不到 ${f.from}`)
    failed += 1
    continue
  }
  copyFileSync(src, resolve(OUT, f.file))
  console.log(`✓ ${f.file}  ${(statSync(src).size / 1024).toFixed(1)} KB`)
}

if (failed) {
  console.error('\n请先执行：npm install @fontsource-variable/inter @fontsource/instrument-serif @fontsource-variable/jetbrains-mono')
  process.exit(1)
}
