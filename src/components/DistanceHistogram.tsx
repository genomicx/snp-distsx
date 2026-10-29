import { useMemo } from 'react'

interface DistanceHistogramProps {
  names: string[]
  matrix: number[][]
  clusterThreshold: number | undefined
  onThresholdChange: (val: number | undefined) => void
}

export function DistanceHistogram({
  names,
  matrix,
  clusterThreshold,
  onThresholdChange,
}: DistanceHistogramProps) {
  const N = names.length

  const stats = useMemo(() => {
    const allDists: number[] = []
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        allDists.push(matrix[i][j])
      }
    }
    if (allDists.length === 0) return null

    const sorted = [...allDists].sort((a, b) => a - b)
    const maxDist = sorted[sorted.length - 1]
    const minDist = sorted[0]
    const median = sorted[Math.floor(sorted.length / 2)]
    const mean = allDists.reduce((s, v) => s + v, 0) / allDists.length

    // Adaptive binning: handle zero-range (all identical) and large ranges
    const range = maxDist - minDist
    const numBins = range === 0 ? 1 : Math.min(60, Math.max(1, range + 1))
    const binWidth = range === 0 ? 1 : Math.max(1, Math.ceil((maxDist + 1) / numBins))
    const actualBins = range === 0 ? 1 : Math.ceil((maxDist + 1) / binWidth)
    const bins = new Array<number>(actualBins).fill(0)
    for (const d of allDists) {
      const bin = Math.floor(d / binWidth)
      if (bin < actualBins) bins[bin]++
    }
    const maxCount = Math.max(...bins)

    return { allDists, sorted, maxDist, minDist, median, mean, bins, binWidth, maxCount }
  }, [matrix, N])

  if (!stats) return null

  const { allDists, maxDist, minDist, median, mean, bins, binWidth, maxCount } = stats

  const svgWidth = 580
  const svgHeight = 200
  const padL = 48
  const padB = 32
  const padT = 12
  const padR = 12
  const plotW = svgWidth - padL - padR
  const plotH = svgHeight - padB - padT
  const barW = Math.max(1, plotW / bins.length - 0.5)

  const xScale = (val: number) => padL + (val / (maxDist + binWidth)) * plotW
  const yScale = (count: number) => padT + plotH - (count / maxCount) * plotH

  return (
    <div className="histogram-container">
      <div className="histogram-controls">
        <label className="threshold-label">
          Cluster threshold:
          <input
            type="number"
            min={0}
            max={maxDist}
            value={clusterThreshold ?? ''}
            placeholder="e.g. 12"
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              onThresholdChange(isNaN(v) ? undefined : v)
            }}
            className="number-input"
            aria-label="Cluster threshold (SNPs)"
          />
          <span className="threshold-hint">SNPs</span>
        </label>
        {clusterThreshold !== undefined && clusterThreshold > 0 && (
          <span className="threshold-count">
            {allDists.filter((d) => d <= clusterThreshold).length} pairs ≤{' '}
            {clusterThreshold} SNPs
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="histogram-svg"
        role="img"
        aria-label="Distribution of pairwise SNP distances"
      >
        {/* Bars */}
        {bins.map((count, i) => {
          if (count === 0) return null
          const x = padL + i * (barW + 0.5)
          const h = (count / maxCount) * plotH
          const y = padT + plotH - h
          const isBelow =
            clusterThreshold !== undefined && (i + 1) * binWidth - 1 <= clusterThreshold
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={isBelow ? 'rgba(239,68,68,0.65)' : 'rgba(36,93,180,0.65)'}
              stroke={isBelow ? 'rgba(239,68,68,0.9)' : 'rgba(36,93,180,0.9)'}
              strokeWidth="0.5"
            >
              <title>{`${i * binWidth}–${(i + 1) * binWidth - 1} SNPs: ${count} pairs`}</title>
            </rect>
          )
        })}

        {/* Threshold vertical line */}
        {clusterThreshold !== undefined && clusterThreshold >= 0 && clusterThreshold <= maxDist && (
          <line
            x1={xScale(clusterThreshold)}
            x2={xScale(clusterThreshold)}
            y1={padT}
            y2={padT + plotH}
            stroke="rgba(239,68,68,0.9)"
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />
        )}

        {/* Mean line */}
        <line
          x1={xScale(mean)}
          x2={xScale(mean)}
          y1={padT}
          y2={padT + plotH}
          stroke="rgba(251,191,36,0.7)"
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* Axes */}
        <line x1={padL} x2={padL + plotW} y1={padT + plotH} y2={padT + plotH} stroke="var(--gx-border)" strokeWidth="1" />
        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="var(--gx-border)" strokeWidth="1" />

        {/* X-axis tick labels */}
        {[0, Math.round(maxDist * 0.25), Math.round(maxDist * 0.5), Math.round(maxDist * 0.75), maxDist].map((val) => (
          <text key={val} x={xScale(val)} y={svgHeight - 4} textAnchor="middle" fontSize="9" fill="var(--gx-text-muted)">
            {val}
          </text>
        ))}

        {/* Y-axis tick labels */}
        {[0, Math.round(maxCount * 0.5), maxCount].map((val) => (
          <text key={val} x={padL - 4} y={yScale(val) + 3} textAnchor="end" fontSize="9" fill="var(--gx-text-muted)">
            {val}
          </text>
        ))}

        {/* Axis labels */}
        <text x={padL + plotW / 2} y={svgHeight} textAnchor="middle" fontSize="10" fill="var(--gx-text-muted)">
          Pairwise SNP distance
        </text>
        <text
          x={10}
          y={padT + plotH / 2}
          textAnchor="middle"
          fontSize="10"
          fill="var(--gx-text-muted)"
          transform={`rotate(-90, 10, ${padT + plotH / 2})`}
        >
          Pairs
        </text>
      </svg>

      <div className="histogram-stats">
        <span>Min: <strong>{minDist}</strong></span>
        <span>Median: <strong>{median}</strong></span>
        <span>Mean: <strong>{mean.toFixed(1)}</strong></span>
        <span>Max: <strong>{maxDist}</strong></span>
        <span>Total pairs: <strong>{allDists.length}</strong></span>
      </div>

      <div className="histogram-legend">
        <span className="legend-item legend-item-teal">Below threshold</span>
        <span className="legend-item legend-item-yellow">Mean distance</span>
      </div>
    </div>
  )
}
