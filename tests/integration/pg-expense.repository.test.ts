// tests/integration/pg-expense.repository.test.ts
//
// EXERCICE 4 — Tests d'intégration avec Testcontainers
//
// Tests la vraie implémentation Postgres avec une DB réelle.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { PgExpenseRepository } from '../../src/infrastructure/pg-expense.repository';
import type { Expense } from '../../src/domain/types';

describe('PgExpenseRepository', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repo: PgExpenseRepository;

  beforeAll(async () => {
    // Démarrer Postgres avec Testcontainers
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .start();

    // Créer la connexion
    pool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    // Exécuter les migrations
    const migrationSQL = readFileSync('migrations/001-initial.sql', 'utf8');
    await pool.query(migrationSQL);

    // Créer le repository
    repo = new PgExpenseRepository(pool);
  }, 60000); // Timeout 60s pour le démarrage du container

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    // Nettoyer la DB avant chaque test
    await pool.query('TRUNCATE expenses CASCADE');
    await pool.query('TRUNCATE members CASCADE');
    await pool.query('TRUNCATE groups CASCADE');
  });

  // Helper pour créer une expense de test
  function createTestExpense(overrides: Partial<Expense> = {}): Expense {
    return {
      id: 'expense-1',
      groupId: 'group-1',
      description: 'Test expense',
      amount: 100,
      currency: 'EUR',
      paidBy: 'alice',
      paidAt: new Date('2023-01-01T12:00:00Z'),
      split: { mode: 'equal', beneficiaries: ['alice', 'bob'] },
      category: 'food',
      createdAt: new Date('2023-01-01T12:00:00Z'),
      ...overrides,
    };
  }

  // Helper pour créer un groupe et des membres de test
  async function setupTestGroup() {
    await pool.query(`
      INSERT INTO groups (id, name, currency) VALUES
      ('group-1', 'Test Group 1', 'EUR'),
      ('group-2', 'Test Group 2', 'EUR')
    `);

    await pool.query(`
      INSERT INTO members (id, group_id, name, email) VALUES
      ('alice', 'group-1', 'Alice', 'alice@test.com'),
      ('bob', 'group-1', 'Bob', 'bob@test.com'),
      ('charlie', 'group-2', 'Charlie', 'charlie@test.com')
    `);
  }

  it('save() puis findById() retourne l\'expense identique', async () => {
    await setupTestGroup();
    const expense = createTestExpense();

    await repo.save(expense);
    const found = await repo.findById(expense.id);

    expect(found).toEqual(expense);
  });

  it('findByGroupId() retourne uniquement les expenses du groupe demandé', async () => {
    await setupTestGroup();

    const expense1 = createTestExpense({
      id: 'exp-1',
      groupId: 'group-1',
      description: 'Expense Group 1',
    });

    const expense2 = createTestExpense({
      id: 'exp-2',
      groupId: 'group-2',
      description: 'Expense Group 2',
    });

    await repo.save(expense1);
    await repo.save(expense2);

    const results1 = await repo.findByGroupId('group-1');
    const results2 = await repo.findByGroupId('group-2');

    expect(results1).toHaveLength(1);
    expect(results1[0].groupId).toBe('group-1');
    expect(results1[0].description).toBe('Expense Group 1');

    expect(results2).toHaveLength(1);
    expect(results2[0].groupId).toBe('group-2');
    expect(results2[0].description).toBe('Expense Group 2');
  });

  it('findInDateRange() filtre correctement les dates (inclusif)', async () => {
    await setupTestGroup();

    const baseDate = new Date('2023-01-01T12:00:00Z');

    const expense1 = createTestExpense({
      id: 'exp-1',
      paidAt: new Date(baseDate.getTime() - 24 * 60 * 60 * 1000), // 1 jour avant
    });

    const expense2 = createTestExpense({
      id: 'exp-2',
      paidAt: baseDate, // Exactement la date de début
    });

    const expense3 = createTestExpense({
      id: 'exp-3',
      paidAt: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000), // 12h après
    });

    const expense4 = createTestExpense({
      id: 'exp-4',
      paidAt: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000), // 1 jour après
    });

    await repo.save(expense1);
    await repo.save(expense2);
    await repo.save(expense3);
    await repo.save(expense4);

    const from = baseDate;
    const to = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);

    const results = await repo.findInDateRange('group-1', from, to);

    expect(results).toHaveLength(3); // exp-2, exp-3, exp-4
    expect(results.map(e => e.id)).toEqual(['exp-4', 'exp-3', 'exp-2']); // Ordre DESC
  });

  it('rejette un doublon avec la contrainte UNIQUE', async () => {
    await setupTestGroup();
    const expense1 = createTestExpense();

    await repo.save(expense1);

    // Même expense (viole UNIQUE(group_id, paid_at, amount, paid_by))
    const expense2 = createTestExpense();

    await expect(repo.save(expense2)).rejects.toThrow();
  });

  it('transaction qui échoue rollback proprement', async () => {
    await setupTestGroup();

    const expense1 = createTestExpense({ id: 'exp-1' });
    const expense2 = createTestExpense({ id: 'exp-2' }); // Doublon qui va échouer

    // Utiliser une connexion dédiée pour la transaction
    const client = await pool.connect();
    const transactionalRepo = new PgExpenseRepository(pool, client);

    try {
      await client.query('BEGIN');

      // Sauvegarder expense1 (OK)
      await transactionalRepo.save(expense1);

      // Tenter de sauvegarder expense2 (va échouer à cause du UNIQUE)
      await expect(transactionalRepo.save(expense2)).rejects.toThrow();

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Vérifier qu'aucune expense n'a été sauvegardée (rollback complet)
    const found1 = await repo.findById('exp-1');
    const found2 = await repo.findById('exp-2');

    expect(found1).toBeNull();
    expect(found2).toBeNull();
  });
});