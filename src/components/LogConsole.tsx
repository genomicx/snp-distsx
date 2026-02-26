import { useRef, useEffect, useCallback, useState } from 'react'

interface LogConsoleProps {
  lines: string[]
}

export function LogConsole({ lines }: LogConsoleProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const handleCopy = useCallback(() => {
    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [lines])

  if (lines.length === 0) return null

  return (
    <section className="log-console">
      <div className="log-header">
        <h2>Log</h2>
        <div className="log-header-right">
          <span className="log-count">{lines.length} entries</span>
          <button
            className={`copy-log-button${copied ? ' copy-log-button--success' : ''}`}
            onClick={handleCopy}
            aria-label="Copy log to clipboard"
          >
            {copied ? '✓ Copied!' : 'Copy Log'}
          </button>
        </div>
      </div>
      <div className="log-body">
        {lines.map((line, i) => (
          <div key={i} className="log-line">
            <span className="log-index">{String(i + 1).padStart(3, ' ')}</span>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  )
}
