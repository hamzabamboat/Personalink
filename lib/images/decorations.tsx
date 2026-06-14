import type { ReactElement } from 'react'

// A library of ~75 abstract accent shapes used to fill the negative space in
// generated graphics. Each entry draws into a square SVG in a single colour; the
// renderer positions it (corner + offset), fades it, and optionally rotates it.
// pickDeco() spreads choices across the library so shapes don't repeat nearby.

export type Corner = 'br' | 'tr' | 'bl' | 'tl'

export interface DecoSpec {
  id: string
  size: number
  corner: Corner
  off: number
  rot?: number
  opMul?: number
  draw: (c: string, s: number) => ReactElement
}

const svg = (s: number, kids: ReactElement[] | ReactElement) => (
  <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>{kids}</svg>
)

// ── Motif families (each returns a draw(color, size) fn) ──
const concentric = (n: number, sw: number, dot = false) => (c: string, s: number) => {
  const cx = s / 2, max = s / 2 - sw
  const step = max / n
  const els: ReactElement[] = []
  for (let i = 0; i < n; i++) els.push(<circle key={i} cx={cx} cy={cx} r={Math.max(4, max - i * step)} fill="none" stroke={c} strokeWidth={sw} />)
  if (dot) els.push(<circle key="d" cx={cx} cy={cx} r={step * 0.55} fill={c} />)
  return svg(s, els)
}
const dotGrid = (rows: number, cols: number, r: number) => (c: string, s: number) => {
  const gx = s / cols, gy = s / rows, els: ReactElement[] = []
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) els.push(<circle key={`${x}-${y}`} cx={gx * (x + 0.5)} cy={gy * (y + 0.5)} r={r} fill={c} />)
  return svg(s, els)
}
const ringGrid = (rows: number, cols: number, r: number, sw: number) => (c: string, s: number) => {
  const gx = s / cols, gy = s / rows, els: ReactElement[] = []
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) els.push(<circle key={`${x}-${y}`} cx={gx * (x + 0.5)} cy={gy * (y + 0.5)} r={r} fill="none" stroke={c} strokeWidth={sw} />)
  return svg(s, els)
}
const plusGrid = (rows: number, cols: number, sw: number) => (c: string, s: number) => {
  const gx = s / cols, gy = s / rows, L = Math.min(gx, gy) * 0.3, els: ReactElement[] = []
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const px = gx * (x + 0.5), py = gy * (y + 0.5)
    els.push(<line key={`h${x}-${y}`} x1={px - L} y1={py} x2={px + L} y2={py} stroke={c} strokeWidth={sw} />)
    els.push(<line key={`v${x}-${y}`} x1={px} y1={py - L} x2={px} y2={py + L} stroke={c} strokeWidth={sw} />)
  }
  return svg(s, els)
}
const squareGrid = (rows: number, cols: number, sw: number) => (c: string, s: number) => {
  const gx = s / cols, gy = s / rows, q = Math.min(gx, gy) * 0.5, els: ReactElement[] = []
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) els.push(<rect key={`${x}-${y}`} x={gx * (x + 0.5) - q / 2} y={gy * (y + 0.5) - q / 2} width={q} height={q} fill="none" stroke={c} strokeWidth={sw} />)
  return svg(s, els)
}
const nestedSquares = (n: number, sw: number) => (c: string, s: number) => {
  const els: ReactElement[] = [], step = (s / 2 - sw) / n
  for (let i = 0; i < n; i++) { const d = i * step; els.push(<rect key={i} x={d} y={d} width={s - 2 * d} height={s - 2 * d} fill="none" stroke={c} strokeWidth={sw} />) }
  return svg(s, els)
}
const bars = (n: number, vertical: boolean) => (c: string, s: number) => {
  const els: ReactElement[] = [], g = s / (n * 2)
  for (let i = 0; i < n; i++) els.push(vertical
    ? <rect key={i} x={g * (i * 2 + 0.5)} y={0} width={g} height={s} fill={c} />
    : <rect key={i} x={0} y={g * (i * 2 + 0.5)} width={s} height={g} fill={c} />)
  return svg(s, els)
}
const diagonals = (n: number, sw: number) => (c: string, s: number) => {
  const els: ReactElement[] = [], step = (s * 2) / n
  for (let i = 0; i < n; i++) { const o = -s + i * step; els.push(<line key={i} x1={o} y1={s} x2={o + s} y2={0} stroke={c} strokeWidth={sw} />) }
  return svg(s, els)
}
const gridLines = (n: number, sw: number) => (c: string, s: number) => {
  const els: ReactElement[] = [], step = s / n
  for (let i = 1; i < n; i++) { els.push(<line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={s} stroke={c} strokeWidth={sw} />); els.push(<line key={`h${i}`} x1={0} y1={i * step} x2={s} y2={i * step} stroke={c} strokeWidth={sw} />) }
  return svg(s, els)
}
const blob = () => (c: string, s: number) => svg(s, <circle cx={s / 2} cy={s / 2} r={s / 2 * 0.94} fill={c} />)
const donut = (th: number) => (c: string, s: number) => svg(s, <circle cx={s / 2} cy={s / 2} r={s / 2 - th / 2} fill="none" stroke={c} strokeWidth={th} />)
const arcs = (n: number, sw: number) => (c: string, s: number) => {
  const els: ReactElement[] = [], max = s - sw, step = max / n
  for (let i = 0; i < n; i++) { const r = max - i * step; els.push(<path key={i} d={`M 0 ${r} A ${r} ${r} 0 0 1 ${r} 0`} fill="none" stroke={c} strokeWidth={sw} />) }
  return svg(s, els)
}
const quarterDisc = () => (c: string, s: number) => svg(s, <path d={`M 0 0 L ${s} 0 A ${s} ${s} 0 0 1 0 ${s} Z`} fill={c} />)
const halfDisc = () => (c: string, s: number) => svg(s, <path d={`M 0 ${s / 2} A ${s / 2} ${s / 2} 0 0 1 ${s} ${s / 2} Z`} fill={c} />)
const burst = (rays: number, sw: number) => (c: string, s: number) => {
  const cx = s / 2, els: ReactElement[] = []
  for (let i = 0; i < rays; i++) { const a = (i / rays) * Math.PI * 2; els.push(<line key={i} x1={cx} y1={cx} x2={cx + Math.cos(a) * cx} y2={cx + Math.sin(a) * cx} stroke={c} strokeWidth={sw} />) }
  return svg(s, els)
}
const triangles = (variant: number) => (c: string, s: number) => {
  const t = (x: number, y: number, w: number, up: boolean) => <polygon points={up ? `${x},${y + w} ${x + w / 2},${y} ${x + w},${y + w}` : `${x},${y} ${x + w},${y} ${x + w / 2},${y + w}`} fill={c} />
  if (variant === 0) return svg(s, t(s * 0.18, s * 0.18, s * 0.64, true))
  if (variant === 1) return svg(s, [t(s * 0.08, s * 0.3, s * 0.36, true), <g key="g">{t(s * 0.5, s * 0.3, s * 0.36, false)}</g>])
  return svg(s, [t(s * 0.1, s * 0.1, s * 0.3, true), <g key="a">{t(s * 0.55, s * 0.2, s * 0.28, true)}</g>, <g key="b">{t(s * 0.3, s * 0.55, s * 0.3, false)}</g>])
}
const chevrons = (n: number, sw: number) => (c: string, s: number) => {
  const els: ReactElement[] = [], step = s / (n + 1)
  for (let i = 0; i < n; i++) { const x = step * (i + 1); els.push(<polyline key={i} points={`${x - s * 0.18},${s * 0.32} ${x},${s * 0.5} ${x - s * 0.18},${s * 0.68}`} fill="none" stroke={c} strokeWidth={sw} />) }
  return svg(s, els)
}
const wave = (periods: number, sw: number) => (c: string, s: number) => {
  const amp = s * 0.12, mid = s / 2, w = s / periods
  let d = `M 0 ${mid}`
  for (let i = 0; i < periods; i++) { const x0 = i * w; d += ` Q ${x0 + w * 0.25} ${mid - amp} ${x0 + w * 0.5} ${mid} T ${x0 + w} ${mid}` }
  return svg(s, <path d={d} fill="none" stroke={c} strokeWidth={sw} />)
}
const scatter = (seed: number, count: number, r: number) => (c: string, s: number) => {
  let x = seed * 9301 + 49297, els: ReactElement[] = []
  const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280 }
  for (let i = 0; i < count; i++) els.push(<circle key={i} cx={rnd() * s} cy={rnd() * s} r={r * (0.6 + rnd() * 0.8)} fill={c} />)
  return svg(s, els)
}

const CORNERS: Corner[] = ['br', 'tr', 'bl', 'tl']
let _seq = 0
function entry(idBase: string, size: number, off: number, draw: DecoSpec['draw'], rot?: number, opMul?: number): DecoSpec {
  const corner = CORNERS[_seq % 4]; _seq++
  return { id: `${idBase}-${_seq}`, size, corner, off, rot, opMul, draw }
}

// ── The library (~75 distinct elements) ──
export const DECOS: DecoSpec[] = [
  entry('rings', 640, -170, concentric(3, 16, true)), entry('rings', 560, -150, concentric(2, 14)), entry('rings', 720, -220, concentric(4, 14, true)), entry('rings', 500, -120, concentric(2, 18, true)),
  entry('donut', 520, -130, donut(34)), entry('donut', 620, -200, donut(22)), entry('donut', 460, -110, donut(48)),
  entry('dots', 300, 80, dotGrid(4, 4, 11)), entry('dots', 360, 70, dotGrid(5, 5, 10)), entry('dots', 280, 90, dotGrid(3, 6, 10)), entry('dots', 340, 80, dotGrid(6, 3, 10)), entry('dots', 400, 60, dotGrid(6, 6, 9)),
  entry('ringdots', 320, 80, ringGrid(4, 4, 16, 5)), entry('ringdots', 380, 70, ringGrid(5, 5, 14, 5)), entry('ringdots', 300, 90, ringGrid(3, 3, 22, 6)),
  entry('plus', 300, 84, plusGrid(4, 4, 6)), entry('plus', 360, 74, plusGrid(5, 5, 5)), entry('plus', 280, 90, plusGrid(3, 4, 7)), entry('plus', 400, 64, plusGrid(6, 6, 5)),
  entry('sqgrid', 320, 80, squareGrid(4, 4, 5)), entry('sqgrid', 360, 72, squareGrid(5, 5, 5)), entry('sqgrid', 300, 88, squareGrid(3, 3, 6)),
  entry('nestsq', 520, -120, nestedSquares(4, 14)), entry('nestsq', 600, -180, nestedSquares(5, 12)), entry('nestsq', 460, -100, nestedSquares(3, 16), 12),
  entry('bars', 360, 70, bars(4, true)), entry('bars', 420, 60, bars(6, true)), entry('bars', 360, 70, bars(4, false)), entry('bars', 300, 90, bars(3, true)),
  entry('diag', 420, 50, diagonals(7, 7)), entry('diag', 480, 40, diagonals(10, 6)), entry('diag', 360, 80, diagonals(5, 9)),
  entry('grid', 360, 70, gridLines(4, 5)), entry('grid', 420, 60, gridLines(6, 4)), entry('grid', 320, 86, gridLines(3, 6)),
  entry('blob', 360, -70, blob()), entry('blob', 300, -50, blob()), entry('blob', 440, -120, blob()),
  entry('arcs', 560, -40, arcs(4, 14)), entry('arcs', 640, -80, arcs(5, 12)), entry('arcs', 480, 0, arcs(3, 16)),
  entry('quarter', 360, 0, quarterDisc()), entry('quarter', 300, 0, quarterDisc()), entry('quarter', 440, 0, quarterDisc()),
  entry('half', 420, -40, halfDisc()), entry('half', 340, -20, halfDisc(), 90),
  entry('burst', 420, 60, burst(12, 6)), entry('burst', 480, 40, burst(16, 5)), entry('burst', 360, 80, burst(8, 8)),
  entry('tri', 380, 60, triangles(0)), entry('tri', 420, 50, triangles(1)), entry('tri', 460, 40, triangles(2)), entry('tri', 340, 80, triangles(0), 18),
  entry('chev', 360, 70, chevrons(3, 9)), entry('chev', 420, 60, chevrons(4, 8)), entry('chev', 320, 86, chevrons(2, 11)),
  entry('wave', 460, 50, wave(3, 8)), entry('wave', 540, 40, wave(4, 7)), entry('wave', 400, 70, wave(2, 10)),
  entry('scatter', 420, 50, scatter(7, 14, 12)), entry('scatter', 460, 40, scatter(31, 20, 10)), entry('scatter', 380, 70, scatter(53, 10, 14)), entry('scatter', 440, 50, scatter(91, 16, 11)),
  entry('rings', 600, -160, concentric(3, 12)), entry('dots', 320, 84, dotGrid(4, 5, 10)), entry('plus', 340, 80, plusGrid(4, 3, 6)), entry('nestsq', 540, -140, nestedSquares(4, 12), 8),
  entry('donut', 560, -150, donut(30)), entry('arcs', 600, -60, arcs(4, 12)), entry('burst', 440, 50, burst(20, 4)), entry('ringdots', 360, 74, ringGrid(4, 5, 13, 5)),
]

export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Spread picks across the library (step is coprime-ish to the length) so a
// sequence (e.g. carousel slides) never repeats a shape nearby.
export function pickDeco(seed: number, index = 0): DecoSpec {
  const i = (seed + index * 29) % DECOS.length
  return DECOS[i]
}

function cornerStyle(corner: Corner, off: number): Record<string, number> {
  switch (corner) {
    case 'br': return { right: off, bottom: off }
    case 'tr': return { right: off, top: off }
    case 'bl': return { left: off, bottom: off }
    case 'tl': return { left: off, top: off }
  }
}

export function Decoration({ spec, color, dark }: { spec: DecoSpec; color: string; dark: boolean }) {
  const op = (dark ? 0.20 : 0.11) * (spec.opMul ?? 1)
  return (
    <div style={{ position: 'absolute', display: 'flex', opacity: op, ...cornerStyle(spec.corner, spec.off), ...(spec.rot ? { transform: `rotate(${spec.rot}deg)` } : {}) }}>
      {spec.draw(color, spec.size)}
    </div>
  )
}

// A faint, large version of the brand logo used as a watermark motif.
export function LogoDeco({ logoUrl, corner = 'br', size = 460, dark }: { logoUrl: string; corner?: Corner; size?: number; dark: boolean }) {
  return (
    <div style={{ position: 'absolute', display: 'flex', opacity: dark ? 0.14 : 0.08, ...cornerStyle(corner, -60) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} width={size} height={size} alt="" style={{ objectFit: 'contain' }} />
    </div>
  )
}
