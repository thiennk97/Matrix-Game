export interface MatchLineInfo {
  lineId: string
  name: string
  val: number
  len: number
  points: number
  start: { r: number; c: number }
  end: { r: number; c: number }
}

interface BoardCell {
  r: number
  c: number
  val: number | null
}

function buildAffectedLineIds(coords: { r: number; c: number }[]): Set<string> {
  const ids = new Set<string>()
  coords.forEach(({ r, c }) => {
    ids.add(`row-${r}`)
    ids.add(`col-${c}`)
    ids.add(`diagA-${r + c}`)
    ids.add(`diagB-${r - c + 8}`)
  })
  return ids
}

function findRuns(
  line: BoardCell[],
  lineId: string,
  nameForLength: (len: number) => string,
): MatchLineInfo[] {
  const matches: MatchLineInfo[] = []
  if (line.length < 3) return matches

  let runLength = 1
  for (let i = 0; i < line.length; i++) {
    const currentCell = line[i]!
    const nextCell = line[i + 1]
    const continuesRun =
      i < line.length - 1 && currentCell.val !== null && currentCell.val === nextCell?.val

    if (continuesRun) {
      runLength++
      continue
    }

    if (runLength >= 3 && currentCell.val !== null) {
      const val = currentCell.val
      const startCell = line[i - runLength + 1]!
      const endCell = currentCell
      matches.push({
        lineId,
        name: nameForLength(runLength),
        val,
        len: runLength,
        points: val * runLength,
        start: { r: startCell.r, c: startCell.c },
        end: { r: endCell.r, c: endCell.c },
      })
    }
    runLength = 1
  }
  return matches
}

function scanRow(board: (number | null)[][], r: number): MatchLineInfo[] {
  const line: BoardCell[] = []
  for (let c = 0; c < 9; c++) {
    line.push({ r, c, val: board[r]?.[c] ?? null })
  }
  return findRuns(line, `row-${r}`, () => `Hàng ${r + 1}`)
}

function scanCol(board: (number | null)[][], c: number): MatchLineInfo[] {
  const line: BoardCell[] = []
  for (let r = 0; r < 9; r++) {
    line.push({ r, c, val: board[r]?.[c] ?? null })
  }
  return findRuns(line, `col-${c}`, () => `Cột ${c + 1}`)
}

function scanDiagA(board: (number | null)[][], k: number): MatchLineInfo[] {
  const line: BoardCell[] = []
  for (let r = 0; r < 9; r++) {
    const c = k - r
    if (c >= 0 && c < 9) {
      line.push({ r, c, val: board[r]?.[c] ?? null })
    }
  }
  return findRuns(line, `diagA-${k}`, (len) => `Chéo \\ (${len} ô)`)
}

function scanDiagB(board: (number | null)[][], k: number): MatchLineInfo[] {
  const line: BoardCell[] = []
  for (let r = 0; r < 9; r++) {
    const c = r - k + 8
    if (c >= 0 && c < 9) {
      line.push({ r, c, val: board[r]?.[c] ?? null })
    }
  }
  return findRuns(line, `diagB-${k}`, (len) => `Chéo / (${len} ô)`)
}

function scanLineById(board: (number | null)[][], lineId: string): MatchLineInfo[] {
  const parts = lineId.split('-')
  const type = parts[0]
  const index = parseInt(parts[1] || '0', 10)
  if (type === 'row') return scanRow(board, index)
  if (type === 'col') return scanCol(board, index)
  if (type === 'diagA') return scanDiagA(board, index)
  return scanDiagB(board, index)
}

export function calculateScoreIncremental(
  board: (number | null)[][],
  placedCoords: { r: number; c: number }[],
  existingMatchLines: MatchLineInfo[] = [],
): { totalScore: number; matchLines: MatchLineInfo[] } {
  const affectedIds = buildAffectedLineIds(placedCoords)
  const keptLines = (existingMatchLines || []).filter((ml) => !affectedIds.has(String(ml.lineId)))
  const rescannedLines = [...affectedIds].flatMap((id) => scanLineById(board, id))

  const allLines = [...keptLines, ...rescannedLines]
  const totalScore = allLines.reduce((sum, ml) => sum + ml.points, 0)

  return { totalScore, matchLines: allLines }
}
