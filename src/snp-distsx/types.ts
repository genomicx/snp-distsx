/** Options matching snp-dists CLI flags */
export interface SnpDistsOptions {
  /** -a: count ALL character differences including gaps/N/IUPAC */
  countAll: boolean
  /** -k: preserve case (do not uppercase sequences) */
  preserveCase: boolean
  /** -x: stop counting beyond this value (default 99999) */
  maxDiff: number
  /** -L: output lower triangle only */
  lowerTriangle: boolean
  /** -m: output molten (long) format */
  molten: boolean
  /** -t: add column headers to molten output */
  moltenHeaders: boolean
  /** -b: blank the top-left corner cell */
  blankCorner: boolean
  /** -c: use comma separator (CSV) */
  csvOutput: boolean
}

export const DEFAULT_OPTIONS: SnpDistsOptions = {
  countAll: false,
  preserveCase: false,
  maxDiff: 99999,
  lowerTriangle: false,
  molten: false,
  moltenHeaders: false,
  blankCorner: false,
  csvOutput: false,
}

/** A parsed FASTA sequence */
export interface FastaSequence {
  name: string
  /** Sequence stored as char codes for fast Uint8Array comparison */
  sequence: Uint8Array
}

/** The full result returned by the pipeline */
export interface SnpDistsResult {
  names: string[]
  matrix: number[][]
  sequenceCount: number
  alignmentLength: number
  computationTimeMs: number
  options: SnpDistsOptions
}
