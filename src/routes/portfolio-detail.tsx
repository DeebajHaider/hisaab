import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolio } from "@/queries/use-portfolio";
import { useAssetClasses } from "@/queries/use-asset-classes";
import { AssetClassFormDialog } from "@/components/portfolio/asset-class-form-dialog";
import { AssetClassList } from "@/components/portfolio/asset-class-list";

export function PortfolioDetail() {
  const { portfolioId } = useParams();
  const { data: portfolio, isLoading } = usePortfolio(portfolioId);
  const [showArchived, setShowArchived] = useState(false);
  const acQuery = useAssetClasses(portfolioId, showArchived);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-muted-foreground mb-2">Portfolio not found.</p>
        <Link to="/app/portfolio" className="text-teal-600 hover:underline">
          Back to portfolios
        </Link>
      </div>
    );
  }

  const assetClasses = acQuery.data ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/app/portfolio"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        All portfolios
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{portfolio.name}</h1>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Asset classes</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Groups for your holdings. Archive the ones you don't use.
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
            <AssetClassFormDialog
              portfolioId={portfolio.id}
              trigger={
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New asset class
                </Button>
              }
            />
          </div>
        </div>

        {acQuery.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : assetClasses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No asset classes</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Add one to start grouping holdings.
            </p>
            <AssetClassFormDialog
              portfolioId={portfolio.id}
              trigger={
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add asset class
                </Button>
              }
            />
          </div>
        ) : (
          <AssetClassList portfolioId={portfolio.id} assetClasses={assetClasses} />
        )}
      </section>
    </div>
  );
}
