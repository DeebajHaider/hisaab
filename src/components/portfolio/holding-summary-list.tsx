import { calculateHoldingProfit } from "@/lib/calculations/holding-profit";
import { formatMoney } from "@/lib/format/money";
import type { HoldingGroup } from "@/lib/format/group-holdings";
import type { Holding } from "@/queries/use-holdings";

// Read-only version of the holdings rows (option b) — same look as the Holdings
// page, minus the action menu.
export function HoldingSummaryList({ groups }: { groups: HoldingGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.assetClass.id}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {group.assetClass.name}
          </h3>
          <div className="space-y-2">
            {group.holdings.map((h) => (
              <SummaryRow key={h.id} holding={h} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function SummaryRow({ holding }: { holding: Holding }) {
  const profit = calculateHoldingProfit(
    holding.original_investment,
    holding.current_value,
  );
  const gain = profit.amount >= 0;
  const sign = gain ? "+" : "−";

  return (
    <div className="flex items-center gap-3 rounded-lg glass px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{holding.name}</span>
          {holding.ticker && (
            <span className="text-xs text-muted-foreground">{holding.ticker}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Invested {formatMoney(holding.original_investment, holding.currency)}
        </div>
      </div>
      <div className="ml-auto text-right tabular-nums">
        <div className="font-medium">
          {formatMoney(holding.current_value, holding.currency)}
        </div>
        <div
          className={`text-xs ${
            gain
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {sign}
          {formatMoney(Math.abs(profit.amount), holding.currency)} ({sign}
          {Math.abs(profit.percent).toFixed(2)}%)
        </div>
      </div>
    </div>
  );
}
