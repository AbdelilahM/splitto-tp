// src/domain/balances.ts — calcul des soldes d'un groupe
//
// EXERCICE 1 — À COMPLÉTER
//
// Spec : voir SUJET.md, exercice 1
//
// Cette fonction est PURE : pas d'effets de bord, pas d'I/O.
// Elle prend un groupe et ses dépenses, retourne les soldes.

import type { Group, Expense, Balances } from './types';

export function computeBalances(group: Group, expenses: Expense[]): Balances {
  const balances: Balances = {};

  // Initialiser tous les soldes à 0
  for (const member of group.members) {
    balances[member.id] = 0;
  }

  for (const expense of expenses) {
    const { amount, paidBy, split } = expense;

    // Le payeur reçoit le montant total
    if (balances[paidBy] !== undefined) {
      balances[paidBy] += amount;
    }

    // Calculer et soustraire la quote-part aux bénéficiaires
    let beneficiaries: string[] = [];
    let shares: Record<string, number> = {};

    switch (split.mode) {
      case 'equal':
        beneficiaries = split.beneficiaries;
        const equalShare = amount / beneficiaries.length;
        for (const beneficiary of beneficiaries) {
          shares[beneficiary] = equalShare;
        }
        break;

      case 'weighted':
        beneficiaries = Object.keys(split.weights);
        const totalWeight = Object.values(split.weights).reduce((sum, w) => sum + w, 0);
        for (const [memberId, weight] of Object.entries(split.weights)) {
          shares[memberId] = (amount * weight) / totalWeight;
        }
        break;

      case 'percentage':
        beneficiaries = Object.keys(split.percentages);
        for (const [memberId, percentage] of Object.entries(split.percentages)) {
          shares[memberId] = (amount * percentage) / 100;
        }
        break;
    }

    // Appliquer les déductions (arrondir à 2 décimales)
    for (const [memberId, share] of Object.entries(shares)) {
      if (balances[memberId] !== undefined) {
        balances[memberId] -= Math.round(share * 100) / 100;
      }
    }
  }

  return balances;
}
