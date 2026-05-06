import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home.page';
import { GroupPage } from './pages/group.page';

const groupName = 'Groupe de test';
const members = ['Alice <alice@test.com>', 'Bob <bob@test.com>', 'Charlie <charlie@test.com>'];

test.describe('Splitto E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post('/_test/reset');
    await page.goto('/');
  });

  test('Créer un groupe avec 3 membres', async ({ page }) => {
    const home = new HomePage(page);
    await home.createGroup(groupName, 'EUR', members);

    await expect(page.getByText(groupName)).toBeVisible();
  });

  test('Ajouter une dépense', async ({ page }) => {
    const home = new HomePage(page);
    await home.createGroup(groupName, 'EUR', members);
    await home.openGroup(groupName);

    const group = new GroupPage(page);
    await group.addExpense('Dîner', '30', 'Alice', ['Alice', 'Bob', 'Charlie']);

    expect(await group.hasExpense('Dîner')).toBeTruthy();
  });

  test('Voir les soldes mis à jour après une dépense de 30€', async ({ page }) => {
    const home = new HomePage(page);
    await home.createGroup(groupName, 'EUR', members);
    await home.openGroup(groupName);

    const group = new GroupPage(page);
    await group.addExpense('Dîner', '30', 'Alice', ['Alice', 'Bob', 'Charlie']);

    const aliceBalance = await group.getBalanceFor('Alice');
    const bobBalance = await group.getBalanceFor('Bob');
    const charlieBalance = await group.getBalanceFor('Charlie');

    expect(aliceBalance).toContain('20.00 EUR');
    expect(bobBalance).toContain('-10.00 EUR');
    expect(charlieBalance).toContain('-10.00 EUR');
  });

  test('Marquer un règlement comme réglé', async ({ page }) => {
    const home = new HomePage(page);
    await home.createGroup(groupName, 'EUR', members);
    await home.openGroup(groupName);

    const group = new GroupPage(page);
    await group.addExpense('Dîner', '30', 'Alice', ['Alice', 'Bob', 'Charlie']);

    const beforeCount = await group.getSettlementCount();
    expect(beforeCount).toBeGreaterThan(0);

    await group.settleFirst();

    const afterCount = await group.getSettlementCount();
    expect(afterCount).toBe(beforeCount - 1);
  });
});