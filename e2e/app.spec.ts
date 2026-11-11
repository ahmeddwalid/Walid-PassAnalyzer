import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const routes = [
  { path: '#/analyze', heading: 'Password analysis' },
  { path: '#/generate', heading: 'Randomness' },
  { path: '#/compare', heading: 'Choose with evidence' },
  { path: '#/dictionaries', heading: 'Make the local model' },
  { path: '#/learn', heading: 'The parts that' },
  { path: '#/privacy', heading: 'What leaves' },
];

test.describe('analysis', () => {
  test('preserves whitespace and produces a pattern-aware assessment', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('#/analyze');
    const input = page.getByLabel('Password to analyze');
    await input.fill('   ');
    await expect(input).toHaveValue('   ');
    await expect(page.getByText('Whitespace-only input')).toBeVisible();

    await input.fill('Tr0ub4dor&3');
    await expect(page.getByRole('heading', { name: /guessable/i })).toBeVisible();
    await expect(page.getByText('Estimated work to exhaust')).toBeVisible();
    await expect(page.getByText('Why this result')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pwned Passwords' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('refuses to truncate an overlong candidate', async ({ page }) => {
    await page.goto('#/analyze');
    const input = page.getByLabel('Password to analyze');
    const value = 'a'.repeat(257);
    await input.fill(value);
    await expect(input).toHaveValue(value);
    await expect(page.getByText(/limited to 256 characters/i)).toBeVisible();
  });

  test('does not run the breach check automatically and sends only a prefix when asked', async ({
    page,
  }) => {
    await page.route('https://api.pwnedpasswords.com/**', async (route) => {
      const url = route.request().url();
      expect(url).toMatch(/\/range\/[0-9A-F]{5}$/);
      expect(url).not.toContain('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: '1E4C9B93F3F0682250B6CF8331B7EE68FD8:42\r\n0000000000000000000000000000000000A:12\r\n',
      });
    });

    await page.goto('#/analyze');
    await page.getByLabel('Password to analyze').fill('password');
    await expect(page.getByRole('button', { name: 'Check this candidate' })).toBeVisible();
    await expect(page.getByText(/FOUND IN THE BREACH CORPUS/i)).toHaveCount(0);
    await page.getByRole('button', { name: 'Check this candidate' }).click();
    await expect(page.getByText(/appears 42 times/i)).toBeVisible();
  });

  test('exports a text report that contains no candidate', async ({ page }) => {
    await page.goto('#/analyze');
    const candidate = 'UniqueCandidate-Not-In-Report-9x';
    await page.getByLabel('Password to analyze').fill(candidate);
    await expect(page.getByRole('button', { name: 'Export text' })).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export text' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(download.suggestedFilename()).toMatch(
      /^passanalyzer-assessment-\d{4}-\d{2}-\d{2}\.txt$/,
    );
    expect(path).toBeTruthy();
    const text = await readFile(path as string, 'utf8');
    expect(text).toContain('WALID PASSANALYZER');
    expect(text).toContain('no password');
    expect(text).not.toContain(candidate);
  });
});

test.describe('generation', () => {
  test('generates a constrained password and a passphrase', async ({ page }) => {
    await page.goto('#/generate');
    const output = page.locator('.secret-value code');
    await expect(output).toHaveText(/.{20}/);
    const recommended = (await output.textContent()) ?? '';
    expect(recommended).toMatch(/[a-z]/);
    expect(recommended).toMatch(/[A-Z]/);
    expect(recommended).toMatch(/[0-9]/);
    expect(recommended).toMatch(/[^a-zA-Z0-9]/);

    await page.getByRole('button', { name: /maximum compatibility/i }).click();
    await expect.poll(async () => (await output.textContent()) ?? '').toMatch(/^[a-zA-Z0-9]{16}$/);
    await expect(output).not.toHaveText(/[Il1Lo0O]/);

    await page.getByRole('tab', { name: 'Passphrase' }).click();
    await expect(page.getByRole('heading', { name: 'Generated passphrase' })).toBeVisible();
    await expect
      .poll(async () => (await output.textContent()) ?? '')
      .toMatch(/^\S+-\S+-\S+-\S+-\S+-\S+$/);
    await expect(page.getByText('Search-space entropy')).toBeVisible();
  });
});

test.describe('navigation', () => {
  test('mobile menu navigates and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile navigation only');
    await page.goto('#/analyze');
    await page.getByRole('button', { name: /open navigation menu/i }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile primary' })).toBeVisible();
    await page.getByRole('link', { name: '06 Privacy' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('What leaves');
    await expect(page.getByRole('navigation', { name: 'Mobile primary' })).toHaveCount(0);
  });

  test('all primary routes have a single main heading', async ({ page }) => {
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(route.heading);
      expect(await page.getByRole('main').count()).toBe(1);
    }
  });
});

test.describe('accessibility', () => {
  for (const route of routes) {
    test(`axe scan: ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      if (route.path === '#/generate') {
        await expect(page.locator('.secret-value code')).not.toHaveText('');
      }
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          nodes: violation.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    });
  }
});

test.describe('dark theme accessibility', () => {
  test('axe scans the six primary routes in the dark theme', async ({ page }) => {
    await page.goto('#/analyze');
    await page.evaluate(() => localStorage.setItem('pa.theme', 'dark'));
    await page.reload({ waitUntil: 'networkidle' });
    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    }
  });
});
