// tests/unit/balances.test.ts — Tests unitaires pour computeBalances
//
// EXERCICE 1 — Tests unitaires
//
// Couvre les cas obligatoires et quelques cas limites.

import { describe, it, expect } from 'vitest';
import { computeBalances } from '../../src/domain/balances';
import type { Group, Expense } from '../../src/domain/types';

describe('computeBalances', () => {
  const sampleGroup: Group = {
    id: 'group1',
    name: 'Test Group',
    currency: 'EUR',
    members: [
      { id: 'alice', name: 'Alice', email: 'alice@test.com' },
      { id: 'bob', name: 'Bob', email: 'bob@test.com' },
      { id: 'charlie', name: 'Charlie', email: 'charlie@test.com' },
    ],
  };

  it('groupe vide retourne tous les soldes à 0', () => {
    const emptyGroup: Group = { ...sampleGroup, members: [] };
    const result = computeBalances(emptyGroup, []);
    expect(result).toEqual({});
  });

  it('une dépense equal entre 3 personnes (payeur inclus)', () => {
    const expense: Expense = {
      id: 'exp1',
      groupId: 'group1',
      description: 'Restaurant',
      amount: 30,
      currency: 'EUR',
      paidBy: 'alice',
      paidAt: new Date(),
      split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
      createdAt: new Date(),
    };

    const result = computeBalances(sampleGroup, [expense]);
    expect(result.alice).toBeCloseTo(30 - 10, 2); // 30 - (30/3)
    expect(result.bob).toBeCloseTo(-10, 2);
    expect(result.charlie).toBeCloseTo(-10, 2);
  });

  it('une dépense equal entre 3 personnes (payeur exclu)', () => {
    const expense: Expense = {
      id: 'exp1',
      groupId: 'group1',
      description: 'Restaurant',
      amount: 30,
      currency: 'EUR',
      paidBy: 'alice',
      paidAt: new Date(),
      split: { mode: 'equal', beneficiaries: ['bob', 'charlie'] },
      createdAt: new Date(),
    };

    const result = computeBalances(sampleGroup, [expense]);
    expect(result.alice).toBe(30);
    expect(result.bob).toBe(-15);
    expect(result.charlie).toBe(-15);
  });

  it('plusieurs dépenses qui se compensent partiellement', () => {
    const expenses: Expense[] = [
      {
        id: 'exp1',
        groupId: 'group1',
        description: 'Restaurant',
        amount: 30,
        currency: 'EUR',
        paidBy: 'alice',
        paidAt: new Date(),
        split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
        createdAt: new Date(),
      },
      {
        id: 'exp2',
        groupId: 'group1',
        description: 'Transport',
        amount: 15,
        currency: 'EUR',
        paidBy: 'bob',
        paidAt: new Date(),
        split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
        createdAt: new Date(),
      },
    ];

    const result = computeBalances(sampleGroup, expenses);
    expect(result.alice).toBeCloseTo(30 - 10 - 5, 2); // 20 - 5 = 15
    expect(result.bob).toBeCloseTo(15 - 10 - 5, 2); // 15 - 15 = 0
    expect(result.charlie).toBeCloseTo(-10 - 5, 2); // -15
  });

  it('une dépense weighted avec poids non-uniformes', () => {
    const expense: Expense = {
      id: 'exp1',
      groupId: 'group1',
      description: 'Voiture',
      amount: 100,
      currency: 'EUR',
      paidBy: 'alice',
      paidAt: new Date(),
      split: {
        mode: 'weighted',
        weights: { alice: 1, bob: 2, charlie: 3 }
      },
      createdAt: new Date(),
    };

    const result = computeBalances(sampleGroup, [expense]);
    const totalWeight = 1 + 2 + 3; // 6
    expect(result.alice).toBeCloseTo(100 - (100 * 1) / 6, 2); // 100 - 16.67 ≈ 83.33
    expect(result.bob).toBeCloseTo(-(100 * 2) / 6, 2); // -33.33
    expect(result.charlie).toBeCloseTo(-(100 * 3) / 6, 2); // -50
  });

  it('une dépense percentage avec arrondis', () => {
    const expense: Expense = {
      id: 'exp1',
      groupId: 'group1',
      description: 'Courses',
      amount: 100,
      currency: 'EUR',
      paidBy: 'alice',
      paidAt: new Date(),
      split: {
        mode: 'percentage',
        percentages: { alice: 33.33, bob: 33.33, charlie: 33.34 }
      },
      createdAt: new Date(),
    };

    const result = computeBalances(sampleGroup, [expense]);
    expect(result.alice).toBeCloseTo(100 - 33.33, 2); // 66.67
    expect(result.bob).toBeCloseTo(-33.33, 2);
    expect(result.charlie).toBeCloseTo(-33.34, 2);
  });

  // Cas limites
  it('membre supprimé figurant dans une vieille dépense', () => {
    const groupWithRemovedMember: Group = {
      ...sampleGroup,
      members: [sampleGroup.members[0], sampleGroup.members[1]], // Charlie supprimé
    };

    const expense: Expense = {
      id: 'exp1',
      groupId: 'group1',
      description: 'Ancien achat',
      amount: 30,
      currency: 'EUR',
      paidBy: 'charlie', // Payeur supprimé
      paidAt: new Date(),
      split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
      createdAt: new Date(),
    };

    const result = computeBalances(groupWithRemovedMember, [expense]);
    expect(result.alice).toBe(-10); // Seulement les membres actuels
    expect(result.bob).toBe(-10);
    expect(result.charlie).toBeUndefined(); // Membre supprimé ignoré
  });

  it('dépense de 0€', () => {
    const expense: Expense = {
      id: 'exp1',
      groupId: 'group1',
      description: 'Rien',
      amount: 0,
      currency: 'EUR',
      paidBy: 'alice',
      paidAt: new Date(),
      split: { mode: 'equal', beneficiaries: ['alice', 'bob', 'charlie'] },
      createdAt: new Date(),
    };

    const result = computeBalances(sampleGroup, [expense]);
    expect(result.alice).toBe(0);
    expect(result.bob).toBe(0);
    expect(result.charlie).toBe(0);
  });

  it('liste vide de dépenses', () => {
    const result = computeBalances(sampleGroup, []);
    expect(result.alice).toBe(0);
    expect(result.bob).toBe(0);
    expect(result.charlie).toBe(0);
  });
});