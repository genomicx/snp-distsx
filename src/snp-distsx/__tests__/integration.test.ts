import { describe, it, expect } from 'vitest'
import { parseFasta } from '../parseFasta'
import { normalizeSequence, computeDistanceMatrix } from '../computeMatrix'
import { formatMatrix, formatMolten } from '../formatOutput'
import { DEFAULT_OPTIONS } from '../types'

const TEST_FASTA = `>Reference
ATGCTAGCTAGCTAGCTAGCTAGCT
>Sample_1
ATGCTAGCTAGCTAGCTAGCTAGCT
>Sample_2
ATGCTAGCTAGCTAGCAAGCTAGCT
>Sample_3
ATGCNAGCTAGCTAGCTAGCTAGCT
>Sample_4
TTGCTAGCTAGCTAGCTAGCTAGCA
`

describe('core pipeline integration', () => {
  const sequences = parseFasta(TEST_FASTA)
  const normalized = sequences.map((s) => normalizeSequence(s.sequence, false, false))
  const names = sequences.map((s) => s.name)
  const matrix = computeDistanceMatrix(normalized, 99999)

  it('parses the test FASTA correctly', () => {
    expect(sequences).toHaveLength(5)
    expect(names).toEqual(['Reference', 'Sample_1', 'Sample_2', 'Sample_3', 'Sample_4'])
    expect(sequences[0].sequence.length).toBe(25)
  })

  it('Reference vs Sample_1 → 0 SNPs (identical)', () => {
    expect(matrix[0][1]).toBe(0)
  })

  it('Reference vs Sample_2 → 1 SNP (pos 15: T→A)', () => {
    expect(matrix[0][2]).toBe(1)
  })

  it('Reference vs Sample_3 → 0 SNPs (N at pos 4 is ignored)', () => {
    // N is replaced with '.' and skipped in both Reference and Sample_3
    // Reference has G at pos 4, Sample_3 has N → both compared, but N→'.' so skipped
    expect(matrix[0][3]).toBe(0)
  })

  it('Reference vs Sample_4 → 2 SNPs (pos 0: A→T, pos 24: T→A)', () => {
    expect(matrix[0][4]).toBe(2)
  })

  it('matrix is symmetric', () => {
    for (let i = 0; i < names.length; i++) {
      for (let j = 0; j < names.length; j++) {
        expect(matrix[i][j]).toBe(matrix[j][i])
      }
    }
  })

  it('diagonal is always zero', () => {
    for (let i = 0; i < names.length; i++) {
      expect(matrix[i][i]).toBe(0)
    }
  })

  it('formatMatrix produces correct TSV output', () => {
    const tsv = formatMatrix(names, matrix, DEFAULT_OPTIONS)
    const lines = tsv.trim().split('\n')
    // Header row
    expect(lines[0]).toMatch(/^snp-dists/)
    expect(lines[0]).toContain('Reference')
    // First data row: Reference has 0 distance to itself and Sample_1
    expect(lines[1].startsWith('Reference')).toBe(true)
    expect(lines[1]).toContain('\t0\t0\t1\t0\t2')
  })

  it('formatMolten includes all N*N pairs', () => {
    const molten = formatMolten(names, matrix, { ...DEFAULT_OPTIONS, molten: true, moltenHeaders: true })
    const lines = molten.trim().split('\n')
    expect(lines[0]).toBe('sequence_1\tsequence_2\tdistance')
    expect(lines.length).toBe(1 + names.length * names.length)
  })

  it('countAll=true counts N as a difference', () => {
    // With countAll=true, N is NOT replaced with '.'
    // Reference pos 4 = 'G', Sample_3 pos 4 = 'N' → counted as SNP
    const normalizedAll = sequences.map((s) => normalizeSequence(s.sequence, false, true))
    const matrixAll = computeDistanceMatrix(normalizedAll, 99999)
    expect(matrixAll[0][3]).toBeGreaterThanOrEqual(1) // N counted
  })

  it('maxDiff caps the distance at the specified value', () => {
    // Sample_4 has 2 SNPs vs Reference; cap at 1
    const capped = computeDistanceMatrix(normalized, 1)
    expect(capped[0][4]).toBe(1)
    // Sample_1 has 0 SNPs; not affected
    expect(capped[0][1]).toBe(0)
  })
})
