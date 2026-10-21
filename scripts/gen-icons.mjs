/**
 * 生成 PWA 图标（无第三方依赖）。
 * 图形：深色底 + 琥珀色的锚形环 —— 与产品的品牌字标同一套色彩。
 *
 *   node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/icons')

/* ── 最小 PNG 编码器 ── */
function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256)
    for (let n = 0; n < 256; n += 1) {
      c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = -1
  for (let i = 0; i < buf.length; i += 1) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ── 绘制 ── */
const BG = [0x0b, 0x0e, 0x14, 0xff]
const AMBER = [0xe9, 0xb4, 0x4c, 0xff]

function draw(size, scale) {
  const buf = Buffer.alloc(size * size * 4)
  const put = (x, y, color) => {
    const i = (y * size + x) * 4
    buf[i] = color[0]
    buf[i + 1] = color[1]
    buf[i + 2] = color[2]
    buf[i + 3] = color[3]
  }

  const cx = size / 2
  const cy = size / 2
  const ringR = size * 0.26 * scale
  const ringW = size * 0.055 * scale
  const barW = size * 0.058 * scale
  const barTop = cy - size * 0.30 * scale
  const barBottom = cy + size * 0.31 * scale
  const crossY = cy + size * 0.10 * scale
  const crossHalf = size * 0.17 * scale
  const arcR = size * 0.30 * scale

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      put(x, y, BG)

      const dx = x - cx
      const dy = y - cy
      const dist = Math.hypot(dx, dy)

      // 锚环
      if (Math.abs(dist - ringR) <= ringW / 2) {
        put(x, y, AMBER)
        continue
      }
      // 竖杆
      if (Math.abs(dx) <= barW / 2 && y >= barTop && y <= barBottom) {
        put(x, y, AMBER)
        continue
      }
      // 横档
      if (Math.abs(dy - (crossY - cy)) <= barW / 2 && Math.abs(dx) <= crossHalf) {
        put(x, y, AMBER)
        continue
      }
      // 底部弧形托
      if (dy > 0 && Math.abs(dist - arcR) <= ringW / 2 && dy > size * 0.06 * scale) {
        put(x, y, AMBER)
        continue
      }
    }
  }
  return buf
}

mkdirSync(OUT, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.72 },
]

for (const t of targets) {
  const rgba = draw(t.size, t.scale)
  writeFileSync(resolve(OUT, t.file), encodePNG(t.size, t.size, rgba))
  console.log(`✓ ${t.file}`)
}
