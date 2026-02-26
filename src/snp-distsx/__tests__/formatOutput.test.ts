import { describe, it, expect } from 'vitest'
import { formatMatrix, formatMolten } from '../formatOutput'
import type { SnpDistsOptions } from '../types'

const baseOptions: SnpDistsOptions = {
  countAll: false,
  preserveCase: false,
  maxDiff: 99999,
  lowerTriangle: false,
  molten: false,
  moltenHeaders: false,
  blankCorner: false,
  csvOutput: false,
}

const names = ['Sample_1', 'Sample_2', 'Sample_3']
const matrix = [
  [0, 5, 12],
  [5, 0, 8],
  [12, 8, 0],
]

describe('formatMatrix', () => {
  it('produces a TSV header with snp-dists version in top-left corner', () => {
    const output = formatMatrix(names, matrix, baseOptions)
    const lines = output.split('\n')
    expect(lines[0]).toMatch(/^snp-dists/)
    expect(lines[0]).toContain('\t')
    expect(lines[0]).toContain('Sample_1')
    expect(lines[0]).toContain('Sample_2')
    expect(lines[0]).toContain('Sample_3')
  })

  it('produces correct data rows', () => {
    const output = formatMatrix(names, matrix, baseOptions)
    const lines = output.split('\n')
    expect(lines[1].startsWith('Sample_1')).toBe(true)
    expect(lines[1]).toContain('\t0\t5\t12')
    expect(lines[2].startsWith('Sample_2')).toBe(true)
    expect(lines[2]).toContain('\t5\t0\t8')
  })

  it('uses comma separator when csvOutput=true', () => {
    const opts = { ...baseOptions, csvOutput: true }
    const output = formatMatrix(names, matrix, opts)
    const dataLine = output.split('\n')[1]
    expect(dataLine).toContain(',')
    expect(dataLine).not.toContain('\t')
  })

  it('blanks the corner cell when blankCorner=true', () => {
    const opts = { ...baseOptions, blankCorner: true }
    const output = formatMatrix(names, matrix, opts)
    const headerLine = output.split('\n')[0]
    // First character should be a tab (empty corner)
    expect(headerLine.startsWith('\t')).toBe(true)
  })

  it('outputs only lower triangle when lowerTriangle=true', () => {
    const opts = { ...baseOptions, lowerTriangle: true }
    const output = formatMatrix(names, matrix, opts)
    const lines = output.trim().split('\n')
    // Row 0 (Sample_1): name + 1 value (self)
    expect(lines[1].split('\t').length).toBe(2)
    // Row 1 (Sample_2): name + 2 values
    expect(lines[2].split('\t').length).toBe(3)
    // Row 2 (Sample_3): name + 3 values
    expect(lines[3].split('\t').length).toBe(4)
  })

  it('ends with a newline', () => {
    const output = formatMatrix(names, matrix, baseOptions)
    expect(output.endsWith('\n')).toBe(true)
  })

  it('produces N+1 rows (header + N data rows)', () => {
    const output = formatMatrix(names, matrix, baseOptions)
    // trailing newline means last split element is empty
    const lines = output.split('\n').filter((l) => l.length > 0)
    expect(lines).toHaveLength(4) // 1 header + 3 data
  })
})

describe('formatMolten', () => {
  it('produces three-column TSV without headers by default', () => {
    const output = formatMolten(names, matrix, { ...baseOptions, molten: true })
    const lines = output.trim().split('\n')
    const first = lines[0].split('\t')
    expect(first).toHaveLength(3)
    expect(lines[0]).toBe('Sample_1\tSample_1\t0')
  })

  it('adds column headers when moltenHeaders=true', () => {
    const opts = { ...baseOptions, molten: true, moltenHeaders: true }
    const output = formatMolten(names, matrix, opts)
    const lines = output.trim().split('\n')
    expect(lines[0]).toBe('sequence_1\tsequence_2\tdistance')
    expect(lines[1]).toBe('Sample_1\tSample_1\t0')
  })

  it('outputs N*N rows of data', () => {
    const output = formatMolten(names, matrix, { ...baseOptions, molten: true })
    const lines = output.trim().split('\n')
    expect(lines).toHaveLength(9) // 3×3
  })

  it('includes self-comparisons (zero diagonal)', () => {
    const output = formatMolten(names, matrix, { ...baseOptions, molten: true })
    expect(output).toContain('Sample_1\tSample_1\t0')
    expect(output).toContain('Sample_2\tSample_2\t0')
  })

  it('includes off-diagonal values in both directions', () => {
    const output = formatMolten(names, matrix, { ...baseOptions, molten: true })
    expect(output).toContain('Sample_1\tSample_2\t5')
    expect(output).toContain('Sample_2\tSample_1\t5')
  })

  it('uses comma separator when csvOutput=true', () => {
    const opts = { ...baseOptions, molten: true, csvOutput: true }
    const output = formatMolten(names, matrix, opts)
    expect(output.split('\n')[0]).toContain(',')
    expect(output.split('\n')[0]).not.toContain('\t')
  })
})

describe('formatMatrix — additional options', () => {
  it('combines csvOutput and blankCorner', () => {
    const opts = { ...baseOptions, csvOutput: true, blankCorner: true }
    const output = formatMatrix(names, matrix, opts)
    const headerLine = output.split('\n')[0]
    expect(headerLine.startsWith(',')).toBe(true) // blank corner + comma sep
    expect(headerLine).toContain('Sample_1')
  })

  it('handles a single-sequence matrix (1x1)', () => {
    const output = formatMatrix(['Solo'], [[0]], baseOptions)
    const lines = output.trim().split('\n')
    expect(lines).toHaveLength(2)      // header + 1 data row
    expect(lines[1]).toBe('Solo\t0')
  })

  it('lower triangle + CSV produces correct shape', () => {
    const opts = { ...baseOptions, lowerTriangle: true, csvOutput: true }
    const output = formatMatrix(names, matrix, opts)
    const lines = output.trim().split('\n')
    // row 0 (Sample_1): name + 1 value
    expect(lines[1].split(',').length).toBe(2)
    // row 2 (Sample_3): name + 3 values
    expect(lines[3].split(',').length).toBe(4)
  })
})

describe('formatMolten — additional options', () => {
  it('respects moltenHeaders=false (no header row)', () => {
    const opts = { ...baseOptions, molten: true, moltenHeaders: false }
    const output = formatMolten(names, matrix, opts)
    const lines = output.trim().split('\n')
    expect(lines[0]).not.toMatch(/^sequence_/)
    expect(lines[0]).toMatch(/Sample_1/)
  })

  it('produces correct output for 2-sequence alignment', () => {
    const twoNames = ['A', 'B']
    const twoMatrix = [[0, 7], [7, 0]]
    const output = formatMolten(twoNames, twoMatrix, { ...baseOptions, molten: true, moltenHeaders: true })
    const lines = output.trim().split('\n')
    expect(lines[0]).toBe('sequence_1\tsequence_2\tdistance')
    expect(lines[1]).toBe('A\tA\t0')
    expect(lines[2]).toBe('A\tB\t7')
    expect(lines[3]).toBe('B\tA\t7')
    expect(lines[4]).toBe('B\tB\t0')
    expect(lines).toHaveLength(5)
  })
})
