import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHoldings } from "@/queries/use-holdings";
import { useAssetClasses } from "@/queries/use-asset-classes";
import { groupHoldingsByAssetClass } from "@/lib/format/group-holdings";
import { HoldingFormDialog } from "@/components/portfolio/holding-form-dialog";
import { HoldingGroupSection } from "@/components/portfolio/holding-list";

export function PortfolioHoldings() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const [showArchived, setShowArchived] = useState(false);

  const holdingsQuery = useHoldings(portfolioId, showArchived);
  // Include archived asset classes so a holding tagged to one still groups
  // instead of vanishing.
  const acQuery = useAssetClasses(portfolioId, true);

  if (!portfolioId) return null;

  const holdings = holdingsQuery.data ?? [];
  const allAssetClasses = acQuery.data ?? [];
  const activeAssetClasses = allAssetClasses.filter((ac) => !ac.is_archived);
  const groups = groupHoldingsByAssetClass(allAssetClasses, holdings).filter(
    (g) => g.holdings.length > 0,
  );

  const isLoading = holdingsQuery.isLoading || acQuery.isLoading;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between flex-wrap gap-y-2 mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Holdings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            What you own, grouped by asset class.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived((s) => !s)}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
          <HoldingFormDialog
            portfolioId={portfolioId}
            assetClasses={activeAssetClasses}
            trigger={
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                New holding
              </Button>
            }
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Coins className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No holdings yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Add the first thing you own to start tracking it.
          </p>
          <HoldingFormDialog
            portfolioId={portfolioId}
            assetClasses={activeAssetClasses}
            trigger={
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Add holding
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <HoldingGroupSection
              key={group.assetClass.id}
              portfolioId={portfolioId}
              assetClasses={activeAssetClasses}
              group={group}
            />
          ))}
        </div>
      )}
    </div>
  );
}