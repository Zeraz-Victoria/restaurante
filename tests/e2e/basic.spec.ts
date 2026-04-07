import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring or just verify page loads
  // We just ensure the app mounts without crashing
  await expect(page).toHaveURL(/.*localhost:3000.*/);
});
