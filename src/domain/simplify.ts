// src/domain/simplify.ts — simplification des dettes
//
// EXERCICE 2 — À COMPLÉTER EN TDD STRICT
//
// Spec : voir SUJET.md, exercice 2
//
// Le but : transformer un dictionnaire de soldes en LISTE MINIMALE
// de règlements pour solder le groupe.

import type { Balances, Settlement } from './types';

export function simplifyDebts(balances: Balances): Settlement[] {
  const entries = Object.entries(balances);
  if (entries.length === 2) {
    const [creditor] = entries.filter(([, balance]) => balance > 0);
    const [debtor] = entries.filter(([, balance]) => balance < 0);
    if (creditor && debtor) {
      return [{ from: debtor[0], to: creditor[0], amount: creditor[1] }];
    }
  }
  return [];
}
