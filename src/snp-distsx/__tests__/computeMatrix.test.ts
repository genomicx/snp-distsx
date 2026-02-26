import { describe, it, expect } from 'vitest'
import { normalizeSequence, computeDistanceMatrix } from '../computeMatrix'

const A = 'A'.charCodeAt(0)
const T = 'T'.charCodeAt(0)
const G = 'G'.charCodeAt(0)
const C = 'C'.charCodeAt(0)
const N = 'N'.charCodeAt(0)
const DOT = '.'.charCodeAt(0)
const GAP = '-'.charCodeAt(0)
const a = 'a'.charCodeAt(0)

describe('normalizeSequence', () => {
  it('converts lowercase to uppercase by default', () => {
    const input = new Uint8Array([a, 't'.charCodeAt(0), 'g'.charCodeAt(0), 'c'.charCodeAt(0)])
    const result = normalizeSequence(input, false, false)
    expect(result[0]).toBe(A)
    expect(result[1]).toBe(T)
    expect(result[2]).toBe(G)
    expect(result[3]).toBe(C)
  })

  it('does NOT uppercase when preserveCase=true, but non-ACGT filter still runs', () => {
    // With preserveCase=true and countAll=false:
    // lowercase 'a' is NOT in the uppercase ACGT set, so it becomes IGNORE_CODE
    // (matches original snp-dists -k flag behaviour)
    const input = new Uint8Array([a, T])
    const result = normalizeSequence(input, true, false)
    expect(result[0]).toBe(DOT) // lowercase 'a' → '.' because not uppercase ACGT
    expect(result[1]).toBe(T)
  })

  it('preserves lowercase when preserveCase=true AND countAll=true', () => {
    // With both flags set: no uppercasing, no character replacement
    const input = new Uint8Array([a, T])
    const result = normalizeSequence(input, true, true)
    expect(result[0]).toBe(a) // lowercase 'a' preserved
    expect(result[1]).toBe(T) // uppercase T also preserved
  })

  it('replaces N with IGNORE_CHAR by default', () => {
    const input = new Uint8Array([N])
    const result = normalizeSequence(input, false, false)
    expect(result[0]).toBe(DOT)
  })

  it('replaces gap (-) with IGNORE_CHAR by default', () => {
    const input = new Uint8Array([GAP])
    const result = normalizeSequence(input, false, false)
    expect(result[0]).toBe(DOT)
  })

  it('keeps non-ACGT when countAll=true', () => {
    const input = new Uint8Array([N, GAP])
    const result = normalizeSequence(input, false, true)
    expect(result[0]).toBe(N) // uppercase N stays as N
    expect(result[1]).toBe(GAP) // gap stays as gap
  })

  it('does not modify ACGT bases', () => {
    const input = new Uint8Array([A, T, G, C])
    const result = normalizeSequence(input, false, false)
    expect(Array.from(result)).toEqual([A, T, G, C])
  })
})

describe('computeDistanceMatrix', () => {
  it('returns zero for identical sequences', () => {
    const seqs = [new Uint8Array([A, T, G, C]), new Uint8Array([A, T, G, C])]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][0]).toBe(0)
    expect(matrix[0][1]).toBe(0)
    expect(matrix[1][0]).toBe(0)
    expect(matrix[1][1]).toBe(0)
  })

  it('counts a single SNP correctly', () => {
    const seqs = [
      new Uint8Array([A, T, G, C]),
      new Uint8Array([A, A, G, C]), // 1 SNP at position 1: T→A
    ]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][1]).toBe(1)
    expect(matrix[1][0]).toBe(1)
  })

  it('counts multiple SNPs correctly', () => {
    const seqs = [
      new Uint8Array([A, T, G, C]),
      new Uint8Array([T, A, C, G]), // 4 SNPs
    ]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][1]).toBe(4)
  })

  it('skips positions where either sequence has IGNORE_CHAR (dot)', () => {
    const seqs = [
      new Uint8Array([A, DOT, G, C]), // position 1 is ignore
      new Uint8Array([T, T, G, C]),   // position 0: A vs T = SNP; position 1: skipped
    ]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][1]).toBe(1)
  })

  it('skips when BOTH have IGNORE_CHAR at same position', () => {
    const seqs = [
      new Uint8Array([A, DOT]),
      new Uint8Array([A, DOT]), // same ignore chars — not a difference
    ]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][1]).toBe(0)
  })

  it('respects maxDiff early termination', () => {
    const seqs = [
      new Uint8Array([A, T, G, C]),
      new Uint8Array([T, A, C, G]), // 4 SNPs, but maxDiff=2
    ]
    const matrix = computeDistanceMatrix(seqs, 2)
    expect(matrix[0][1]).toBe(2) // capped at maxDiff
  })

  it('produces a symmetric matrix', () => {
    const seqs = [
      new Uint8Array([A, T, G, C]),
      new Uint8Array([A, A, G, C]),
      new Uint8Array([T, T, T, C]),
    ]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][1]).toBe(matrix[1][0])
    expect(matrix[0][2]).toBe(matrix[2][0])
    expect(matrix[1][2]).toBe(matrix[2][1])
  })

  it('diagonal is always zero', () => {
    const seqs = [new Uint8Array([A, T, G, C]), new Uint8Array([A, A, G, C])]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][0]).toBe(0)
    expect(matrix[1][1]).toBe(0)
  })

  it('handles a 3-sequence alignment matching test data', () => {
    // Reproduces known snp-dists output for the test FASTA
    // Reference:  ATGCTAGCTAGCTAGCTAGCTAGCT
    // Sample_1:   ATGCTAGCTAGCTAGCTAGCTAGCT  (0 SNPs vs Ref)
    // Sample_2:   ATGCTAGCTAGCTAGCAAGCTAGCT  (1 SNP vs Ref at pos 15)
    const toBytes = (s: string) => {
      const b = new Uint8Array(s.length)
      for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i)
      return b
    }
    const ref = toBytes('ATGCTAGCTAGCTAGCTAGCTAGCT')
    const s1 = toBytes('ATGCTAGCTAGCTAGCTAGCTAGCT')
    const s2 = toBytes('ATGCTAGCTAGCTAGCAAGCTAGCT')
    const seqs = [ref, s1, s2]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][1]).toBe(0) // ref vs s1: identical
    expect(matrix[0][2]).toBe(1) // ref vs s2: 1 SNP
    expect(matrix[1][2]).toBe(1) // s1 vs s2: 1 SNP
  })
})

describe('normalizeSequence — additional edge cases', () => {
  it('handles an empty sequence', () => {
    const input = new Uint8Array(0)
    const result = normalizeSequence(input, false, false)
    expect(result.length).toBe(0)
  })

  it('replaces all IUPAC ambiguity codes with IGNORE when countAll=false', () => {
    // R=AG, Y=CT, S=GC, W=AT, K=GT, M=AC, B=CGT, D=AGT, H=ACT, V=ACG
    const iupac = 'RYSW KMBDHV'.replace(' ', '')
    const input = new Uint8Array(iupac.split('').map(c => c.charCodeAt(0)))
    const result = normalizeSequence(input, false, false)
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBe('.'.charCodeAt(0))
    }
  })

  it('does not replace ACGT when countAll=false', () => {
    const input = new Uint8Array(['A', 'T', 'G', 'C'].map(c => c.charCodeAt(0)))
    const result = normalizeSequence(input, false, false)
    expect(Array.from(result)).toEqual(['A', 'T', 'G', 'C'].map(c => c.charCodeAt(0)))
  })
})

describe('computeDistanceMatrix — additional edge cases', () => {
  const toBytes = (s: string) => {
    const b = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i)
    return b
  }

  it('handles two identical sequences of length 1', () => {
    const seqs = [toBytes('A'), toBytes('A')]
    const m = computeDistanceMatrix(seqs, 99999)
    expect(m[0][1]).toBe(0)
  })

  it('handles two fully different sequences', () => {
    const seqs = [toBytes('AAAA'), toBytes('TTTT')]
    const m = computeDistanceMatrix(seqs, 99999)
    expect(m[0][1]).toBe(4)
  })

  it('handles all-ignore sequences as zero distance', () => {
    const DOT = '.'.charCodeAt(0)
    const seqs = [
      new Uint8Array([DOT, DOT, DOT]),
      new Uint8Array([DOT, DOT, DOT]),
    ]
    const m = computeDistanceMatrix(seqs, 99999)
    expect(m[0][1]).toBe(0)
  })

  it('handles maxDiff=1 as threshold — any pair with ≥1 SNP returns 1', () => {
    const seqs = [toBytes('AAAA'), toBytes('TTTT')] // 4 SNPs
    const m = computeDistanceMatrix(seqs, 1)
    expect(m[0][1]).toBe(1) // capped at maxDiff=1
  })

  it('produces correct matrix for 4 sequences', () => {
    const ref  = toBytes('ATGCATGC')
    const s1   = toBytes('ATGCATGC') // 0 from ref
    const s2   = toBytes('TTGCATGC') // 1 from ref (pos 0)
    const s3   = toBytes('ATGCATTT') // 2 from ref (pos 6,7)
    const seqs = [ref, s1, s2, s3]
    const m = computeDistanceMatrix(seqs, 99999)
    expect(m[0][1]).toBe(0)  // ref vs s1
    expect(m[0][2]).toBe(1)  // ref vs s2
    expect(m[0][3]).toBe(2)  // ref vs s3
    expect(m[1][2]).toBe(1)  // s1 vs s2
    expect(m[1][3]).toBe(2)  // s1 vs s3
    expect(m[2][3]).toBe(3)  // s2 vs s3
    // symmetry
    expect(m[2][0]).toBe(m[0][2])
    expect(m[3][0]).toBe(m[0][3])
  })
})
