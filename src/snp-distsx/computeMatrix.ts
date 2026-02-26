/**
 * Core SNP distance computation.
 *
 * TypeScript reimplementation of the snp-dists algorithm by Torsten Seemann
 * (https://github.com/tseemann/snp-dists, GPLv3).
 *
 * The algorithm: for each position i in sequences A and B, count a SNP if
 *   A[i] != B[i] AND A[i] != IGNORE_CHAR AND B[i] != IGNORE_CHAR
 *
 * IGNORE_CHAR is '.' (char code 46). Non-ACGT bases are replaced with '.' before
 * comparison (unless countAll=true), so gaps, Ns, and IUPAC codes are skipped.
 */

const IGNORE_CODE = '.'.charCodeAt(0) // 46
const UPPERCASE_DELTA = 'a'.charCodeAt(0) - 'A'.charCodeAt(0) // 32

// Lookup: IS_ACGT[charCode] = 1 if the char is A, T, G, or C (uppercase only)
const IS_ACGT = new Uint8Array(256)
for (const ch of ['A', 'T', 'G', 'C']) {
  IS_ACGT[ch.charCodeAt(0)] = 1
}

/**
 * Normalize a sequence:
 * - Optionally convert to uppercase
 * - Optionally replace non-ACGT characters with IGNORE_CODE ('.')
 *
 * Returns a new Uint8Array (does not mutate input).
 */
export function normalizeSequence(
  bytes: Uint8Array,
  preserveCase: boolean,
  countAll: boolean,
): Uint8Array {
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i]
    // Uppercase: lowercase a-z → A-Z
    if (!preserveCase && b >= 97 && b <= 122) {
      b = b - UPPERCASE_DELTA
    }
    // Replace non-ACGT with ignore character (unless countAll)
    if (!countAll && IS_ACGT[b] !== 1) {
      b = IGNORE_CODE
    }
    out[i] = b
  }
  return out
}

/**
 * Compute pairwise SNP distance between two normalized sequences.
 *
 * Positions where either sequence has IGNORE_CODE are skipped.
 * Stops early and returns maxDiff if the running count reaches maxDiff.
 */
function pairwiseDistance(a: Uint8Array, b: Uint8Array, maxDiff: number): number {
  const L = a.length
  let diff = 0
  for (let i = 0; i < L; i++) {
    const ai = a[i]
    const bi = b[i]
    if (ai !== bi && ai !== IGNORE_CODE && bi !== IGNORE_CODE) {
      if (++diff >= maxDiff) return maxDiff
    }
  }
  return diff
}

/**
 * Compute the full N×N SNP distance matrix.
 *
 * @param sequences Pre-normalized Uint8Array sequences (all same length)
 * @param maxDiff Stop counting beyond this value (default 99999)
 * @returns Symmetric N×N matrix of integer pairwise distances
 */
export function computeDistanceMatrix(sequences: Uint8Array[], maxDiff: number): number[][] {
  const N = sequences.length
  const matrix: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0))

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = pairwiseDistance(sequences[i], sequences[j], maxDiff)
      matrix[i][j] = d
      matrix[j][i] = d
    }
  }

  return matrix
}
