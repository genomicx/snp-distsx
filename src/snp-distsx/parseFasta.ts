import type { FastaSequence } from './types'

/**
 * Parse FASTA text into an array of FastaSequence objects.
 *
 * All sequences must have the same length (this is a multiple sequence alignment).
 * Stores sequence data as Uint8Array of char codes for fast comparison in the
 * distance computation inner loop.
 *
 * @throws {Error} if no sequences are found
 * @throws {Error} if sequences have different lengths (not a valid alignment)
 */
export function parseFasta(text: string): FastaSequence[] {
  const sequences: FastaSequence[] = []
  let currentName = ''
  let currentSeqParts: string[] = []

  const flush = () => {
    if (currentName) {
      const seq = currentSeqParts.join('')
      const bytes = new Uint8Array(seq.length)
      for (let i = 0; i < seq.length; i++) {
        bytes[i] = seq.charCodeAt(i)
      }
      sequences.push({ name: currentName, sequence: bytes })
      currentName = ''
      currentSeqParts = []
    }
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line.length === 0) continue

    if (line.startsWith('>')) {
      flush()
      // Preserve full header after '>' as the sequence name
      currentName = line.slice(1).trim()
    } else {
      currentSeqParts.push(line)
    }
  }
  flush()

  if (sequences.length === 0) {
    throw new Error('No sequences found in the input file')
  }

  const expectedLength = sequences[0].sequence.length
  for (let i = 1; i < sequences.length; i++) {
    if (sequences[i].sequence.length !== expectedLength) {
      throw new Error(
        `All sequences must be the same length for a multiple sequence alignment. ` +
          `Expected ${expectedLength} bp but "${sequences[i].name}" has ${sequences[i].sequence.length} bp.`,
      )
    }
  }

  return sequences
}
