import { Page } from '@playwright/test';

export class GroupPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async addExpense(description: string, amount: string, paidBy: string, beneficiaries: string[]) {
    await this.page.getByRole('button', { name: 'Ajouter une dépense' }).click();
    await this.page.getByLabel('Description').fill(description);
    await this.page.getByLabel('Montant').fill(amount);
    await this.page.getByLabel('Payé par').selectOption({ label: paidBy });
    for (const beneficiary of beneficiaries) {
      const checkbox = this.page.locator('#input-expense-beneficiaries label', { hasText: beneficiary }).locator('input[type="checkbox"]');
      await checkbox.check();
    }
    await this.page.locator('#dlg-new-expense button[type="submit"]').click();
    await this.page.getByText(description).waitFor();
  }

  async getBalanceFor(memberName: string) {
    const row = this.page.locator('table[aria-label="Soldes des membres"] tbody tr', {
      hasText: memberName,
    }).first();
    return row.locator('td').nth(1).innerText();
  }

  async hasExpense(description: string) {
    return this.page.getByText(description).isVisible();
  }

  async getSettlementCount() {
    return this.page.getByRole('button', { name: 'Régler' }).count();
  }

  async settleFirst() {
    const button = this.page.getByRole('button', { name: 'Régler' }).first();
    await button.click();
  }

  async hasSettlementRow(index: number) {
    return this.page.getByTestId(`settlement-row-${index}`).isVisible();
  }
}
