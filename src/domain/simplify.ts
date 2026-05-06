// src/domain/simplify.ts — simplification des dettes
//
// EXERCICE 2 — À COMPLÉTER EN TDD STRICT
//
// Spec : voir SUJET.md, exercice 2
//
// Le but : transformer un dictionnaire de soldes en LISTE MINIMALE
// de règlements pour solder le groupe.

import type { Balances, Settlement } from './types';

function getCreditors(balances: Balances): Array<[string, number]> {
  return Object.entries(balances)
    .filter(([, balance]) => balance > 0)
    .sort(([, a], [, b]) => b - a);
}

function getDebtors(balances: Balances): Array<[string, number]> {
  return Object.entries(balances)
    .filter(([, balance]) => balance < 0)
    .sort(([, a], [, b]) => a - b);
}

export function simplifyDebts(balances: Balances): Settlement[] {
  const settlements: Settlement[] = [];
  const creditors = getCreditors(balances);
  const debtors = getDebtors(balances);

  // Pour chaque débiteur, payer les créditeurs
  for (const [debtorId, debtorBalance] of debtors) {
    let remaining = -debtorBalance; // Montant à payer (positif)

    for (const [creditorId, creditorBalance] of creditors) {
      if (remaining <= 0) break;
      if (creditorBalance <= 0) continue;

      const amount = Math.min(remaining, creditorBalance);
      settlements.push({ from: debtorId, to: creditorId, amount });
      remaining -= amount;
    }
  }

  return settlements;
}
