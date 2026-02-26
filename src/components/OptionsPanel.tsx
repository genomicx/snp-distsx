import type { SnpDistsOptions } from '../snp-distsx/types'

interface OptionsPanelProps {
  options: SnpDistsOptions
  onChange: (opts: SnpDistsOptions) => void
  disabled: boolean
}

export function OptionsPanel({ options, onChange, disabled }: OptionsPanelProps) {
  function set<K extends keyof SnpDistsOptions>(key: K, value: SnpDistsOptions[K]) {
    onChange({ ...options, [key]: value })
  }

  return (
    <div className="options-panel">
      <h3 className="options-title">Options</h3>
      <div className="options-grid">
        <label className="option-item">
          <input
            type="checkbox"
            checked={options.countAll}
            onChange={(e) => set('countAll', e.target.checked)}
            disabled={disabled}
          />
          <span className="option-text">
            <strong>Count all differences</strong>
            <em>Include gaps, N, IUPAC codes (-a)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.preserveCase}
            onChange={(e) => set('preserveCase', e.target.checked)}
            disabled={disabled}
          />
          <span className="option-text">
            <strong>Preserve case</strong>
            <em>Don't uppercase sequences (-k)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.lowerTriangle}
            onChange={(e) => set('lowerTriangle', e.target.checked)}
            disabled={disabled}
          />
          <span className="option-text">
            <strong>Lower triangle only</strong>
            <em>Unique pairs in export (-L)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.molten}
            onChange={(e) => set('molten', e.target.checked)}
            disabled={disabled}
          />
          <span className="option-text">
            <strong>Molten format export</strong>
            <em>Long format: seq1, seq2, dist (-m)</em>
          </span>
        </label>

        <label
          className={`option-item${options.molten ? '' : ' option-item-faded'}`}
        >
          <input
            type="checkbox"
            checked={options.moltenHeaders}
            onChange={(e) => set('moltenHeaders', e.target.checked)}
            disabled={disabled || !options.molten}
          />
          <span className="option-text">
            <strong>Molten headers</strong>
            <em>Add column headers (-t) — requires Molten format</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.csvOutput}
            onChange={(e) => set('csvOutput', e.target.checked)}
            disabled={disabled}
          />
          <span className="option-text">
            <strong>CSV output</strong>
            <em>Comma-separated (-c)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.blankCorner}
            onChange={(e) => set('blankCorner', e.target.checked)}
            disabled={disabled}
          />
          <span className="option-text">
            <strong>Blank corner cell</strong>
            <em>Omit version in top-left (-b)</em>
          </span>
        </label>

        <div className="option-item option-item-row">
          <span className="option-text">
            <strong>Max distance (-x)</strong>
            <em>Stop counting beyond this value</em>
          </span>
          <input
            type="number"
            min={1}
            max={9999999}
            value={options.maxDiff}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1) set('maxDiff', v)
            }}
            disabled={disabled}
            className="number-input"
            aria-label="Maximum distance cutoff"
          />
        </div>
      </div>
    </div>
  )
}
