# snp-distsx Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based SNP distance matrix calculator that reimplements Torsten Seemann's snp-dists in TypeScript with rich interactive visualisations.

**Architecture:** Vite + React 18 app using a TypeScript reimplementation of the snp-dists C algorithm (no WASM needed — the core is a simple nested loop). A Web Worker handles computation to avoid blocking the UI. Results are shown as an interactive heatmap, histogram, and table.

**Tech Stack:** TypeScript 5.6, React 18, Vite 5, Vitest, pako (gzip), file-saver, canvas (heatmap)

---

## Background: snp-dists Algorithm

Original tool by Torsten Seemann (https://github.com/tseemann/snp-dists), GPLv3.

The core distance function (reproduced exactly in TypeScript):
```
For each position i in aligned sequences a and b:
  if a[i] != b[i] AND a[i] != IGNORE_CHAR AND b[i] != IGNORE_CHAR:
    diff++
```
Where `IGNORE_CHAR = '.'` — any non-ACGT character is replaced with `.` before comparison (unless `-a` flag used). This is the pairwise gap-handling model: positions where either sequence has a non-ACGT character are skipped.

Performance-critical inner loop uses `Uint8Array` (char codes) rather than string indexing.

---

## Task 1: Project scaffold + config files

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css` (GX design tokens)

**Step 1: Create package.json**

```json
{
  "name": "snp-distsx",
  "version": "0.1.0",
  "description": "Browser-based pairwise SNP distance matrix calculator from aligned FASTA files",
  "type": "module",
  "license": "GPL-3.0-only",
  "author": "Nabil-Fareed Alikhan <nabil@happykhan.com> (https://www.happykhan.com)",
  "homepage": "https://snp-distsx.vercel.app",
  "repository": {
    "type": "git",
    "url": "https://github.com/happykhan/snp-distsx.git"
  },
  "bugs": {
    "url": "https://github.com/happykhan/snp-distsx/issues"
  },
  "keywords": ["snp-dists", "snp-distsx", "bioinformatics", "genomics", "phylogenomics", "outbreak"],
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "vitest run && eslint . && npm run build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "pako": "^2.1.0",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/file-saver": "^2.0.7",
    "@types/pako": "^2.0.3",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "eslint": "^9.13.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "globals": "^15.11.0",
    "jsdom": "^24.1.3",
    "typescript": "~5.6.2",
    "typescript-eslint": "^8.11.0",
    "vite": "^5.4.10",
    "vitest": "^4.0.18"
  }
}
```

**Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
  },
  esbuild: {
    target: 'es2022',
    keepNames: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
      keepNames: true,
    },
  },
})
```

**Step 3: Create tsconfig files**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 4: Create eslint.config.js**

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', '.pixi', 'public'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
```

**Step 5: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Browser-based pairwise SNP distance matrix calculator from aligned FASTA files. No data leaves your machine." />
    <meta name="author" content="Nabil-Fareed Alikhan" />
    <meta property="og:title" content="snp-distsx — SNP Distance Matrix in Your Browser" />
    <meta property="og:description" content="Compute pairwise SNP distances from aligned FASTA files entirely in your browser. No server required, no data uploaded." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="snp-distsx — SNP Distance Matrix in Your Browser" />
    <meta name="twitter:description" content="Compute pairwise SNP distances from aligned FASTA files entirely in your browser." />
    <meta name="twitter:creator" content="@happy_khan" />
    <title>snp-distsx — SNP Distance Matrix in Your Browser</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create src/main.tsx**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 7: Install dependencies**

```bash
cd /home/ubuntu/code/genomicx/snp-distsx
npm install
```

Expected: node_modules/ populated, no errors.

---

## Task 2: Domain types and core algorithm

**Files:**
- Create: `src/snp-distsx/types.ts`
- Create: `src/snp-distsx/parseFasta.ts`
- Create: `src/snp-distsx/computeMatrix.ts`
- Create: `src/snp-distsx/formatOutput.ts`
- Create: `src/snp-distsx/__tests__/parseFasta.test.ts`
- Create: `src/snp-distsx/__tests__/computeMatrix.test.ts`
- Create: `src/snp-distsx/__tests__/formatOutput.test.ts`

**Step 1: Create `src/snp-distsx/types.ts`**

```typescript
/** Options matching snp-dists CLI flags */
export interface SnpDistsOptions {
  /** -a: count ALL character differences including gaps/N/IUPAC */
  countAll: boolean
  /** -k: preserve case (do not uppercase sequences) */
  preserveCase: boolean
  /** -x: stop counting beyond this value */
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
  sequence: Uint8Array // encoded as char codes for performance
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
```

**Step 2: Write failing tests for parseFasta — `src/snp-distsx/__tests__/parseFasta.test.ts`**

```typescript
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

  it('parses sequence names with spaces (uses first word)', () => {
    const text = '>Sample 1 extra info\nATGC\n>Sample 2\nATGC\n'
    const result = parseFasta(text)
    expect(result[0].name).toBe('Sample 1 extra info')
    expect(result[1].name).toBe('Sample 2')
  })

  it('skips empty lines', () => {
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
  })
})
```

**Step 3: Run failing test**

```bash
cd /home/ubuntu/code/genomicx/snp-distsx
npx vitest run src/snp-distsx/__tests__/parseFasta.test.ts
```
Expected: FAIL — module not found.

**Step 4: Implement `src/snp-distsx/parseFasta.ts`**

```typescript
import type { FastaSequence } from './types'

/**
 * Parse FASTA text into an array of FastaSequence objects.
 * All sequences must have the same length (this is an alignment).
 * Stores sequence data as Uint8Array of char codes for fast comparison.
 *
 * @throws if no sequences are found
 * @throws if sequences have different lengths
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
      // Use the full header after '>' (trimmed) as the name
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
        `Expected ${expectedLength} but "${sequences[i].name}" has ${sequences[i].sequence.length} bases.`
      )
    }
  }

  return sequences
}
```

**Step 5: Run test**
```bash
npx vitest run src/snp-distsx/__tests__/parseFasta.test.ts
```
Expected: All 7 tests PASS.

**Step 6: Write failing tests for computeMatrix — `src/snp-distsx/__tests__/computeMatrix.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeSequence, computeDistanceMatrix } from '../computeMatrix'

const IGNORE = '.'.charCodeAt(0)
const A = 'A'.charCodeAt(0)
const T = 'T'.charCodeAt(0)
const G = 'G'.charCodeAt(0)
const C = 'C'.charCodeAt(0)
const N = 'N'.charCodeAt(0)
const DOT = '.'.charCodeAt(0)

describe('normalizeSequence', () => {
  it('converts lowercase to uppercase by default', () => {
    const input = new Uint8Array(['a', 't', 'g', 'c'].map(c => c.charCodeAt(0)))
    const result = normalizeSequence(input, false, false)
    expect(result[0]).toBe(A)
    expect(result[1]).toBe(T)
  })

  it('preserves case when preserveCase=true', () => {
    const input = new Uint8Array(['a', 't'].map(c => c.charCodeAt(0)))
    const result = normalizeSequence(input, true, false)
    expect(result[0]).toBe('a'.charCodeAt(0))
  })

  it('replaces non-ACGT with IGNORE_CHAR by default', () => {
    const input = new Uint8Array([N, '-'.charCodeAt(0)])
    const result = normalizeSequence(input, false, false)
    expect(result[0]).toBe(IGNORE)
    expect(result[1]).toBe(IGNORE)
  })

  it('keeps non-ACGT when countAll=true', () => {
    const input = new Uint8Array([N])
    const result = normalizeSequence(input, false, true)
    expect(result[0]).toBe(N) // already uppercased N stays as N
  })
})

describe('computeDistanceMatrix', () => {
  it('returns zero for identical sequences', () => {
    const seqs = [
      new Uint8Array([A, T, G, C]),
      new Uint8Array([A, T, G, C]),
    ]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][0]).toBe(0)
    expect(matrix[0][1]).toBe(0)
    expect(matrix[1][0]).toBe(0)
  })

  it('counts SNPs correctly', () => {
    const seqs = [
      new Uint8Array([A, T, G, C]),
      new Uint8Array([A, A, G, C]), // 1 SNP at position 1
    ]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][1]).toBe(1)
    expect(matrix[1][0]).toBe(1)
  })

  it('ignores positions where either sequence has IGNORE_CHAR', () => {
    const seqs = [
      new Uint8Array([A, DOT, G, C]),
      new Uint8Array([T, T, G, C]), // position 0: A vs T = 1 SNP; position 1: skipped
    ]
    const matrix = computeDistanceMatrix(seqs, 99999)
    expect(matrix[0][1]).toBe(1)
  })

  it('respects maxDiff early termination', () => {
    const seqs = [
      new Uint8Array([A, T, G, C]),
      new Uint8Array([T, A, C, G]), // 4 SNPs, but maxDiff=2
    ]
    const matrix = computeDistanceMatrix(seqs, 2)
    expect(matrix[0][1]).toBe(2)
  })

  it('is symmetric', () => {
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
})
```

**Step 7: Run to verify failure**
```bash
npx vitest run src/snp-distsx/__tests__/computeMatrix.test.ts
```
Expected: FAIL — module not found.

**Step 8: Implement `src/snp-distsx/computeMatrix.ts`**

```typescript
/**
 * Core SNP distance computation — TypeScript reimplementation of
 * Torsten Seemann's snp-dists algorithm (https://github.com/tseemann/snp-dists)
 * Licensed GPLv3. Original algorithm credit: Torsten Seemann.
 */

const IGNORE_CODE = '.'.charCodeAt(0) // 46

// Lookup table: true = is ACGT (or acgt after uppercasing)
// This is faster than a regex or string includes() for a tight inner loop
const IS_ACGT = new Uint8Array(256)
for (const ch of ['A', 'T', 'G', 'C']) {
  IS_ACGT[ch.charCodeAt(0)] = 1
}

const UPPERCASE_OFFSET = 'a'.charCodeAt(0) - 'A'.charCodeAt(0) // 32

/**
 * Normalize a sequence in-place (returns a new Uint8Array):
 * - optionally uppercase
 * - optionally replace non-ACGT with IGNORE_CODE
 */
export function normalizeSequence(
  bytes: Uint8Array,
  preserveCase: boolean,
  countAll: boolean,
): Uint8Array {
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i]
    // Uppercase if needed
    if (!preserveCase && b >= 97 && b <= 122) {
      b = b - UPPERCASE_OFFSET
    }
    // Replace non-ACGT with IGNORE_CODE unless countAll
    if (!countAll && !IS_ACGT[b]) {
      b = IGNORE_CODE
    }
    out[i] = b
  }
  return out
}

/**
 * Compute pairwise SNP distance between two normalized Uint8Array sequences.
 * Positions where either sequence has IGNORE_CODE are skipped.
 * Stops early if diff reaches maxDiff.
 */
function pairwiseDistance(
  a: Uint8Array,
  b: Uint8Array,
  maxDiff: number,
): number {
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
 * @param sequences Pre-normalized Uint8Array sequences (same length)
 * @param maxDiff Stop counting beyond this value
 * @returns Symmetric N×N matrix of integer distances
 */
export function computeDistanceMatrix(
  sequences: Uint8Array[],
  maxDiff: number,
): number[][] {
  const N = sequences.length
  const matrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0))

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = pairwiseDistance(sequences[i], sequences[j], maxDiff)
      matrix[i][j] = d
      matrix[j][i] = d
    }
  }

  return matrix
}
```

**Step 9: Run test**
```bash
npx vitest run src/snp-distsx/__tests__/computeMatrix.test.ts
```
Expected: All tests PASS.

**Step 10: Write tests for formatOutput — `src/snp-distsx/__tests__/formatOutput.test.ts`**

```typescript
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
  it('produces TSV with snp-dists version in corner', () => {
    const output = formatMatrix(names, matrix, baseOptions)
    const lines = output.split('\n')
    expect(lines[0]).toMatch(/^snp-dists/)
    expect(lines[0]).toContain('\t')
    expect(lines[0]).toContain('Sample_1')
    expect(lines[1]).toStartWith('Sample_1')
    expect(lines[1]).toContain('\t0\t5\t12')
  })

  it('uses comma separator when csvOutput=true', () => {
    const opts = { ...baseOptions, csvOutput: true }
    const output = formatMatrix(names, matrix, opts)
    expect(output.split('\n')[1]).toContain(',')
    expect(output.split('\n')[1]).not.toContain('\t')
  })

  it('blanks the corner cell when blankCorner=true', () => {
    const opts = { ...baseOptions, blankCorner: true }
    const output = formatMatrix(names, matrix, opts)
    expect(output.split('\n')[0]).toMatch(/^[\t,]/)
  })

  it('outputs only lower triangle when lowerTriangle=true', () => {
    const opts = { ...baseOptions, lowerTriangle: true }
    const output = formatMatrix(names, matrix, opts)
    const lines = output.trim().split('\n')
    // Row 0 (Sample_1) has 1 value (itself)
    expect(lines[1].split('\t').length).toBe(2) // name + 1 value
    // Row 2 (Sample_3) has 3 values
    expect(lines[3].split('\t').length).toBe(4) // name + 3 values
  })
})

describe('formatMolten', () => {
  it('produces three-column output without headers by default', () => {
    const output = formatMolten(names, matrix, { ...baseOptions, molten: true })
    const lines = output.trim().split('\n')
    expect(lines[0].split('\t')).toHaveLength(3)
    expect(lines[0]).toBe('Sample_1\tSample_1\t0')
  })

  it('adds headers when moltenHeaders=true', () => {
    const opts = { ...baseOptions, molten: true, moltenHeaders: true }
    const output = formatMolten(names, matrix, opts)
    const lines = output.trim().split('\n')
    expect(lines[0]).toBe('sequence_1\tsequence_2\tdistance')
    expect(lines[1]).toBe('Sample_1\tSample_1\t0')
  })

  it('outputs N*N rows', () => {
    const output = formatMolten(names, matrix, { ...baseOptions, molten: true })
    const lines = output.trim().split('\n')
    expect(lines).toHaveLength(9) // 3x3
  })
})
```

**Step 11: Run to verify failure**
```bash
npx vitest run src/snp-distsx/__tests__/formatOutput.test.ts
```
Expected: FAIL — module not found.

**Step 12: Implement `src/snp-distsx/formatOutput.ts`**

```typescript
import type { SnpDistsOptions } from './types'

const SNPDISTS_VERSION = '1.0.0 (snp-distsx)'

/**
 * Format the distance matrix as TSV or CSV output.
 * Matches snp-dists output format exactly.
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
 * Format the distance matrix as molten (long) format.
 * Optionally adds a header row.
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
```

**Step 13: Run all tests**
```bash
npx vitest run src/snp-distsx/
```
Expected: All tests PASS.

**Step 14: Create `src/snp-distsx/pipeline.ts`**

```typescript
import pako from 'pako'
import { parseFasta } from './parseFasta'
import { normalizeSequence, computeDistanceMatrix } from './computeMatrix'
import type { SnpDistsResult, SnpDistsOptions } from './types'

type ProgressCallback = (msg: string, pct: number) => void
type LogCallback = (msg: string) => void

/**
 * Run the full snp-distsx pipeline:
 * 1. Read file (decompress if gzipped)
 * 2. Parse FASTA alignment
 * 3. Normalize sequences
 * 4. Compute distance matrix
 * 5. Return structured result
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

  onProgress('Reading file...', 5)
  onLog(`[snp-distsx] Reading ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

  const buffer = await file.arrayBuffer()
  let text: string

  // Decompress gzip if needed
  if (file.name.endsWith('.gz') || file.name.endsWith('.gzip')) {
    onLog('[snp-distsx] Decompressing gzip...')
    const inflated = pako.inflate(new Uint8Array(buffer))
    text = new TextDecoder().decode(inflated)
  } else {
    text = new TextDecoder().decode(buffer)
  }

  onProgress('Parsing FASTA...', 20)
  onLog('[snp-distsx] Parsing FASTA sequences...')

  const rawSequences = parseFasta(text)
  const N = rawSequences.length
  const L = rawSequences[0].sequence.length

  onLog(`[snp-distsx] Found ${N} sequences, alignment length ${L.toLocaleString()} bp`)

  if (N < 2) {
    throw new Error(`At least 2 sequences are required, found ${N}`)
  }

  onProgress('Normalizing sequences...', 35)
  onLog(`[snp-distsx] Normalizing sequences (countAll=${options.countAll}, preserveCase=${options.preserveCase})`)

  const names = rawSequences.map((s) => s.name)
  const normalized = rawSequences.map((s) =>
    normalizeSequence(s.sequence, options.preserveCase, options.countAll),
  )

  onProgress('Computing distances...', 45)
  onLog(`[snp-distsx] Computing ${N * (N - 1) / 2} pairwise distances (maxDiff=${options.maxDiff})...`)

  const startTime = performance.now()

  // Batch progress updates during matrix computation
  const matrix = computeDistanceMatrix(normalized, options.maxDiff)

  const computationTimeMs = performance.now() - startTime

  onProgress('Done!', 100)
  onLog(`[snp-distsx] Complete in ${computationTimeMs.toFixed(0)}ms`)
  onLog(`[snp-distsx] Max distance: ${Math.max(...matrix.map((row, i) => Math.max(...row.filter((_, j) => j !== i))))}`)

  return {
    names,
    matrix,
    sequenceCount: N,
    alignmentLength: L,
    computationTimeMs,
    options,
  }
}
```

---

## Task 3: Core UI components (FileUpload, LogConsole, AboutPage)

**Files:**
- Create: `src/components/FileUpload.tsx`
- Create: `src/components/LogConsole.tsx`
- Create: `src/components/AboutPage.tsx`
- Create: `src/components/OptionsPanel.tsx`

**Step 1: Create `src/components/FileUpload.tsx`**

Accept `.fasta`, `.fa`, `.fna`, `.aln`, `.fsa`, and `.gz` variants. Single file only (snp-dists takes one alignment file).

```typescript
import { useCallback } from 'react'

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
      const f = e.dataTransfer.files[0]
      if (f && isAccepted(f.name)) {
        onFilesChange([f])
      }
    },
    [onFilesChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="file-upload" onDrop={handleDrop} onDragOver={handleDragOver}>
      <label className="file-upload-area">
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
            <div className="file-upload-hint">{(files[0].size / 1024).toFixed(1)} KB</div>
          </>
        )}
      </label>
    </div>
  )
}
```

**Step 2: Create `src/components/LogConsole.tsx`** (standard from scaffold)

(See vite-scaffold.md — use the template verbatim)

**Step 3: Create `src/components/OptionsPanel.tsx`**

All snp-dists flags exposed as a clean options UI:

```typescript
import type { SnpDistsOptions } from '../snp-distsx/types'

interface OptionsPanelProps {
  options: SnpDistsOptions
  onChange: (opts: SnpDistsOptions) => void
  disabled: boolean
}

export function OptionsPanel({ options, onChange, disabled }: OptionsPanelProps) {
  const set = <K extends keyof SnpDistsOptions>(key: K, value: SnpDistsOptions[K]) => {
    onChange({ ...options, [key]: value })
  }

  return (
    <div className="options-panel">
      <h3 className="options-title">Options</h3>
      <div className="options-grid">
        <label className="option-item">
          <input
            type="checkbox"
            checked={options.countAll}
            onChange={(e) => set('countAll', e.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>Count all differences</strong>
            <em>Include gaps, N, IUPAC codes (-a)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.preserveCase}
            onChange={(e) => set('preserveCase', e.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>Preserve case</strong>
            <em>Don't uppercase sequences (-k)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.lowerTriangle}
            onChange={(e) => set('lowerTriangle', e.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>Lower triangle only</strong>
            <em>Unique pairs only (-L)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.molten}
            onChange={(e) => set('molten', e.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>Molten format</strong>
            <em>Long format: seq1, seq2, dist (-m)</em>
          </span>
        </label>

        <label className="option-item" style={{ opacity: options.molten ? 1 : 0.4 }}>
          <input
            type="checkbox"
            checked={options.moltenHeaders}
            onChange={(e) => set('moltenHeaders', e.target.checked)}
            disabled={disabled || !options.molten}
          />
          <span>
            <strong>Molten headers</strong>
            <em>Add column headers (-t)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.csvOutput}
            onChange={(e) => set('csvOutput', e.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>CSV output</strong>
            <em>Comma-separated (-c)</em>
          </span>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={options.blankCorner}
            onChange={(e) => set('blankCorner', e.target.checked)}
            disabled={disabled}
          />
          <span>
            <strong>Blank corner</strong>
            <em>Omit version in top-left (-b)</em>
          </span>
        </label>

        <div className="option-item">
          <label htmlFor="maxdiff-input">
            <strong>Max distance (-x)</strong>
            <em>Stop counting beyond this value</em>
          </label>
          <input
            id="maxdiff-input"
            type="number"
            min={1}
            max={999999}
            value={options.maxDiff}
            onChange={(e) => set('maxDiff', Math.max(1, parseInt(e.target.value, 10) || 99999))}
            disabled={disabled}
            className="number-input"
          />
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Create `src/components/AboutPage.tsx`**

Include Torsten Seemann attribution and Nabil-Fareed Alikhan author info.

```typescript
export function AboutPage() {
  return (
    <div className="about-page">
      <section>
        <h2>About snp-distsx</h2>
        <p>
          snp-distsx is a browser-based pairwise SNP distance matrix calculator
          for aligned FASTA files. It implements the algorithm from{' '}
          <a href="https://github.com/tseemann/snp-dists" target="_blank" rel="noopener noreferrer">
            snp-dists
          </a>{' '}
          by{' '}
          <a href="https://github.com/tseemann" target="_blank" rel="noopener noreferrer">
            Torsten Seemann
          </a>{' '}
          (Melbourne Bioinformatics / Peter Doherty Institute for Infection and Immunity),
          reimplemented in TypeScript for the browser.
        </p>
        <p>
          Upload a multiple sequence alignment in FASTA format (e.g. output from{' '}
          <a href="https://github.com/tseemann/snippy" target="_blank" rel="noopener noreferrer">snippy-core</a>
          {' '}or{' '}
          <a href="https://github.com/nickjcroucher/gubbins" target="_blank" rel="noopener noreferrer">Gubbins</a>
          ) and get an interactive SNP distance matrix with heatmap visualisation.
        </p>
        <div className="privacy-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>
            No data leaves your machine — all processing happens entirely in your browser using TypeScript.
            Your sequences are never uploaded anywhere.
          </p>
        </div>
      </section>

      <section>
        <h2>Algorithm</h2>
        <p>
          For each pair of sequences (A, B) at position i:
          count a SNP if <code>A[i] ≠ B[i]</code> and neither base is a gap/ambiguity character.
          Non-ACGT bases (gaps, N, IUPAC codes) are replaced with '.' and skipped by default.
          Use <strong>Count all differences</strong> to include these positions.
        </p>
        <p>
          This pairwise gap-handling model means the same column may contribute to some pairs
          but not others. For complete-deletion behaviour, pre-filter your alignment with{' '}
          <code>snp-sites -c</code> before uploading.
        </p>
      </section>

      <section>
        <h2>Typical Workflow</h2>
        <ol className="workflow-list">
          <li>Map reads to reference with <strong>Snippy</strong></li>
          <li>Generate core genome alignment with <strong>snippy-core</strong> → <code>core.full.aln</code></li>
          <li>Optionally mask recombination with <strong>Gubbins</strong></li>
          <li>Upload the alignment to <strong>snp-distsx</strong> → interactive matrix + heatmap</li>
          <li>Export TSV/CSV for downstream analysis or phylogenetics</li>
        </ol>
      </section>

      <section>
        <h2>References</h2>
        <div className="references">
          <div className="reference-item">
            <strong>Original snp-dists tool:</strong>{' '}
            Seemann T (2018). snp-dists: Pairwise SNP distance matrix from a FASTA sequence alignment.
            {' '}<a href="https://github.com/tseemann/snp-dists" target="_blank" rel="noopener noreferrer">github.com/tseemann/snp-dists</a>
          </div>
          <div className="reference-item">
            <strong>Snippy:</strong>{' '}
            Seemann T. Snippy: fast haploid variant calling from NGS reads.{' '}
            <a href="https://github.com/tseemann/snippy" target="_blank" rel="noopener noreferrer">github.com/tseemann/snippy</a>
          </div>
          <div className="reference-item">
            <strong>Gubbins:</strong>{' '}
            Croucher NJ, et al. (2015). Rapid phylogenetic analysis of large samples of recombinant bacterial whole genome sequences using Gubbins.
            {' '}<em>Nucleic Acids Research</em>, 43(3): e15.{' '}
            <a href="https://doi.org/10.1093/nar/gku1196" target="_blank" rel="noopener noreferrer">doi:10.1093/nar/gku1196</a>
          </div>
        </div>
      </section>

      <section>
        <h2>Authors</h2>
        <div className="author-block">
          <h3>Web application</h3>
          <p className="about-role">Nabil-Fareed Alikhan</p>
          <p className="about-role">Senior Bioinformatician, Centre for Genomic Pathogen Surveillance, University of Oxford</p>
          <div className="about-links">
            <a href="https://www.happykhan.com" target="_blank" rel="noopener noreferrer">happykhan.com</a>
            <a href="https://orcid.org/0000-0002-1243-0767" target="_blank" rel="noopener noreferrer">ORCID</a>
            <a href="mailto:nabil@happykhan.com">nabil@happykhan.com</a>
            <a href="https://twitter.com/happy_khan" target="_blank" rel="noopener noreferrer">@happy_khan</a>
          </div>
        </div>
        <div className="author-block" style={{ marginTop: '1rem' }}>
          <h3>Original snp-dists algorithm</h3>
          <p className="about-role">Torsten Seemann</p>
          <p className="about-role">Melbourne Bioinformatics, University of Melbourne</p>
          <div className="about-links">
            <a href="https://github.com/tseemann" target="_blank" rel="noopener noreferrer">github.com/tseemann</a>
            <a href="https://twitter.com/torstenseemann" target="_blank" rel="noopener noreferrer">@torstenseemann</a>
          </div>
        </div>
      </section>
    </div>
  )
}
```

---

## Task 4: Visualisation components

**Files:**
- Create: `src/components/DistanceHeatmap.tsx`
- Create: `src/components/DistanceHistogram.tsx`
- Create: `src/components/ResultsSummary.tsx`

### DistanceHeatmap

Renders the N×N matrix as a canvas-based heatmap. For N ≤ 40: draw labelled cells. For N > 40: draw unlabelled pixel grid. Color scale: white (0) → teal (max distance).

**Step 1: Create `src/components/DistanceHeatmap.tsx`**

```typescript
import { useRef, useEffect, useMemo } from 'react'

interface DistanceHeatmapProps {
  names: string[]
  matrix: number[][]
}

// Interpolate between white and GX teal based on value 0..1
function heatColor(t: number): string {
  // white -> teal: rgb(255,255,255) -> rgb(13,148,136)
  const r = Math.round(255 * (1 - t) + 13 * t)
  const g = Math.round(255 * (1 - t) + 148 * t)
  const b = Math.round(255 * (1 - t) + 136 * t)
  return `rgb(${r},${g},${b})`
}

const MAX_LABELLED = 40 // show labels only when N <= this

export function DistanceHeatmap({ names, matrix }: DistanceHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const N = names.length

  const maxDist = useMemo(() => {
    let max = 0
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        if (i !== j && matrix[i][j] > max) max = matrix[i][j]
    return max || 1
  }, [matrix, N])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const showLabels = N <= MAX_LABELLED
    const labelPad = showLabels ? 120 : 0
    const cellSize = showLabels ? Math.max(18, Math.floor(600 / N)) : Math.max(4, Math.floor(600 / N))
    const size = cellSize * N + labelPad

    canvas.width = size
    canvas.height = size

    // Background
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, size, size)

    ctx.font = `${Math.min(cellSize * 0.6, 11)}px JetBrains Mono, monospace`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const val = matrix[i][j]
        const t = i === j ? 0 : val / maxDist
        ctx.fillStyle = heatColor(t)
        ctx.fillRect(labelPad + j * cellSize, labelPad + i * cellSize, cellSize, cellSize)

        if (showLabels && cellSize >= 18) {
          const textColor = t > 0.5 ? '#f1f5f9' : '#0f172a'
          ctx.fillStyle = textColor
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            String(val),
            labelPad + j * cellSize + cellSize / 2,
            labelPad + i * cellSize + cellSize / 2,
          )
        }
      }
    }

    // Row labels
    if (showLabels) {
      ctx.fillStyle = '#f1f5f9'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.font = `${Math.min(cellSize * 0.55, 10)}px Inter, sans-serif`
      for (let i = 0; i < N; i++) {
        const label = names[i].length > 16 ? names[i].slice(0, 14) + '…' : names[i]
        ctx.fillText(label, labelPad - 4, labelPad + i * cellSize + cellSize / 2)
      }
      // Column labels (rotated)
      ctx.save()
      for (let j = 0; j < N; j++) {
        ctx.save()
        ctx.translate(labelPad + j * cellSize + cellSize / 2, labelPad - 4)
        ctx.rotate(-Math.PI / 2)
        const label = names[j].length > 16 ? names[j].slice(0, 14) + '…' : names[j]
        ctx.fillText(label, 0, 0)
        ctx.restore()
      }
      ctx.restore()
    }
  }, [names, matrix, N, maxDist])

  return (
    <div className="heatmap-container">
      <div className="heatmap-legend">
        <span>0 SNPs</span>
        <div className="legend-gradient" />
        <span>{maxDist} SNPs (max)</span>
      </div>
      <div className="heatmap-scroll">
        <canvas ref={canvasRef} className="heatmap-canvas" />
      </div>
    </div>
  )
}
```

### DistanceHistogram

SVG bar chart of all pairwise distances (excluding self-comparisons).

**Step 2: Create `src/components/DistanceHistogram.tsx`**

```typescript
import { useMemo } from 'react'

interface DistanceHistogramProps {
  names: string[]
  matrix: number[][]
  clusterThreshold?: number
  onThresholdChange?: (val: number) => void
}

export function DistanceHistogram({
  names,
  matrix,
  clusterThreshold,
  onThresholdChange,
}: DistanceHistogramProps) {
  const N = names.length

  const { bins, binWidth, maxCount, maxDist, allDistances } = useMemo(() => {
    const allDistances: number[] = []
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        allDistances.push(matrix[i][j])
      }
    }
    if (allDistances.length === 0) return { bins: [], binWidth: 1, maxCount: 0, maxDist: 0, allDistances: [] }

    const maxDist = Math.max(...allDistances)
    const numBins = Math.min(50, maxDist + 1)
    const binWidth = Math.ceil((maxDist + 1) / numBins)
    const bins = new Array(numBins).fill(0)
    for (const d of allDistances) {
      const bin = Math.floor(d / binWidth)
      if (bin < numBins) bins[bin]++
    }
    const maxCount = Math.max(...bins)
    return { bins, binWidth, maxCount, maxDist, allDistances }
  }, [matrix, N])

  if (allDistances.length === 0) return null

  const svgWidth = 600
  const svgHeight = 200
  const padL = 45
  const padB = 30
  const padT = 10
  const padR = 10
  const plotW = svgWidth - padL - padR
  const plotH = svgHeight - padB - padT

  const barW = plotW / bins.length - 1

  return (
    <div className="histogram-container">
      <div className="histogram-controls">
        <label htmlFor="threshold-input" className="threshold-label">
          Cluster threshold:
          <input
            id="threshold-input"
            type="number"
            min={0}
            max={maxDist}
            value={clusterThreshold ?? ''}
            placeholder="e.g. 12"
            onChange={(e) => onThresholdChange?.(parseInt(e.target.value, 10) || 0)}
            className="number-input"
          />
          <span className="threshold-hint">SNPs</span>
        </label>
      </div>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="histogram-svg" role="img" aria-label="SNP distance distribution">
        {/* Bars */}
        {bins.map((count, i) => {
          const x = padL + i * (barW + 1)
          const h = (count / maxCount) * plotH
          const y = padT + plotH - h
          const belowThreshold = clusterThreshold !== undefined && i * binWidth < clusterThreshold
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={belowThreshold ? 'rgba(239,68,68,0.7)' : 'rgba(45,212,191,0.7)'}
              stroke={belowThreshold ? 'rgba(239,68,68,0.9)' : 'rgba(45,212,191,0.9)'}
              strokeWidth="0.5"
            >
              <title>{`${i * binWidth}–${(i + 1) * binWidth - 1} SNPs: ${count} pairs`}</title>
            </rect>
          )
        })}
        {/* Threshold line */}
        {clusterThreshold !== undefined && clusterThreshold > 0 && (
          <line
            x1={padL + (clusterThreshold / (maxDist + 1)) * plotW}
            x2={padL + (clusterThreshold / (maxDist + 1)) * plotW}
            y1={padT}
            y2={padT + plotH}
            stroke="rgba(239,68,68,0.9)"
            strokeWidth="2"
            strokeDasharray="4,3"
          />
        )}
        {/* X axis */}
        <line x1={padL} x2={padL + plotW} y1={padT + plotH} y2={padT + plotH} stroke="var(--gx-border)" strokeWidth="1" />
        {/* Y axis */}
        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="var(--gx-border)" strokeWidth="1" />
        {/* X axis labels */}
        {[0, Math.round(maxDist / 4), Math.round(maxDist / 2), Math.round(3 * maxDist / 4), maxDist].map((val) => (
          <text
            key={val}
            x={padL + (val / (maxDist + 1)) * plotW}
            y={svgHeight - 5}
            textAnchor="middle"
            fontSize="9"
            fill="var(--gx-text-muted)"
          >{val}</text>
        ))}
        {/* Y axis labels */}
        <text x={padL - 5} y={padT + plotH / 2} textAnchor="end" fontSize="9" fill="var(--gx-text-muted)" transform={`rotate(-90, ${padL - 5}, ${padT + plotH / 2})`}>Pairs</text>
        {/* Axis titles */}
        <text x={padL + plotW / 2} y={svgHeight} textAnchor="middle" fontSize="10" fill="var(--gx-text-muted)">Pairwise SNP distance</text>
      </svg>
      <div className="histogram-stats">
        <span>Min: {Math.min(...allDistances)}</span>
        <span>Median: {allDistances.sort((a, b) => a - b)[Math.floor(allDistances.length / 2)]}</span>
        <span>Max: {maxDist}</span>
        <span>Pairs: {allDistances.length}</span>
      </div>
    </div>
  )
}
```

**Step 3: Create `src/components/ResultsSummary.tsx`**

Top-level result container with tabs: Heatmap | Histogram | Table.

```typescript
import { useState, useCallback } from 'react'
import { saveAs } from 'file-saver'
import type { SnpDistsResult } from '../snp-distsx/types'
import { formatMatrix, formatMolten } from '../snp-distsx/formatOutput'
import { DistanceHeatmap } from './DistanceHeatmap'
import { DistanceHistogram } from './DistanceHistogram'

type ResultTab = 'heatmap' | 'histogram' | 'table'

interface ResultsSummaryProps {
  result: SnpDistsResult
}

export function ResultsSummary({ result }: ResultsSummaryProps) {
  const [tab, setTab] = useState<ResultTab>('heatmap')
  const [clusterThreshold, setClusterThreshold] = useState<number | undefined>(undefined)
  const { names, matrix, sequenceCount, alignmentLength, computationTimeMs, options } = result

  const handleExportTSV = useCallback(() => {
    const content = formatMatrix(names, matrix, { ...options, csvOutput: false })
    const blob = new Blob([content], { type: 'text/tab-separated-values' })
    saveAs(blob, 'snp_distances.tsv')
  }, [names, matrix, options])

  const handleExportCSV = useCallback(() => {
    const content = formatMatrix(names, matrix, { ...options, csvOutput: true })
    const blob = new Blob([content], { type: 'text/csv' })
    saveAs(blob, 'snp_distances.csv')
  }, [names, matrix, options])

  const handleExportLong = useCallback(() => {
    const content = formatMolten(names, matrix, { ...options, molten: true, moltenHeaders: true })
    const blob = new Blob([content], { type: 'text/tab-separated-values' })
    saveAs(blob, 'snp_distances_long.tsv')
  }, [names, matrix, options])

  return (
    <section className="results">
      <div className="results-header">
        <div>
          <h2>Results</h2>
          <div className="results-meta">
            <span>{sequenceCount} sequences</span>
            <span>{alignmentLength.toLocaleString()} bp alignment</span>
            <span>{computationTimeMs.toFixed(0)}ms</span>
          </div>
        </div>
        <div className="results-actions">
          <button className="export-button" onClick={handleExportTSV}>Export TSV</button>
          <button className="export-button" onClick={handleExportCSV}>Export CSV</button>
          <button className="export-button" onClick={handleExportLong}>Export Long</button>
        </div>
      </div>

      <div className="result-tabs">
        {(['heatmap', 'histogram', 'table'] as ResultTab[]).map((t) => (
          <button
            key={t}
            className={`result-tab ${tab === t ? 'result-tab-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'heatmap' && <DistanceHeatmap names={names} matrix={matrix} />}

      {tab === 'histogram' && (
        <DistanceHistogram
          names={names}
          matrix={matrix}
          clusterThreshold={clusterThreshold}
          onThresholdChange={setClusterThreshold}
        />
      )}

      {tab === 'table' && (
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th></th>
                {names.map((n) => <th key={n} title={n}>{n.length > 12 ? n.slice(0, 10) + '…' : n}</th>)}
              </tr>
            </thead>
            <tbody>
              {names.map((rowName, i) => (
                <tr key={rowName}>
                  <th>{rowName.length > 12 ? rowName.slice(0, 10) + '…' : rowName}</th>
                  {matrix[i].map((val, j) => (
                    <td
                      key={j}
                      style={{
                        background: i === j ? 'transparent' : `rgba(45,212,191,${Math.min(0.6, val / (Math.max(...matrix.flat().filter((_, idx) => idx % (names.length + 1) !== 0)) || 1) * 0.6)})`,
                        fontFamily: 'var(--gx-font-mono)',
                        textAlign: 'right',
                      }}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
```

---

## Task 5: App.tsx, App.css, and index.css

**Files:**
- Create: `src/App.tsx`
- Create: `src/App.css`
- Create: `src/index.css`

**Step 1: Create `src/index.css`**

Copy the full GX design token system from `references/design-tokens.md` exactly.

**Step 2: Create `src/App.tsx`**

Wire together: FileUpload + OptionsPanel + run button → progress → ResultsSummary + LogConsole. Add tabs: Analysis | About.

```typescript
import { useState, useEffect, useCallback } from 'react'
import { FileUpload } from './components/FileUpload'
import { LogConsole } from './components/LogConsole'
import { AboutPage } from './components/AboutPage'
import { OptionsPanel } from './components/OptionsPanel'
import { ResultsSummary } from './components/ResultsSummary'
import { runSnpDistsx } from './snp-distsx/pipeline'
import { DEFAULT_OPTIONS } from './snp-distsx/types'
import type { SnpDistsResult, SnpDistsOptions } from './snp-distsx/types'
import './App.css'

type Theme = 'light' | 'dark'
type View = 'analysis' | 'about'

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [options, setOptions] = useState<SnpDistsOptions>(DEFAULT_OPTIONS)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [error, setError] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<SnpDistsResult | null>(null)
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('gx-theme') as Theme) || 'dark')
  const [currentView, setCurrentView] = useState<View>('analysis')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gx-theme', theme)
  }, [theme])

  const handleRun = useCallback(async () => {
    if (files.length === 0) return
    setRunning(true)
    setError('')
    setResult(null)
    setLogLines([])
    setProgress('Starting...')
    setProgressPct(0)

    try {
      const res = await runSnpDistsx(
        files,
        options,
        (msg, pct) => { setProgress(msg); setProgressPct(pct) },
        (msg) => { setLogLines((prev) => [...prev, msg]) },
      )
      setResult(res)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }, [files, options])

  const canRun = files.length > 0 && !running

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="header-brand">
            <h1>snp-distsx</h1>
            <span className="header-badge">TypeScript</span>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '\u263E' : '\u2600'}
          </button>
        </div>
        <p className="subtitle">Pairwise SNP distance matrix from aligned FASTA — runs entirely in your browser</p>
        <nav className="tab-bar">
          <button className={`tab ${currentView === 'analysis' ? 'tab-active' : ''}`} onClick={() => setCurrentView('analysis')}>Analysis</button>
          <button className={`tab ${currentView === 'about' ? 'tab-active' : ''}`} onClick={() => setCurrentView('about')}>About</button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'analysis' ? (
          <>
            <div className="controls">
              <FileUpload files={files} onFilesChange={setFiles} disabled={running} />
              <OptionsPanel options={options} onChange={setOptions} disabled={running} />
            </div>

            <button className="run-button" onClick={handleRun} disabled={!canRun}>
              {running ? 'Computing...' : 'Compute SNP Distances'}
            </button>

            {running && (
              <section className="progress" aria-live="polite">
                <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="progress-text">{progress}</p>
              </section>
            )}

            {error && (
              <section className="error" role="alert">
                <p>{error}</p>
              </section>
            )}

            {result && <ResultsSummary result={result} />}

            {logLines.length > 0 && <LogConsole lines={logLines} />}
          </>
        ) : (
          <AboutPage />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span>GenomicX &mdash; open-source bioinformatics for the browser</span>
          <div className="footer-links">
            <a href="https://github.com/genomicx" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://genomicx.vercel.app/about" target="_blank" rel="noopener noreferrer">Mission</a>
            <a href="https://www.happykhan.com/" target="_blank" rel="noopener noreferrer">Nabil-Fareed Alikhan</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
```

**Step 3: Create `src/App.css`**

Use the vite scaffold App.css template plus extra sections for:
- `.options-panel` and `.options-grid` (two-column grid of checkboxes)
- `.option-item` (flex row with checkbox + label + description)
- `.number-input` (compact number input)
- `.result-tabs` (secondary tab bar for heatmap/histogram/table)
- `.result-tab` and `.result-tab-active`
- `.results-meta` (badges with sequence count, alignment length)
- `.heatmap-container`, `.heatmap-scroll`, `.heatmap-canvas`, `.heatmap-legend`
- `.histogram-container`, `.histogram-svg`, `.histogram-stats`, `.histogram-controls`
- `.threshold-label`, `.threshold-hint`
- `.header-badge` (TypeScript pill)
- `.header-brand` (flex row for h1 + badge)
- `.workflow-list` (about page ordered list)
- `.references`, `.reference-item`
- `.author-block`

---

## Task 6: README.md and Dockerfile

**Files:**
- Create: `README.md`
- Create: `Dockerfile`

**Step 1: Create README.md**

```markdown
# snp-distsx

> Browser-based pairwise SNP distance matrix calculator from aligned FASTA files.

snp-distsx is a web application implementing the [snp-dists](https://github.com/tseemann/snp-dists) algorithm by [Torsten Seemann](https://github.com/tseemann), reimplemented in TypeScript for the browser. No data ever leaves your machine.

## Features

- Upload a multiple sequence alignment (FASTA / gzipped FASTA)
- Compute pairwise SNP distances entirely in-browser
- Interactive heatmap visualisation with colour-coded distance matrix
- Distribution histogram of pairwise distances with cluster threshold slider
- Scrollable distance table with conditional formatting
- Export to TSV, CSV, or long/molten format
- All snp-dists options: `-a`, `-k`, `-c`, `-b`, `-m`, `-t`, `-L`, `-x`
- Light/dark theme

## Algorithm

Reimplementation of [snp-dists v1.2.0](https://github.com/tseemann/snp-dists) by Torsten Seemann (Melbourne Bioinformatics).

For each pair of aligned sequences (A, B):
- Count SNP at position i if: `A[i] ≠ B[i]` and neither A[i] nor B[i] is an ignore character
- By default, non-ACGT bases (gaps `-`, Ns, IUPAC codes) are replaced with `.` and skipped
- Use **Count all differences** (`-a`) to include these positions

## Typical Workflow

```
snippy-core --ref ref.fna sample_1/ sample_2/ ... → core.full.aln
                    ↓
snp-distsx (upload core.full.aln) → interactive matrix + heatmap
                    ↓
     Export TSV/CSV for downstream analysis
```

Optional recombination masking: pipe through [Gubbins](https://github.com/nickjcroucher/gubbins) before uploading.

## Input

A FASTA file where all sequences are the same length (a multiple sequence alignment / pseudo-alignment). Accepts: `.fasta`, `.fa`, `.fna`, `.aln`, `.fsa`, and `.gz` variants.

## Development

```bash
npm install
npm run dev       # start dev server on http://localhost:5173
npm run test      # run unit tests
npm run build     # production build
npm run check     # tests + lint + build
```

## Docker

```bash
# Build
docker build -t snp-distsx .

# Run (serves on http://localhost:8080)
docker run -p 8080:80 snp-distsx
```

## Testing

Unit tests cover:
- FASTA parser (edge cases: multi-line, empty, mismatched lengths)
- Core distance algorithm (SNP counting, gap skipping, maxDiff early exit)
- Output formatting (TSV, CSV, molten formats)

```bash
npm run test
```

## Attribution

**Original snp-dists tool:**
Seemann T (2018). snp-dists: Pairwise SNP distance matrix from a FASTA sequence alignment.
https://github.com/tseemann/snp-dists — GPLv3

**Web application:**
Nabil-Fareed Alikhan <nabil@happykhan.com>
Centre for Genomic Pathogen Surveillance, University of Oxford

## License

GPL-3.0-only — see [LICENSE](LICENSE)
```

**Step 2: Create Dockerfile**

Multi-stage build: node:20-alpine build stage → nginx:alpine serve stage.

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Step 3: Create nginx.conf**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|wasm|png|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
}
```

---

## Task 7: Portal registration

**Files:**
- Modify: `/home/ubuntu/code/genomicx/genomicx.github.io/apps.json`

Add this entry to the array:
```json
{
  "id": "snp-distsx",
  "name": "snp-distsx",
  "tagline": "SNP Distance Matrix in Your Browser",
  "description": "Browser-based pairwise SNP distance matrix calculator from aligned FASTA files. Reimplements Torsten Seemann's snp-dists entirely in TypeScript.",
  "icon": "dna",
  "tech": ["TypeScript", "Vite", "React"],
  "features": [
    "Interactive heatmap visualisation",
    "Distance distribution histogram with cluster threshold",
    "Export TSV, CSV, long format",
    "All snp-dists options (-a, -k, -c, -b, -m, -t, -L, -x)",
    "Client-side processing with no data uploads"
  ],
  "demoUrl": "https://snp-distsx.vercel.app",
  "sourceUrl": "https://github.com/happykhan/snp-distsx",
  "color": "#0d9488",
  "status": {
    "scoping": "done",
    "pipeline": "done",
    "webDev": "in-progress",
    "benchmarking": "not-started"
  }
}
```

---

## Task 8: Final integration, styling, and verification

**Step 1: Run all tests**
```bash
cd /home/ubuntu/code/genomicx/snp-distsx
npm run test
```
Expected: All tests PASS.

**Step 2: Run lint**
```bash
npm run lint
```
Expected: No errors.

**Step 3: Run build**
```bash
npm run build
```
Expected: `dist/` produced with no TypeScript errors.

**Step 4: Run dev server and smoke-test**
```bash
npm run dev
```
Open http://localhost:5173, upload a test FASTA alignment, verify matrix renders.

**Step 5: Save memory**

Update `/home/ubuntu/.claude/projects/-home-ubuntu-code-genomicx-snp-distsx/memory/MEMORY.md` with key details about this project.

---

## Test FASTA for smoke testing

Save to `test-data/test_alignment.fasta`:

```
>Reference
ATGCTAGCTAGCTAGCTAGCTAGCT
>Sample_1
ATGCTAGCTAGCTAGCTAGCTAGCT
>Sample_2
ATGCTAGCTAGCTAGCAAGCTAGCT
>Sample_3
ATGCNAGCTAGCTAGCTAGCTAGCT
>Sample_4
TTGCTAGCTAGCTAGCTAGCTAGCA
```

Expected matrix:
- Sample_1 vs Sample_2: 1 SNP (pos 15)
- Sample_1 vs Sample_3: 0 SNPs (pos 4 is N, skipped)
- Sample_1 vs Sample_4: 2 SNPs (pos 0: A→T, pos 24: T→A)
