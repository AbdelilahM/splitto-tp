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
});