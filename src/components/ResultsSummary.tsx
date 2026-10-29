import { useState, useCallback, useMemo } from 'react'
import { saveAs } from 'file-saver'
import type { SnpDistsResult } from '../snp-distsx/types'
import { formatMatrix, formatMolten } from '../snp-distsx/formatOutput'
import { DistanceHeatmap } from './DistanceHeatmap'
import { DistanceHistogram } from './DistanceHistogram'

type ResultTab = 'heatmap' | 'histogram' | 'table'

interface ResultsSummaryProps {
  result: SnpDistsResult
}

export function ResultsSummary({ result }: ResultsSummaryProps) {
  const [tab, setTab] = useState<ResultTab>('heatmap')
  const [clusterThreshold, setClusterThreshold] = useState<number | undefined>(undefined)
  const { names, matrix, sequenceCount, alignmentLength, computationTimeMs, options } = result

  // Max off-diagonal value used for table cell colouring
  const maxDist = useMemo(() => {
    let max = 0
    for (let i = 0; i < names.length; i++) {
      for (let j = 0; j < names.length; j++) {
        if (i !== j && matrix[i][j] > max) max = matrix[i][j]
      }
    }
    return max || 1
  }, [names.length, matrix])

  const handleExportTSV = useCallback(() => {
    const content = formatMatrix(names, matrix, { ...options, csvOutput: false })
    saveAs(new Blob([content], { type: 'text/tab-separated-values' }), 'snp_distances.tsv')
  }, [names, matrix, options])

  const handleExportCSV = useCallback(() => {
    const content = formatMatrix(names, matrix, { ...options, csvOutput: true })
    saveAs(new Blob([content], { type: 'text/csv' }), 'snp_distances.csv')
  }, [names, matrix, options])

  const handleExportLong = useCallback(() => {
    const content = formatMolten(names, matrix, {
      ...options,
      molten: true,
    })
    saveAs(
      new Blob([content], { type: 'text/tab-separated-values' }),
      'snp_distances_long.tsv',
    )
  }, [names, matrix, options])

  // Truncate long names for table display
  const shortName = (n: string) => (n.length > 14 ? n.slice(0, 12) + '…' : n)

  return (
    <section className="results">
      <div className="results-header">
        <div>
          <h2>Results</h2>
          <div className="results-meta">
            <span className="meta-badge">{sequenceCount} sequences</span>
            <span className="meta-badge">{alignmentLength.toLocaleString()} bp</span>
            <span className="meta-badge">{computationTimeMs.toFixed(0)} ms</span>
          </div>
        </div>
        <div className="results-actions">
          <button className="export-button" onClick={handleExportTSV} title="Download as tab-separated matrix">
            TSV
          </button>
          <button className="export-button" onClick={handleExportCSV} title="Download as comma-separated matrix">
            CSV
          </button>
          <button className="export-button" onClick={handleExportLong} title="Download as long (molten) format with headers">
            Long
          </button>
        </div>
      </div>

      <div className="result-tabs">
        {(['heatmap', 'histogram', 'table'] as ResultTab[]).map((t) => (
          <button
            key={t}
            className={`result-tab ${tab === t ? 'result-tab-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'heatmap' && <DistanceHeatmap names={names} matrix={matrix} />}

      {tab === 'histogram' && (
        <DistanceHistogram
          names={names}
          matrix={matrix}
          clusterThreshold={clusterThreshold}
          onThresholdChange={setClusterThreshold}
        />
      )}

      {tab === 'table' && (
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th className="table-corner"></th>
                {names.map((n) => (
                  <th key={n} title={n}>
                    {shortName(n)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {names.map((rowName, i) => (
                <tr key={rowName}>
                  <th title={rowName}>{shortName(rowName)}</th>
                  {matrix[i].map((val, j) => {
                    const alpha = i === j ? 0 : Math.min(0.65, (val / maxDist) * 0.65)
                    return (
                      <td
                        key={j}
                        title={`${names[i]} vs ${names[j]}: ${val} SNPs`}
                        className={i === j ? 'table-cell-diagonal' : ''}
                        style={
                          i === j
                            ? undefined
                            : {
                                background: `rgba(36,93,180,${alpha})`,
                                fontFamily: 'var(--gx-font-mono)',
                                textAlign: 'right',
                                color: alpha > 0.4 ? 'var(--gx-text-inverted)' : 'var(--gx-text)',
                              }
                        }
                      >
                        {val}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
