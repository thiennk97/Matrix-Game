function buildVerticalSlots(totalSlots: number) {
  const slots: { r: number; c: number }[][] = []
  for (let i = 0; i < totalSlots; i++) {
    const col = Math.floor(i / 3)
    const rowStart = (i % 3) * 3
    slots.push([
      { r: rowStart, c: col },
      { r: rowStart + 1, c: col },
      { r: rowStart + 2, c: col },
    ])
  }
  return slots
}

export const TOTAL_SLOTS = 27
export const VERTICAL_SLOTS = buildVerticalSlots(TOTAL_SLOTS)

export const PLAYER_COLORS = [
  'rgb(251, 191, 36)',
  'rgb(248, 113, 113)',
  'rgb(45, 212, 191)',
  'rgb(56, 189, 248)',
  '#a78bfa',
  '#fb7185',
  '#818cf8',
  '#2dd4bf',
]

export function getPlayerColor(playerIndex: number): string {
  return PLAYER_COLORS[playerIndex] || '#a8a29e'
}

export function colorToRgbValues(color: string): number[] {
  if (color.startsWith('rgb(')) {
    const m = color.match(/\d+/g)
    return m ? m.map(Number) : [0, 0, 0]
  }
  let hex = color.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  return [
    parseInt(hex.substr(0, 2), 16),
    parseInt(hex.substr(2, 2), 16),
    parseInt(hex.substr(4, 2), 16),
  ]
}

export function colorToHex(color: string): number {
  const rgb = colorToRgbValues(color)
  return (rgb[0]! << 16) | (rgb[1]! << 8) | rgb[2]!
}

export function darkenColorHex(hex: number, factor: number): number {
  const r = Math.round(((hex >> 16) & 0xff) * factor)
  const g = Math.round(((hex >> 8) & 0xff) * factor)
  const b = Math.round((hex & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

export function lerpColorHex(
  colorA: number, colorB: number, t: number,
): number {
  const ar = (colorA >> 16) & 0xff
  const ag = (colorA >> 8) & 0xff
  const ab = colorA & 0xff
  const br = (colorB >> 16) & 0xff
  const bg = (colorB >> 8) & 0xff
  const bb = colorB & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const b = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | b
}

export function getSlotIndexForCell(r: number, c: number): number {
  return c * 3 + Math.floor(r / 3)
}

export function getMyDisplayColors(colorIndex: number) {
  const colorStr = getPlayerColor(colorIndex)
  const rawColorHex = colorToHex(colorStr)
  const lastPlacedColorHex = darkenColorHex(rawColorHex, 0.7)
  return {
    colorHex: rawColorHex,
    lastPlacedColorHex,
    hoverHex: rawColorHex,
    textColor: '#1a1a1a',
  }
}
