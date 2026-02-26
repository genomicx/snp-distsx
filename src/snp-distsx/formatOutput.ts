import type { SnpDistsOptions } from './types'

const SNPDISTS_VERSION = '1.0.0 (snp-distsx)'

/**
 * Format the distance matrix as TSV or CSV, matching snp-dists output format.
 *
 * Output:
 *   [corner]\tSeq1\tSeq2\t...
 *   Seq1\t0\t5\t12
 *   Seq2\t5\t0\t8
 *   ...
 *
 * Where corner is "snp-dists VERSION" unless blankCorner=true.
 */
export function formatMatrix(
  names: string[],
  matrix: number[][],
  options: SnpDistsOptions,
): string {
  const sep = options.csvOutput ? ',' : '\t'
  const N = names.length
  const lines: string[] = []

  // Header row
  const corner = options.blankCorner ? '' : `snp-dists ${SNPDISTS_VERSION}`
  lines.push([corner, ...names].join(sep))

  // Data rows
  for (let i = 0; i < N; i++) {
    const cells: (string | number)[] = [names[i]]
    const limit = options.lowerTriangle ? i + 1 : N
    for (let j = 0; j < limit; j++) {
      cells.push(matrix[i][j])
    }
    lines.push(cells.join(sep))
  }

  return lines.join('\n') + '\n'
}

/**
 * Format the distance matrix as molten (long) three-column format.
 *
 * Output (with headers):
 *   sequence_1\tsequence_2\tdistance
 *   Seq1\tSeq1\t0
 *   Seq1\tSeq2\t5
 *   ...
 */
export function formatMolten(
  names: string[],
  matrix: number[][],
  options: SnpDistsOptions,
): string {
  const sep = options.csvOutput ? ',' : '\t'
  const lines: string[] = []

  if (options.moltenHeaders) {
    lines.push(['sequence_1', 'sequence_2', 'distance'].join(sep))
  }

  for (let i = 0; i < names.length; i++) {
    for (let j = 0; j < names.length; j++) {
      lines.push([names[i], names[j], matrix[i][j]].join(sep))
    }
  }

  return lines.join('\n') + '\n'
}
