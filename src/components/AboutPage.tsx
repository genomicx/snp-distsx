export function AboutPage() {
  return (
    <div className="about-page">
      <section>
        <h2>About snp-distsx</h2>
        <p>
          snp-distsx is a browser-based pairwise SNP distance matrix calculator for multiple
          sequence alignments in FASTA format. It faithfully reimplements the{' '}
          <a href="https://github.com/tseemann/snp-dists" target="_blank" rel="noopener noreferrer">
            snp-dists
          </a>{' '}
          algorithm by{' '}
          <a href="https://github.com/tseemann" target="_blank" rel="noopener noreferrer">
            Torsten Seemann
          </a>{' '}
          (Melbourne Bioinformatics, University of Melbourne) in TypeScript, running entirely in
          your browser with no server uploads.
        </p>
        <p>
          Upload a core genome alignment (e.g. from{' '}
          <a href="https://github.com/tseemann/snippy" target="_blank" rel="noopener noreferrer">
            snippy-core
          </a>{' '}
          or after recombination masking with{' '}
          <a href="https://github.com/nickjcroucher/gubbins" target="_blank" rel="noopener noreferrer">
            Gubbins
          </a>
          ) and get an interactive SNP distance matrix with heatmap, histogram, and table views.
        </p>
        <div className="privacy-note">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>
            No data leaves your machine — all processing happens client-side in TypeScript. Your
            sequences are never uploaded anywhere.
          </p>
        </div>
      </section>

      <section>
        <h2>Algorithm</h2>
        <p>
          For each pair of aligned sequences (A, B) at every position i: count a SNP if{' '}
          <code>A[i] ≠ B[i]</code> and neither base is an ignore character. By default, non-ACGT
          bases (gaps <code>-</code>, Ns, IUPAC ambiguity codes) are replaced with <code>.</code>{' '}
          and skipped. Enable <strong>Count all differences</strong> to include these positions.
        </p>
        <p>
          This is a <em>pairwise</em> gap model: the same column may contribute to some pairs but
          not others. For complete-deletion behaviour, pre-filter with{' '}
          <code>snp-sites -c alignment.fasta</code> before uploading.
        </p>
        <p>
          Sequences are stored as <code>Uint8Array</code> (char codes) for a fast inner-loop
          comparison, closely matching the performance of the original C implementation.
        </p>
      </section>

      <section>
        <h2>Typical Workflow</h2>
        <ol className="workflow-list">
          <li>
            Map reads to a reference genome with <strong>Snippy</strong> (one directory per sample)
          </li>
          <li>
            Generate core genome alignment with <strong>snippy-core</strong> →{' '}
            <code>core.full.aln</code>
          </li>
          <li>
            Optionally mask recombination with <strong>Gubbins</strong> →{' '}
            <code>filtered_polymorphic_sites.fasta</code>
          </li>
          <li>
            Upload the alignment to <strong>snp-distsx</strong> → interactive matrix + heatmap
          </li>
          <li>Export TSV/CSV for downstream analysis, phylogenetics, or cluster review</li>
        </ol>
      </section>

      <section>
        <h2>References</h2>
        <div className="references">
          <div className="reference-item">
            <strong>snp-dists (original tool):</strong> Seemann T (2018). snp-dists: Pairwise SNP
            distance matrix from a FASTA sequence alignment.{' '}
            <a
              href="https://github.com/tseemann/snp-dists"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/tseemann/snp-dists
            </a>
            . GPLv3.
          </div>
          <div className="reference-item">
            <strong>Snippy:</strong> Seemann T. Snippy: fast haploid variant calling from NGS
            reads.{' '}
            <a
              href="https://github.com/tseemann/snippy"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/tseemann/snippy
            </a>
          </div>
          <div className="reference-item">
            <strong>Gubbins:</strong> Croucher NJ, et al. (2015). Rapid phylogenetic analysis of
            large samples of recombinant bacterial whole genome sequences using Gubbins.{' '}
            <em>Nucleic Acids Research</em>, 43(3): e15.{' '}
            <a href="https://doi.org/10.1093/nar/gku1196" target="_blank" rel="noopener noreferrer">
              doi:10.1093/nar/gku1196
            </a>
          </div>
          <div className="reference-item">
            <strong>GraphSNP (cluster visualisation):</strong> Nusantoro R, et al. (2023). GraphSNP:
            an interactive distance viewer for investigating outbreaks and transmission networks.{' '}
            <em>BMC Bioinformatics</em> 24, 209.{' '}
            <a
              href="https://doi.org/10.1186/s12859-023-05332-x"
              target="_blank"
              rel="noopener noreferrer"
            >
              doi:10.1186/s12859-023-05332-x
            </a>
          </div>
        </div>
      </section>

      <section>
        <h2>Authors</h2>
        <div className="author-block">
          <h3>Web application</h3>
          <p className="about-role">Nabil-Fareed Alikhan</p>
          <p className="about-role">
            Senior Bioinformatician, Centre for Genomic Pathogen Surveillance, University of Oxford
          </p>
          <div className="about-links">
            <a href="https://www.happykhan.com" target="_blank" rel="noopener noreferrer">
              happykhan.com
            </a>
            <a
              href="https://orcid.org/0000-0002-1243-0767"
              target="_blank"
              rel="noopener noreferrer"
            >
              ORCID: 0000-0002-1243-0767
            </a>
            <a href="mailto:nabil@happykhan.com">nabil@happykhan.com</a>
            <a href="https://twitter.com/happy_khan" target="_blank" rel="noopener noreferrer">
              @happy_khan
            </a>
            <a
              href="https://mstdn.science/@happykhan"
              target="_blank"
              rel="noopener noreferrer"
            >
              @happykhan@mstdn.science
            </a>
          </div>
        </div>

        <div className="author-block">
          <h3>Original snp-dists algorithm</h3>
          <p className="about-role">Torsten Seemann</p>
          <p className="about-role">
            Melbourne Bioinformatics, University of Melbourne / Peter Doherty Institute
          </p>
          <div className="about-links">
            <a href="https://github.com/tseemann" target="_blank" rel="noopener noreferrer">
              github.com/tseemann
            </a>
            <a
              href="https://twitter.com/torstenseemann"
              target="_blank"
              rel="noopener noreferrer"
            >
              @torstenseemann
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
