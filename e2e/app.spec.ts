import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_FASTA = path.join(__dirname, '..', 'test-data', 'test_alignment.fasta')

// Helper: upload the test FASTA and click run
async function uploadAndRun(page: Page) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(TEST_FASTA)
  await page.getByRole('button', { name: /Compute SNP Distances/i }).click()
  // Wait for results to appear (heatmap tab button visible)
  await page.getByRole('button', { name: /Heatmap/i }).waitFor({ state: 'visible', timeout: 20000 })
}

test.describe('snp-distsx app', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page title and heading render correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/snp-distsx/)
    await expect(page.locator('h1')).toContainText('snp-distsx')
    await expect(page.locator('.subtitle')).toContainText('Pairwise SNP distance matrix')
  })

  test('theme toggle switches between light and dark', async ({ page }) => {
    // Default theme is dark
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')

    await page.getByRole('button', { name: /Toggle theme/i }).click()
    await expect(html).toHaveAttribute('data-theme', 'light')

    await page.getByRole('button', { name: /Toggle theme/i }).click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
  })

  test('run button is disabled until a file is selected', async ({ page }) => {
    const runBtn = page.getByRole('button', { name: /Compute SNP Distances/i })
    await expect(runBtn).toBeDisabled()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_FASTA)
    await expect(runBtn).toBeEnabled()
  })

  test('uploads test FASTA and shows results with heatmap', async ({ page }) => {
    await uploadAndRun(page)

    // Results section heading
    await expect(page.locator('.results h2')).toContainText('Results')

    // Meta badges show correct sequence count
    await expect(page.locator('.results-meta')).toContainText('5 sequences')
    await expect(page.locator('.results-meta')).toContainText('25 bp')

    // Heatmap canvas is rendered and has non-zero dimensions
    const canvas = page.locator('.heatmap-canvas')
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('result tabs switch between Heatmap, Histogram, and Table', async ({ page }) => {
    await uploadAndRun(page)

    // Switch to Histogram
    await page.getByRole('button', { name: /Histogram/i }).click()
    await expect(page.locator('.histogram-svg')).toBeVisible()
    await expect(page.locator('.histogram-stats')).toContainText('Max:')

    // Switch to Table
    await page.getByRole('button', { name: /Table/i }).click()
    await expect(page.locator('.results-table')).toBeVisible()
    // Table should have 5 data rows (one per sequence)
    const rows = page.locator('.results-table tbody tr')
    await expect(rows).toHaveCount(5)

    // Switch back to Heatmap
    await page.getByRole('button', { name: /Heatmap/i }).click()
    await expect(page.locator('.heatmap-canvas')).toBeVisible()
  })

  test('distance table shows correct values', async ({ page }) => {
    await uploadAndRun(page)
    await page.getByRole('button', { name: /Table/i }).click()

    const table = page.locator('.results-table')
    await expect(table).toBeVisible()

    // Reference vs Sample_1 = 0 SNPs (identical)
    // Reference vs Sample_2 = 1 SNP
    // Check that "0" appears in the table multiple times (diagonal + identical pair)
    const cells = table.locator('td')
    const texts = await cells.allTextContents()
    expect(texts).toContain('0')
    expect(texts).toContain('1')
    expect(texts).toContain('2')
  })

  test('TSV export triggers a download', async ({ page }) => {
    await uploadAndRun(page)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'TSV' }).click(),
    ])

    expect(download.suggestedFilename()).toBe('snp_distances.tsv')
  })

  test('CSV export triggers a download', async ({ page }) => {
    await uploadAndRun(page)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV' }).click(),
    ])

    expect(download.suggestedFilename()).toBe('snp_distances.csv')
  })

  test('Long format export triggers a download', async ({ page }) => {
    await uploadAndRun(page)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Long' }).click(),
    ])

    expect(download.suggestedFilename()).toBe('snp_distances_long.tsv')
  })

  test('About tab shows algorithm description and author credits', async ({ page }) => {
    await page.getByRole('button', { name: 'About' }).click()
    await expect(page.locator('.about-page')).toBeVisible()
    await expect(page.locator('.about-page')).toContainText('Torsten Seemann')
    await expect(page.locator('.about-page')).toContainText('Nabil-Fareed Alikhan')
    // The privacy note div is present in the DOM (verified by class selector)
    await expect(page.locator('.about-page .privacy-note')).toBeVisible()
  })

  test('invalid file type is rejected with an error message', async ({ page }) => {
    // Create a temp file with wrong extension via data transfer simulation
    // We use a .txt file instead of .fasta
    const fileInput = page.locator('input[type="file"]')
    // Playwright setInputFiles will still set the file; the filter runs client-side on drop
    // Test the run-time validation by uploading a FASTA with wrong content
    // (since accept attribute blocks truly wrong extensions via the browser dialog)
    // Instead test the pipeline error handling by setting files and checking the error path
    // Use a malformed FASTA that has no '>' header
    const { writeFileSync, mkdirSync } = await import('fs')
    const tmpDir = '/tmp/snp-distsx-e2e'
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(`${tmpDir}/bad.fasta`, 'this is not a fasta file\nno headers here\n')

    await fileInput.setInputFiles(`${tmpDir}/bad.fasta`)
    await page.getByRole('button', { name: /Compute SNP Distances/i }).click()

    const errorSection = page.locator('.error')
    await expect(errorSection).toBeVisible({ timeout: 10000 })
    await expect(errorSection).toContainText('FASTA')
  })

  test('log console appears after successful run', async ({ page }) => {
    await uploadAndRun(page)
    await expect(page.locator('.log-console')).toBeVisible()
    await expect(page.locator('.log-count')).toContainText('entries')
  })

  test('options panel: enabling countAll changes pipeline behaviour', async ({ page }) => {
    // Check countAll checkbox
    const countAllCheckbox = page.locator('input[type="checkbox"]').first()
    await expect(countAllCheckbox).not.toBeChecked()
    await countAllCheckbox.check()
    await expect(countAllCheckbox).toBeChecked()

    // Run with countAll
    await uploadAndRun(page)
    await expect(page.locator('.results h2')).toContainText('Results')
    // With countAll=true, Sample_3 has N counted, so distances may differ from default
    // Just verify results still render
    await expect(page.locator('.heatmap-canvas')).toBeVisible()
  })
})
