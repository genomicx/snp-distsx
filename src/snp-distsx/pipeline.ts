import pako from 'pako'
import { parseFasta } from './parseFasta'
import { normalizeSequence, computeDistanceMatrix } from './computeMatrix'
import type { SnpDistsResult, SnpDistsOptions } from './types'

type ProgressCallback = (msg: string, pct: number) => void
type LogCallback = (msg: string) => void

/**
 * Run the full snp-distsx pipeline:
 *  1. Read and optionally decompress the FASTA file
 *  2. Parse FASTA sequences
 *  3. Validate the alignment
 *  4. Normalize sequences (uppercase + non-ACGT → '.')
 *  5. Compute the N×N pairwise SNP distance matrix
 *
 * TypeScript reimplementation of snp-dists by Torsten Seemann
 * (https://github.com/tseemann/snp-dists, GPLv3).
 */
export async function runSnpDistsx(
  files: File[],
  options: SnpDistsOptions,
  onProgress: ProgressCallback,
  onLog: LogCallback,
): Promise<SnpDistsResult> {
  if (files.length === 0) {
    throw new Error('At least one file is required')
  }

  const file = files[0]
  const sizeKB = (file.size / 1024).toFixed(1)

  onProgress('Reading file...', 5)
  onLog(`[snp-distsx] Reading ${file.name} (${sizeKB} KB)`)

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch (e) {
    throw new Error(
      `Cannot read "${file.name}": ${e instanceof Error ? e.message : 'file read failed'}`,
    )
  }

  let text: string
  const nameLower = file.name.toLowerCase()
  if (nameLower.endsWith('.gz') || nameLower.endsWith('.gzip')) {
    onLog('[snp-distsx] Decompressing gzip...')
    try {
      const inflated = pako.inflate(new Uint8Array(buffer))
      text = new TextDecoder().decode(inflated)
    } catch {
      throw new Error(
        `Failed to decompress "${file.name}". Is it a valid gzip file?`,
      )
    }
  } else {
    text = new TextDecoder().decode(buffer)
  }

  // Sanity-check: must look like FASTA before we try to parse
  if (!text.includes('>')) {
    throw new Error(
      `"${file.name}" does not appear to be a FASTA file — no sequence headers (>) found. ` +
        'Check you have the right file, or try gzip-compressing it if it is very large.',
    )
  }

  onProgress('Parsing FASTA...', 20)
  onLog('[snp-distsx] Parsing FASTA sequences...')

  const rawSequences = parseFasta(text)
  const N = rawSequences.length
  const L = rawSequences[0].sequence.length

  onLog(`[snp-distsx] Found ${N} sequences, alignment length ${L.toLocaleString()} bp`)

  if (N < 2) {
    throw new Error(`At least 2 sequences are required to compute distances, found ${N}`)
  }

  onProgress('Normalizing sequences...', 35)
  onLog(
    `[snp-distsx] Normalizing (countAll=${options.countAll}, preserveCase=${options.preserveCase})`,
  )

  const names = rawSequences.map((s) => s.name)
  const normalized = rawSequences.map((s) =>
    normalizeSequence(s.sequence, options.preserveCase, options.countAll),
  )

  const totalPairs = (N * (N - 1)) / 2
  onProgress('Computing distances...', 45)
  onLog(`[snp-distsx] Computing ${totalPairs.toLocaleString()} pairwise distances...`)

  const startTime = performance.now()
  const matrix = computeDistanceMatrix(normalized, options.maxDiff)
  const computationTimeMs = performance.now() - startTime

  // Find max off-diagonal distance for the log summary
  let maxDist = 0
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (matrix[i][j] > maxDist) maxDist = matrix[i][j]
    }
  }

  onProgress('Done!', 100)
  onLog(`[snp-distsx] Completed in ${computationTimeMs.toFixed(0)} ms`)
  onLog(`[snp-distsx] Max pairwise distance: ${maxDist} SNPs`)

  return {
    names,
    matrix,
    sequenceCount: N,
    alignmentLength: L,
    computationTimeMs,
    options,
  }
}
