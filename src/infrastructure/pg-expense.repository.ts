// src/infrastructure/pg-expense.repository.ts
//
// EXERCICE 4 — Implémentation Postgres du ExpenseRepository
//
// Testé avec Testcontainers (voir tests/integration/)

import type { Pool } from 'pg';
import type { Expense, ExpenseSplit } from '../domain/types';
import type { ExpenseRepository } from '../ports/expense.repository';

// Helper pour convertir ExpenseSplit vers JSONB
function expenseSplitToJson(split: ExpenseSplit): any {
  switch (split.mode) {
    case 'equal':
      return { mode: 'equal', beneficiaries: split.beneficiaries };
    case 'weighted':
      return { mode: 'weighted', weights: split.weights };
    case 'percentage':
      return { mode: 'percentage', percentages: split.percentages };
  }
}

// Helper pour convertir JSONB vers ExpenseSplit
function jsonToExpenseSplit(data: any): ExpenseSplit {
  switch (data.mode) {
    case 'equal':
      return { mode: 'equal', beneficiaries: data.beneficiaries };
    case 'weighted':
      return { mode: 'weighted', weights: data.weights };
    case 'percentage':
      return { mode: 'percentage', percentages: data.percentages };
    default:
      throw new Error(`Unknown split mode: ${data.mode}`);
  }
}

export class PgExpenseRepository implements ExpenseRepository {
  constructor(private readonly pool: Pool, private readonly client?: any) {}

  private getConnection() {
    return this.client || this.pool;
  }

  async save(expense: Expense): Promise<void> {
    const query = `
      INSERT INTO expenses (
        id, group_id, description, amount, currency, paid_by, paid_at,
        split_mode, split_data, category, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      expense.id,
      expense.groupId,
      expense.description,
      expense.amount,
      expense.currency,
      expense.paidBy,
      expense.paidAt,
      expense.split.mode,
      JSON.stringify(expenseSplitToJson(expense.split)),
      expense.category || null,
      expense.createdAt,
    ];

    await this.getConnection().query(query, values);
  }

  async findById(id: string): Promise<Expense | null> {
    const query = 'SELECT * FROM expenses WHERE id = $1';
    const result = await this.getConnection().query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paidBy: row.paid_by,
      paidAt: row.paid_at,
      split: jsonToExpenseSplit(row.split_data),
      category: row.category,
      createdAt: row.created_at,
    };
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    const query = 'SELECT * FROM expenses WHERE group_id = $1 ORDER BY paid_at DESC';
    const result = await this.getConnection().query(query, [groupId]);

    return result.rows.map(row => ({
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paidBy: row.paid_by,
      paidAt: row.paid_at,
      split: jsonToExpenseSplit(row.split_data),
      category: row.category,
      createdAt: row.created_at,
    }));
  }

  async findInDateRange(groupId: string, from: Date, to: Date): Promise<Expense[]> {
    const query = `
      SELECT * FROM expenses
      WHERE group_id = $1 AND paid_at >= $2 AND paid_at <= $3
      ORDER BY paid_at DESC
    `;
    const result = await this.getConnection().query(query, [groupId, from, to]);

    return result.rows.map(row => ({
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paidBy: row.paid_by,
      paidAt: row.paid_at,
      split: jsonToExpenseSplit(row.split_data),
      category: row.category,
      createdAt: row.created_at,
    }));
  }
}
