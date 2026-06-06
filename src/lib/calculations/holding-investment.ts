// Capital changes for a value-tracked holding, in paisa-safe integer math.
//
// Add: you put money in, so invested and current value both rise by the amount.
// Withdraw: you took money out at today's value, so current value falls by the
// amount and invested falls *proportionally* (you sold a slice of the position).
// That keeps the holding's gain percentage unchanged — choice (a), no separate
// "realised gain" figure.
export interface HoldingMoney {
  invested: number;
  currentValue: number;
}

export function applyAddInvestment(
  investedOld: number,
  currentOld: number,
  amount: number,
): HoldingMoney {
  const amountP = Math.round(amount * 100);
  return {
    invested: (Math.round(investedOld * 100) + amountP) / 100,
    currentValue: (Math.round(currentOld * 100) + amountP) / 100,
  };
}

export function applyWithdrawal(
  investedOld: number,
  currentOld: number,
  amount: number,
): HoldingMoney {
  const investedOldP = Math.round(investedOld * 100);
  const currentOldP = Math.round(currentOld * 100);

  // Nothing to withdraw from — treat as fully closed.
  if (currentOldP <= 0) return { invested: 0, currentValue: 0 };

  // Withdrawing the whole value (or more) closes the position out.
  const takeP = Math.min(Math.round(amount * 100), currentOldP);
  const currentNewP = currentOldP - takeP;
  const investedNewP = Math.round((investedOldP * currentNewP) / currentOldP);

  return { invested: investedNewP / 100, currentValue: currentNewP / 100 };
}
