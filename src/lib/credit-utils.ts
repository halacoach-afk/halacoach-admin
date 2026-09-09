import type {
  CreditLedgerEntry,
  CreditPurchase,
  CreditsOverview,
  Professional,
  PromoCode,
} from '@/api/types';
import type {CreditPackage} from '@/api/types';

/** Matches web/app hardcoded checkout VAT. */
export const VAT_RATE = 0.05;

export function buildCreditLedger(
  professionals: Professional[],
  purchases: CreditPurchase[],
): CreditLedgerEntry[] {
  const purchaseByTxn = new Map(purchases.map(item => [item.txnId, item]));
  const entries: CreditLedgerEntry[] = [];

  for (const pro of professionals) {
    for (const txn of pro.txns) {
      const purchase = purchaseByTxn.get(txn.id);
      entries.push({
        id: txn.id,
        professionalId: pro.id,
        professionalName: pro.name,
        type: txn.type,
        credits: txn.credits,
        label: txn.label,
        at: txn.at,
        orderId: purchase?.orderId,
        totalAed: purchase?.totalAed,
      });
    }
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function buildCreditsOverview(input: {
  packs: CreditPackage[];
  promos: PromoCode[];
  professionals: Professional[];
  purchases: CreditPurchase[];
  vatRate?: number;
}): CreditsOverview {
  const transactions = buildCreditLedger(input.professionals, input.purchases);
  return {
    vatRate: input.vatRate ?? VAT_RATE,
    packs: [...input.packs].sort((a, b) => a.sortOrder - b.sortOrder),
    promos: input.promos,
    transactions,
    stats: {
      totalCreditsInWallets: input.professionals.reduce((sum, pro) => sum + pro.credits, 0),
      purchaseCount: transactions.filter(item => item.type === 'purchase').length,
      spendCount: transactions.filter(item => item.type === 'spend').length,
    },
  };
}

export function formatAed(amount: number) {
  return `AED ${amount.toLocaleString('en-AE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

export function formatDiscount(rate: number) {
  return `${Math.round(rate * 100)}% off`;
}

export function formatPromoBenefit(promo: Pick<PromoCode, 'benefitType' | 'benefitValue'>) {
  switch (promo.benefitType) {
    case 'percent_off':
      return formatDiscount(promo.benefitValue);
    case 'fixed_off':
      return `${formatAed(promo.benefitValue)} off`;
    case 'bonus_credits':
      return `+${promo.benefitValue} credits`;
    default:
      return '—';
  }
}
