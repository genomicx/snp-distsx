import { describe, it, expect } from 'vitest'
import { parseFasta } from '../parseFasta'

describe('parseFasta', () => {
  it('parses a simple two-sequence alignment', () => {
    const text = '>seq1\nATGC\n>seq2\nATGC\n'
    const result = parseFasta(text)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('seq1')
    expect(result[1].name).toBe('seq2')
    expect(result[0].sequence.length).toBe(4)
  })

  it('handles multi-line FASTA sequences', () => {
    const text = '>seq1\nATGC\nATGC\n>seq2\nATGCATGC\n'
    const result = parseFasta(text)
    expect(result[0].sequence.length).toBe(8)
    expect(result[1].sequence.length).toBe(8)
  })

  it('throws on empty input', () => {
    expect(() => parseFasta('')).toThrow('No sequences found')
  })

  it('throws on sequences of different lengths', () => {
    const text = '>seq1\nATGC\n>seq2\nATGCATGC\n'
    expect(() => parseFasta(text)).toThrow('All sequences must be the same length')
  })

  it('parses full header line as name (including spaces)', () => {
    const text = '>Sample 1 extra info\nATGC\n>Sample 2\nATGC\n'
    const result = parseFasta(text)
    expect(result[0].name).toBe('Sample 1 extra info')
    expect(result[1].name).toBe('Sample 2')
  })

  it('skips empty lines within sequences', () => {
    const text = '>seq1\n\nATGC\n\n>seq2\nATGC\n'
    const result = parseFasta(text)
    expect(result).toHaveLength(2)
    expect(result[0].sequence.length).toBe(4)
  })

  it('stores sequences as Uint8Array of char codes', () => {
    const text = '>seq1\nATGC\n>seq2\nATGC\n'
    const result = parseFasta(text)
    expect(result[0].sequence[0]).toBe('A'.charCodeAt(0))
    expect(result[0].sequence[1]).toBe('T'.charCodeAt(0))
    expect(result[0].sequence[2]).toBe('G'.charCodeAt(0))
    expect(result[0].sequence[3]).toBe('C'.charCodeAt(0))
  })

  it('handles Windows-style line endings', () => {
    const text = '>seq1\r\nATGC\r\n>seq2\r\nATGC\r\n'
    const result = parseFasta(text)
    expect(result).toHaveLength(2)
    expect(result[0].sequence.length).toBe(4)
  })

  it('throws on single sequence', () => {
    // parseFasta allows single sequence — it is the pipeline that requires >= 2
    const text = '>seq1\nATGC\n'
    const result = parseFasta(text)
    expect(result).toHaveLength(1)
  })

  it('handles CRLF line endings', () => {
    const text = '>seq1\r\nATGC\r\n>seq2\r\nATGC\r\n'
    const result = parseFasta(text)
    expect(result).toHaveLength(2)
    expect(result[0].sequence.length).toBe(4)
    expect(result[1].sequence.length).toBe(4)
  })

  it('parses sequences with lowercase bases', () => {
    const text = '>seq1\natgc\n>seq2\nATGC\n'
    const result = parseFasta(text)
    // parseFasta stores raw bytes — normalisation happens later
    expect(result[0].sequence[0]).toBe('a'.charCodeAt(0))
    expect(result[1].sequence[0]).toBe('A'.charCodeAt(0))
  })

  it('parses a realistic snippy-core alignment header', () => {
    const text = '>Reference NC_045512.2\nATGC\n>Sample_001 isolate X\nATGC\n'
    const result = parseFasta(text)
    expect(result[0].name).toBe('Reference NC_045512.2')
    expect(result[1].name).toBe('Sample_001 isolate X')
  })

  it('throws a helpful message when lengths differ', () => {
    const text = '>seq1\nATGC\n>seq2\nATGCATGC\n'
    expect(() => parseFasta(text)).toThrow('Expected 4 bp but "seq2" has 8 bp')
  })

  it('handles a large number of sequences', () => {
    const lines: string[] = []
    for (let i = 0; i < 100; i++) {
      lines.push(`>seq${i}`)
      lines.push('ATGCATGCATGC')
    }
    const result = parseFasta(lines.join('\n') + '\n')
    expect(result).toHaveLength(100)
    expect(result[99].name).toBe('seq99')
  })
})
