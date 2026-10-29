import { useRef, useEffect, useMemo } from 'react'

interface DistanceHeatmapProps {
  names: string[]
  matrix: number[][]
}

// Interpolate white → GX blue based on t ∈ [0, 1]
// white: rgb(255,255,255)  →  blue: rgb(36,93,180)
function heatColor(t: number): string {
  const r = Math.round(255 * (1 - t) + 36 * t)
  const g = Math.round(255 * (1 - t) + 93 * t)
  const b = Math.round(255 * (1 - t) + 180 * t)
  return `rgb(${r},${g},${b})`
}

const MAX_LABELLED = 40 // show numeric labels and sample names when N ≤ this

export function DistanceHeatmap({ names, matrix }: DistanceHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const N = names.length

  const maxDist = useMemo(() => {
    let max = 0
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i !== j && matrix[i][j] > max) max = matrix[i][j]
      }
    }
    return max || 1
  }, [matrix, N])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const showLabels = N <= MAX_LABELLED
    const cellSize = showLabels
      ? Math.max(20, Math.min(40, Math.floor(560 / N)))
      : Math.max(4, Math.floor(560 / N))
    const labelPad = showLabels ? Math.min(130, 130) : 0

    const canvasSize = cellSize * N + labelPad
    canvas.width = canvasSize
    canvas.height = canvasSize

    // Background
    ctx.fillStyle = '#191c21'
    ctx.fillRect(0, 0, canvasSize, canvasSize)

    // Draw cells
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const val = matrix[i][j]
        const t = i === j ? 0 : val / maxDist
        ctx.fillStyle = heatColor(t)
        ctx.fillRect(labelPad + j * cellSize, labelPad + i * cellSize, cellSize, cellSize)

        // Draw numeric labels for small matrices
        if (showLabels && cellSize >= 20) {
          ctx.fillStyle = t > 0.45 ? '#e9ecf1' : '#191c21'
          ctx.font = `${Math.min(cellSize * 0.55, 11)}px "IBM Plex Mono", monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            String(val),
            labelPad + j * cellSize + cellSize / 2,
            labelPad + i * cellSize + cellSize / 2,
          )
        }
      }
    }

    // Draw row labels (left side)
    if (showLabels) {
      const fontSize = Math.min(cellSize * 0.5, 11)
      ctx.font = `${fontSize}px "IBM Plex Sans", sans-serif`
      ctx.fillStyle = '#e9ecf1'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < N; i++) {
        const label = names[i].length > 18 ? names[i].slice(0, 16) + '…' : names[i]
        ctx.fillText(label, labelPad - 5, labelPad + i * cellSize + cellSize / 2)
      }

      // Draw column labels (rotated 90°)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let j = 0; j < N; j++) {
        ctx.save()
        ctx.translate(labelPad + j * cellSize + cellSize / 2, labelPad - 5)
        ctx.rotate(-Math.PI / 2)
        const label = names[j].length > 18 ? names[j].slice(0, 16) + '…' : names[j]
        ctx.fillText(label, 0, 0)
        ctx.restore()
      }
    }
  }, [names, matrix, N, maxDist])

  return (
    <div className="heatmap-container">
      <div className="heatmap-legend">
        <div className="legend-scale">
          <span className="legend-label">0</span>
          <div className="legend-gradient" />
          <span className="legend-label">{maxDist} SNPs</span>
        </div>
        {N > MAX_LABELLED && (
          <p className="heatmap-note">
            Labels hidden for large matrices ({N} samples). Hover over the table tab for values.
          </p>
        )}
      </div>
      <div className="heatmap-scroll">
        <canvas ref={canvasRef} className="heatmap-canvas" />
      </div>
    </div>
  )
}
