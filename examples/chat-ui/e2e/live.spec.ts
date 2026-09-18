import { expect, test } from '@playwright/test';

const enabled = process.env.LIVE_LLM_TEST === '1';

test.describe('live LLM UI smoke', () => {
  test.skip(!enabled, 'Set LIVE_LLM_TEST=1 with Nest running on :3000');

  test('suggestion chip produces an assistant turn without an error banner', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'What can you do?' }).click();

    await expect(page.getByText('Streaming').or(page.getByText('Thinking'))).toBeVisible({
      timeout: 15_000,
    });

    // Wait until the agent finishes; do not assert model wording.
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('Assistant', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
