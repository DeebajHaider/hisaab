// Profit for a value-tracked holding: what it's worth now minus what you put in.
// Paisa-based integer math to avoid floating-point drift, matching the
// budget-side calculations.
export interface HoldingProfit {
  amount: number; // current - original, in the holding's currency
  percent: number; // relative to original investment; 0 when original is 0
}

export function calculateHoldingProfit(
  originalInvestment: number,
  currentValue: number,
): HoldingProfit {
  const originalPaisa = Math.round(originalInvestment * 100);
  const currentPaisa = Math.round(currentValue * 100);
  const amountPaisa = currentPaisa - originalPaisa;

  return {
    amount: amountPaisa / 100,
    percent: originalPaisa === 0 ? 0 : (amountPaisa / originalPaisa) * 100,
  };
}