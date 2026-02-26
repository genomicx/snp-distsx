# snp-distsx

> Browser-based pairwise SNP distance matrix calculator from aligned FASTA files.

snp-distsx is a web application implementing the [snp-dists](https://github.com/tseemann/snp-dists) algorithm by [Torsten Seemann](https://github.com/tseemann) (Melbourne Bioinformatics, University of Melbourne), reimplemented in TypeScript for the browser. No data ever leaves your machine.

## Features

- Upload a multiple sequence alignment (FASTA or gzipped FASTA)
- Compute pairwise SNP distances entirely client-side — zero server uploads
- **Interactive heatmap** with colour-coded distance matrix (canvas-rendered)
- **Distribution histogram** with adjustable cluster threshold line
- **Scrollable distance table** with conditional cell formatting
- Export to TSV, CSV, or long/molten format
- Supports all snp-dists options: `-a` (count all), `-k` (preserve case), `-c` (CSV), `-b` (blank corner), `-m` (molten), `-t` (headers), `-L` (lower triangle), `-x` (max distance)
- Light/dark theme

## Algorithm

Faithful TypeScript reimplementation of [snp-dists v1.2.0](https://github.com/tseemann/snp-dists) (Torsten Seemann, GPLv3).

For each pair of aligned sequences A and B, at each position i:
- Count a SNP if `A[i] ≠ B[i]` **and** neither `A[i]` nor `B[i]` is an ignore character
- By default, non-ACGT bases (gaps `-`, Ns, IUPAC ambiguity codes) are replaced with `.` and **skipped**
- Enable **Count all differences** (`-a`) to include these positions

Sequences are stored as `Uint8Array` (char codes) for fast inner-loop comparison.

## Typical Workflow

```
snippy (per sample) → snippy-core → core.full.aln
                                          ↓
                    [optional] Gubbins → filtered_polymorphic_sites.fasta
                                          ↓
                              snp-distsx → interactive matrix + heatmap
                                          ↓
                            Export TSV/CSV for downstream analysis or phylogenetics
```

## Input

A FASTA file where **all sequences are the same length** (a multiple sequence alignment or pseudo-alignment). Accepts `.fasta`, `.fa`, `.fna`, `.aln`, `.fsa` and `.gz` compressed variants.

## Development

```bash
npm install
npm run dev       # start dev server at http://localhost:5173
npm run test      # run unit tests
npm run build     # production build to dist/
npm run check     # tests + lint + build (CI equivalent)
```

## Docker

```bash
# Build image
docker build -t snp-distsx .

# Run (serves on http://localhost:8080)
docker run -p 8080:80 snp-distsx
```

## Tests

Unit tests cover:

| Module | Tests |
|--------|-------|
| `parseFasta` | Multi-line sequences, empty input, mismatched lengths, name parsing |
| `computeMatrix` | SNP counting, gap skipping, maxDiff early exit, symmetry |
| `formatOutput` | TSV/CSV, blank corner, lower triangle, molten format |

```bash
npm run test
```

## Attribution

**Original snp-dists tool:**
Seemann T (2018). snp-dists: Pairwise SNP distance matrix from a FASTA sequence alignment.
https://github.com/tseemann/snp-dists — GPLv3

**Web application:**
Nabil-Fareed Alikhan &lt;nabil@happykhan.com&gt;
Centre for Genomic Pathogen Surveillance, University of Oxford
https://www.happykhan.com

## License

GPL-3.0-only — in keeping with the original snp-dists licence.

This program is free software: you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation, version 3 only.
