// tests/unit/expense-service.test.ts — Tests avec les 5 types de doubles
//
// EXERCICE 3 — Doubles de test selon Meszaros
//
// Un seul fichier utilisant explicitement les 5 types de doubles.

import { describe, it, expect, vi } from 'vitest';
import { ExpenseService } from '../../src/domain/expense.service';
import type { CreateExpenseInput } from '../../src/domain/types';
import type { ExpenseRepository } from '../../src/ports/expense.repository';
import type { EmailNotifier } from '../../src/ports/notifier';
import type { Clock } from '../../src/ports/clock';
import type { IdGenerator } from '../../src/ports/id-generator';
import type { Logger } from '../../src/ports/logger';

describe('ExpenseService.create', () => {
  // ─── DUMMY ──────────────────────────────────────
  // Objet factice qui ne fait rien - utilisé pour logger qui n'impacte pas la logique
  const dummyLogger: Logger = {
    info: () => {}, // Ne fait rien
    error: () => {},
  };

  // ─── STUB ───────────────────────────────────────
  // Objets qui retournent des valeurs prédéfinies pour contrôler les entrées
  const stubClock: Clock = {
    now: () => new Date('2023-01-01T12:00:00Z'), // Retourne toujours la même date
  };

  const stubIdGen: IdGenerator = {
    next: () => 'expense-123', // Retourne toujours le même ID
  };

  // ─── FAKE ───────────────────────────────────────
  // Implémentation simplifiée mais fonctionnelle du repository (stockage en mémoire)
  const fakeRepo: ExpenseRepository = {
    expenses: [] as any[], // Stockage en mémoire
    save: async (expense) => {
      fakeRepo.expenses.push(expense);
    },
    findById: async (id) => fakeRepo.expenses.find(e => e.id === id) || null,
    findByGroupId: async (groupId) => fakeRepo.expenses.filter(e => e.groupId === groupId),
    findInDateRange: async () => [],
  };

  // ─── SPY ────────────────────────────────────────
  // Objet qui enregistre les appels pour vérification
  const spyNotifier: EmailNotifier = {
    notifyGroupMembers: vi.fn().mockResolvedValue(undefined), // Enregistre les appels
  };

  // ─── MOCK ───────────────────────────────────────
  // Objet avec attentes prédéfinies sur les appels
  const mockRepo: ExpenseRepository = {
    save: vi.fn().mockResolvedValue(undefined), // Doit être appelé une fois
    findById: vi.fn(),
    findByGroupId: vi.fn(),
    findInDateRange: vi.fn(),
  };

  const sampleInput: CreateExpenseInput = {
    groupId: 'group-1',
    description: 'Restaurant dinner',
    amount: 50,
    currency: 'EUR',
    paidBy: 'alice',
    paidAt: new Date(),
    split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
  };

  it('crée une expense normale (amount < 100) sans notifier', async () => {
    // Arrange
    const service = new ExpenseService(fakeRepo, spyNotifier, stubClock, stubIdGen, dummyLogger);

    // Act
    const result = await service.create(sampleInput);

    // Assert
    expect(result.id).toBe('expense-123');
    expect(result.createdAt).toEqual(new Date('2023-01-01T12:00:00Z'));
    expect(result.description).toBe('Restaurant dinner');
    expect(result.amount).toBe(50);

    // Vérifier que le repository a sauvegardé
    expect(fakeRepo.expenses).toHaveLength(1);
    expect(fakeRepo.expenses[0]).toEqual(result);

    // Vérifier que le notifier N'A PAS été appelé (amount < 100)
    expect(spyNotifier.notifyGroupMembers).not.toHaveBeenCalled();
  });

  it('crée une expense importante (amount >= 100) et notifie', async () => {
    // Arrange
    const importantInput: CreateExpenseInput = {
      ...sampleInput,
      amount: 150,
      description: 'Hotel booking',
    };
    const service = new ExpenseService(mockRepo, spyNotifier, stubClock, stubIdGen, dummyLogger);

    // Act
    const result = await service.create(importantInput);

    // Assert
    expect(result.id).toBe('expense-123');
    expect(result.amount).toBe(150);

    // Vérifier que le repository a été appelé (MOCK)
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockRepo.save).toHaveBeenCalledWith(result);

    // Vérifier que le notifier a été appelé (SPY)
    expect(spyNotifier.notifyGroupMembers).toHaveBeenCalledTimes(1);
    expect(spyNotifier.notifyGroupMembers).toHaveBeenCalledWith(
      'group-1',
      'Nouvelle dépense importante : Hotel booking (150€)'
    );
  });
});