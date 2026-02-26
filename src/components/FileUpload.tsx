import { useCallback, useState } from 'react'

interface FileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled: boolean
}

const ACCEPTED_EXTS = ['.fasta', '.fa', '.fna', '.aln', '.fsa', '.gz']

function isAccepted(name: string): boolean {
  const lower = name.toLowerCase()
  return ACCEPTED_EXTS.some((ext) => lower.endsWith(ext))
}

export function FileUpload({ files, onFilesChange, disabled }: FileUploadProps) {
  const [dragState, setDragState] = useState<'idle' | 'accept' | 'reject'>('idle')
  const [rejectMsg, setRejectMsg] = useState('')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesChange([e.target.files[0]])
      }
    },
    [onFilesChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragState('idle')
      const f = e.dataTransfer.files[0]
      if (!f) return
      if (isAccepted(f.name)) {
        setRejectMsg('')
        onFilesChange([f])
      } else {
        setRejectMsg(`"${f.name}" is not a supported format (.fasta .fa .fna .aln .fsa .gz)`)
        setTimeout(() => setRejectMsg(''), 4000)
      }
    },
    [onFilesChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const item = e.dataTransfer.items[0]
    if (item && item.kind === 'file') {
      setDragState('accept')
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragState('idle')
  }, [])

  const areaClass = [
    'file-upload-area',
    dragState === 'accept' ? 'drag-accept' : '',
    dragState === 'reject' ? 'drag-reject' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className="file-upload"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <label className={areaClass}>
        <input
          type="file"
          accept=".fasta,.fa,.fna,.aln,.fsa,.gz"
          onChange={handleChange}
          disabled={disabled}
          aria-label="Upload aligned FASTA file"
        />
        <svg
          className="file-upload-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {files.length === 0 ? (
          <>
            <div className="file-upload-label">Drop aligned FASTA here or click to browse</div>
            <div className="file-upload-hint">.fasta .fa .fna .aln .fsa .gz</div>
          </>
        ) : (
          <>
            <div className="file-upload-label">{files[0].name}</div>
            <div className="file-upload-hint">
              {(files[0].size / 1024).toFixed(1)} KB — click to change
            </div>
          </>
        )}
      </label>
      {rejectMsg && (
        <p className="file-reject-msg" role="alert">
          {rejectMsg}
        </p>
      )}
    </div>
  )
}
