import { useState } from "react";
import {
  MoreVertical,
  RefreshCw,
  ArrowLeftRight,
  Pencil,
  Archive,
  ArchiveRestore,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoldingFormDialog } from "@/components/portfolio/holding-form-dialog";
import { UpdateValueDialog } from "@/components/portfolio/update-value-dialog";
import { AdjustInvestmentDialog } from "@/components/portfolio/adjust-investment-dialog";
import { HoldingHistoryChart } from "@/components/portfolio/holding-history-chart";
import { ArchiveConfirmDialog } from "@/components/manage/archive-confirm-dialog";
import { useSetHoldingArchived } from "@/queries/use-holding-mutations";
import { calculateHoldingProfit } from "@/lib/calculations/holding-profit";
import { formatMoney } from "@/lib/format/money";
import type { AssetClass } from "@/queries/use-asset-classes";
import type { Holding } from "@/queries/use-holdings";
import type { HoldingGroup } from "@/lib/format/group-holdings";

interface HoldingGroupSectionProps {
  portfolioId: string;
  assetClasses: AssetClass[];
  group: HoldingGroup;
}

export function HoldingGroupSection({
  portfolioId,
  assetClasses,
  group,
}: HoldingGroupSectionProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground mb-2">
        {group.assetClass.name}
        {group.assetClass.is_archived && " (archived)"}
      </h2>
      <div className="space-y-2">
        {group.holdings.map((h) => (
          <HoldingRow
            key={h.id}
            portfolioId={portfolioId}
            assetClasses={assetClasses}
            holding={h}
          />
        ))}
      </div>
    </div>
  );
}

type RowAction = null | "value" | "adjust" | "edit" | "archive";

function HoldingRow({
  portfolioId,
  assetClasses,
  holding,
}: {
  portfolioId: string;
  assetClasses: AssetClass[];
  holding: Holding;
}) {
  const setArchived = useSetHoldingArchived();
  const [action, setAction] = useState<RowAction>(null);
  const [expanded, setExpanded] = useState(false);
  const close = () => setAction(null);

  const archived = holding.is_archived;
  const profit = calculateHoldingProfit(
    holding.original_investment,
    holding.current_value,
  );
  const gain = profit.amount >= 0;
  const sign = gain ? "+" : "−";

  return (
    <div className="rounded-lg glass">
      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium truncate ${
                archived ? "text-muted-foreground line-through" : ""
              }`}
            >
              {holding.name}
            </span>
            {holding.ticker && (
              <span className="text-xs text-muted-foreground">{holding.ticker}</span>
            )}
            {archived && (
              <Badge variant="secondary" className="text-xs font-normal">
                Archived
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Invested {formatMoney(holding.original_investment, holding.currency)}
          </div>
        </div>

        <div className="ml-auto shrink-0 text-right tabular-nums">
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

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            <span className="sr-only">
              {expanded ? "Hide" : "Show"} value history for {holding.name}
            </span>
          </Button>

          {archived ? (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              disabled={setArchived.isPending}
              onClick={() =>
                setArchived.mutate({
                  id: holding.id,
                  portfolioId,
                  isArchived: false,
                })
              }
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              <span className="sr-only">Restore {holding.name}</span>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreVertical className="w-4 h-4" />
                  <span className="sr-only">Actions for {holding.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setAction("value")}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update value
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAction("adjust")}>
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Add or withdraw
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAction("edit")}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => setAction("archive")}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Inline value-history chart — mounted only when expanded so the
          ResponsiveContainer measures a real width and we never query per row. */}
      {expanded && (
        <div className="border-t border-border/60 px-3 py-3">
          <HoldingHistoryChart holdingId={holding.id} currency={holding.currency} />
        </div>
      )}

      {/* Controlled dialogs, driven by the row menu */}
      <UpdateValueDialog
        holding={holding}
        open={action === "value"}
        onOpenChange={(o) => !o && close()}
      />
      <AdjustInvestmentDialog
        holding={holding}
        open={action === "adjust"}
        onOpenChange={(o) => !o && close()}
      />
      <HoldingFormDialog
        portfolioId={portfolioId}
        assetClasses={assetClasses}
        existing={holding}
        open={action === "edit"}
        onOpenChange={(o) => !o && close()}
      />
      <ArchiveConfirmDialog
        name={holding.name}
        kind="holding"
        isPending={setArchived.isPending}
        open={action === "archive"}
        onOpenChange={(o) => !o && close()}
        onConfirm={() => {
          setArchived.mutate({ id: holding.id, portfolioId, isArchived: true });
          close();
        }}
      />
    </div>
  );
}
