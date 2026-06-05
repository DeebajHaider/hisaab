// Display formatter for holding amounts. PKR shows as "Rs"; every other currency
// shows its code, so mixed-currency lists never imply a hidden conversion.
export function formatMoney(value: number, currency: string): string {
  const num = value.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currency === "PKR" ? "Rs" : currency} ${num}`;
}
