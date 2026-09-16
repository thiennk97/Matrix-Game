import type { CaroSymbol, CaroRule } from '~/types/caro'

export type AIDifficulty = 'easy' | 'medium' | 'hard'

export interface WinCheckResult {
  win: boolean
  winningLine: { row: number; col: number }[]
}

export function checkWinLocal(
  board: (CaroSymbol | null)[][],
  row: number,
  col: number,
  symbol: CaroSymbol,
  rule: CaroRule = 'standard'
): WinCheckResult {
  const size = board.length
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 }
  ]

  for (const { dr, dc } of directions) {
    const line = [{ row, col }]

    let fCount = 0
    let r = row + dr
    let c = col + dc
    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === symbol) {
      line.push({ row: r, col: c })
      fCount++
      r += dr
      c += dc
    }
    const end1Row = r
    const end1Col = c

    let bCount = 0
    r = row - dr
    c = col - dc
    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === symbol) {
      line.unshift({ row: r, col: c })
      bCount++
      r -= dr
      c -= dc
    }
    const end2Row = r
    const end2Col = c

    const total = 1 + fCount + bCount

    if (rule === 'standard') {
      if (total >= 5) {
        return { win: true, winningLine: line.slice(0, 5) }
      }
    } else {
      // 'caro_vn' rule: both ends blocked by opponent doesn't count
      if (total >= 5) {
        const opponent: CaroSymbol = symbol === 'X' ? 'O' : 'X'
        const blocked1 =
          end1Row >= 0 && end1Row < size && end1Col >= 0 && end1Col < size && board[end1Row][end1Col] === opponent
        const blocked2 =
          end2Row >= 0 && end2Row < size && end2Col >= 0 && end2Col < size && board[end2Row][end2Col] === opponent

        if (blocked1 && blocked2) {
          continue
        }
        return { win: true, winningLine: line.slice(0, 5) }
      }
    }
  }

  return { win: false, winningLine: [] }
}

function evaluateDirection(
  board: (CaroSymbol | null)[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  symbol: CaroSymbol
): number {
  const size = board.length
  const opponent = symbol === 'X' ? 'O' : 'X'

  let count = 1
  let openEnds = 0

  // Forward
  let r = row + dr
  let c = col + dc
  while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === symbol) {
    count++
    r += dr
    c += dc
  }
  if (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === null) {
    openEnds++
  }

  // Backward
  r = row - dr
  c = col - dc
  while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === symbol) {
    count++
    r -= dr
    c -= dc
  }
  if (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === null) {
    openEnds++
  }

  if (count >= 5) return 100000
  if (count === 4) {
    if (openEnds === 2) return 10000
    if (openEnds === 1) return 1500
  }
  if (count === 3) {
    if (openEnds === 2) return 1000
    if (openEnds === 1) return 200
  }
  if (count === 2) {
    if (openEnds === 2) return 100
    if (openEnds === 1) return 20
  }
  return 5
}

function evaluatePosition(
  board: (CaroSymbol | null)[][],
  row: number,
  col: number,
  aiSymbol: CaroSymbol,
  difficulty: AIDifficulty
): number {
  const humanSymbol: CaroSymbol = aiSymbol === 'X' ? 'O' : 'X'
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 }
  ]

  let attackScore = 0
  let defenseScore = 0

  for (const { dr, dc } of directions) {
    attackScore += evaluateDirection(board, row, col, dr, dc, aiSymbol)
    defenseScore += evaluateDirection(board, row, col, dr, dc, humanSymbol)
  }

  // Center proximity bonus (moves near center are strategically better)
  const center = board.length / 2
  const distToCenter = Math.abs(row - center) + Math.abs(col - center)
  const centerBonus = Math.max(0, 15 - distToCenter)

  if (difficulty === 'easy') {
    return attackScore * 0.7 + defenseScore * 0.5 + Math.random() * 80 + centerBonus
  } else if (difficulty === 'medium') {
    return attackScore * 1.1 + defenseScore * 1.2 + Math.random() * 20 + centerBonus
  } else {
    // Hard: Heavy defensive awareness against 3s/4s + aggressive attack
    const defenseMultiplier = defenseScore >= 1000 ? 1.4 : 1.1
    return attackScore * 1.2 + defenseScore * defenseMultiplier + centerBonus * 2
  }
}

export function findBestAIMove(
  board: (CaroSymbol | null)[][],
  aiSymbol: CaroSymbol,
  difficulty: AIDifficulty = 'hard'
): { row: number; col: number } {
  const size = board.length
  let bestScore = -Infinity
  let bestMove = { row: Math.floor(size / 2), col: Math.floor(size / 2) }

  // Check if board is empty -> play center
  let isEmpty = true
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null) {
        isEmpty = false
        break
      }
    }
    if (!isEmpty) break
  }

  if (isEmpty) {
    return { row: Math.floor(size / 2), col: Math.floor(size / 2) }
  }

  // Find candidate moves: only examine cells adjacent (distance <= 2) to existing stones
  const candidates: { row: number; col: number; score: number }[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== null) continue

      // Check neighbor
      let hasNeighbor = false
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] !== null) {
            hasNeighbor = true
            break
          }
        }
        if (hasNeighbor) break
      }

      if (!hasNeighbor) continue

      const score = evaluatePosition(board, r, c, aiSymbol, difficulty)
      candidates.push({ row: r, col: c, score })

      if (score > bestScore) {
        bestScore = score
        bestMove = { row: r, col: c }
      }
    }
  }

  // Easy mode: pick among top 3 moves to simulate human mistake
  if (difficulty === 'easy' && candidates.length > 3) {
    candidates.sort((a, b) => b.score - a.score)
    const pick = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))]
    return { row: pick.row, col: pick.col }
  }

  return bestMove
}
