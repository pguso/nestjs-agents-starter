import { expect, test } from '@playwright/test';

test.describe('empty state', () => {
  test('shows shopping assistant and suggestion chips', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Shopping assistant' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'What can you do?' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Show my orders', exact: true }),
    ).toBeVisible();
  });
});

test.describe('demo fixture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo');
  });

  test('shows tool cards and approval actions', async ({ page }) => {
    await expect(page.getByText('listOrders')).toBeVisible();
    await expect(page.getByText('cancelOrder').first()).toBeVisible();
    await expect(page.getByText('Approval required')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();
    await expect(page.getByText('Waiting for you')).toBeVisible();
  });

  test('blocks the composer while approval is pending', async ({ page }) => {
    const message = page.getByRole('textbox', { name: 'Message' });
    await expect(message).toBeDisabled();
    await expect(message).toHaveAttribute(
      'placeholder',
      'Approve or reject to continue…',
    );
    await expect(
      page.getByRole('button', { name: 'Send message' }),
    ).toBeDisabled();
  });

  test('Approve clears the pending approval and unblocks composer', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Approve' }).click();

    await expect(page.getByText('Approval required')).toHaveCount(0);
    await expect(page.getByText('cancelled').first()).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Message' }),
    ).toBeEnabled();
    await expect(page.getByText('Waiting for you')).toHaveCount(0);
  });

  test('Reject clears the pending approval and unblocks composer', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Reject' }).click();

    await expect(page.getByText('Approval required')).toHaveCount(0);
    await expect(page.getByText('rejected').first()).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Message' }),
    ).toBeEnabled();
  });

  test('theme toggle flips data-theme', async ({ page }) => {
    const root = page.locator('html');
    const before = await root.getAttribute('data-theme');
    expect(before === 'dark' || before === 'light').toBe(true);

    const next = before === 'dark' ? 'light' : 'dark';
    await page
      .getByRole('button', { name: `Switch to ${next} theme` })
      .click();

    await expect(root).toHaveAttribute('data-theme', next);
  });

  test('New chat clears the thread back to empty state', async ({ page }) => {
    await expect(page.getByText('Approval required')).toBeVisible();

    await page.getByRole('button', { name: 'Start a new chat' }).click();

    await expect(
      page.getByRole('heading', { name: 'Shopping assistant' }),
    ).toBeVisible();
    await expect(page.getByText('Approval required')).toHaveCount(0);
  });
});
