import { Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
  }

  async createGroup(name: string, currency: string, members: string[]) {
    await this.page.getByRole('button', { name: 'Nouveau groupe' }).click();
    await this.page.getByLabel('Nom du groupe').fill(name);
    await this.page.getByLabel('Devise').selectOption(currency);
    await this.page.getByLabel(/Membres/i).fill(members.join('\n'));
    await this.page.getByRole('button', { name: 'Créer' }).click();
    await this.page.getByText(name).waitFor();
  }

  async openGroup(name: string) {
    await this.page.getByText(name).click();
  }

  async hasGroup(name: string) {
    return this.page.getByText(name).isVisible();
  }
}
