// tests/unit/simplify.test.ts — Tests TDD pour simplifyDebts
//
// EXERCICE 2 — TDD STRICT
//
// Cycles RED → GREEN → REFACTOR documentés dans git log

import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../../src/domain/simplify';
import type { Balances } from '../../src/domain/types';

describe('simplifyDebts', () => {
  it('2 personnes - débiteur paie créditeur', () => {
    const balances: Balances = { a: 10, b: -10 };
    const result = simplifyDebts(balances);
    expect(result).toEqual([{ from: 'b', to: 'a', amount: 10 }]);
  });

  it('3 personnes en triangle - un règlement suffit', () => {
    const balances: Balances = { a: 10, b: 0, c: -10 };
    const result = simplifyDebts(balances);
    expect(result).toEqual([{ from: 'c', to: 'a', amount: 10 }]);
  });

  it('4 personnes circulaire complexe - 2 règlements minimum', () => {
    const balances: Balances = { a: 30, b: -20, c: -10, d: 0 };
    const result = simplifyDebts(balances);
    expect(result).toEqual([
      { from: 'b', to: 'a', amount: 20 },
      { from: 'c', to: 'a', amount: 10 }
    ]);
  });

  it('balances vides - aucun règlement', () => {
    const balances: Balances = {};
    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it('balances équilibrées - aucun règlement', () => {
    const balances: Balances = { a: 0, b: 0, c: 0 };
    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it('un seul créditeur avec plusieurs débiteurs', () => {
    const balances: Balances = { a: 30, b: -10, c: -10, d: -10 };
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ from: 'b', to: 'a', amount: 10 });
    expect(result).toContainEqual({ from: 'c', to: 'a', amount: 10 });
    expect(result).toContainEqual({ from: 'd', to: 'a', amount: 10 });
  });

  it('un débiteur avec plusieurs créditeurs - ordonnés par montant décroissant', () => {
    const balances: Balances = { a: 50, b: 30, c: 20, d: -100 };
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ from: 'd', to: 'a', amount: 50 });
    expect(result[1]).toEqual({ from: 'd', to: 'b', amount: 30 });
    expect(result[2]).toEqual({ from: 'd', to: 'c', amount: 20 });
  });

  it('multiple créditeurs et débiteurs - ordre de priorité', () => {
    const balances: Balances = { a: 100, b: 50, c: -80, d: -70 };
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ from: 'c', to: 'a', amount: 80 });
    expect(result[1]).toEqual({ from: 'd', to: 'a', amount: 70 });
  });

  it('débiteur exactement égal à un créditeur', () => {
    const balances: Balances = { a: 25, b: 25, c: -50 };
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ from: 'c', to: 'a', amount: 25 });
    expect(result).toContainEqual({ from: 'c', to: 'b', amount: 25 });
  });

  it('soldes fractionnés - paiement partiel', () => {
    const balances: Balances = { a: 100, b: -30, c: -70 };
    const result = simplifyDebts(balances);
    expect(result).toEqual([
      { from: 'c', to: 'a', amount: 70 },
      { from: 'b', to: 'a', amount: 30 }
    ]);
  });

  it('tous les soldes positifs - aucun règlement', () => {
    const balances: Balances = { a: 10, b: 20, c: 30 };
    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it('tous les soldes négatifs - aucun règlement', () => {
    const balances: Balances = { a: -10, b: -20, c: -30 };
    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it('soldes de zéro sont ignorés comme créditeurs', () => {
    const balances: Balances = { a: 20, b: 0, c: -20 };
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result).toContainEqual({ from: 'c', to: 'a', amount: 20 });
  });

  it('montants décimaux conservent la précision', () => {
    const balances: Balances = { a: 33.33, b: 33.34, c: -66.67 };
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ from: 'c', to: 'a', amount: 33.33 });
    expect(result).toContainEqual({ from: 'c', to: 'b', amount: 33.34 });
  });

  it('soldes avec signes opposés extrêmes', () => {
    const balances: Balances = { a: 10000, b: -5000, c: -5000 };
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ from: 'b', to: 'a', amount: 5000 });
    expect(result).toContainEqual({ from: 'c', to: 'a', amount: 5000 });
  });

  it('un créditeur absorbant plusieurs débiteurs partiels', () => {
    const balances: Balances = { a: 100, b: -30, c: -40, d: -30 };
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(3);
    const sortedByDebtor = result.sort((x, y) => x.from.localeCompare(y.from));
    expect(sortedByDebtor).toEqual([
      { from: 'b', to: 'a', amount: 30 },
      { from: 'c', to: 'a', amount: 40 },
      { from: 'd', to: 'a', amount: 30 }
    ]);
  });
});