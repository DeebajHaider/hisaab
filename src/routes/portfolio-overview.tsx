import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useHoldings } from "@/queries/use-holdings";
import { useAssetClasses } from "@/queries/use-asset-classes";
import { usePortfolio } from "@/queries/use-portfolio";
import { useUpdatePortfolioFxRates } from "@/queries/use-portfolio-mutations";
import {
  summarizeByCurrency,
  blendedTotals,
  allocationByAssetClass,
  type CurrencyTotal,
  type BlendedTotals,
} from "@/lib/calculations/portfolio-summary";
import { groupHoldingsByAssetClass } from "@/lib/format/group-holdings";
import { assignCategoryColors } from "@/lib/calculations/assign-category-colors";
import { formatMoney } from "@/lib/format/money";
import {
  AllocationDonut,
  type AllocationSlice,
} from "@/components/portfolio/allocation-donut";
import { HoldingSummaryList } from "@/components/portfolio/holding-summary-list";
import { PortfolioProgressionChart } from "@/components/portfolio/portfolio-progression-chart";
import { ErrorBanner } from "@/components/ui/error-banner";

const BASE = "PKR";

export function PortfolioOverview() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const holdingsQuery = useHoldings(portfolioId, false);
  const acQuery = useAssetClasses(portfolioId, true);
  const portfolioQuery = usePortfolio(portfolioId);
  const updateFxRates = useUpdatePortfolioFxRates();
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});

  // Seed from the portfolio's stored fx_rates once, when it first loads —
  // not on every render of portfolioQuery.data, which would re-fire on any
  // background refetch and clobber whatever the user is actively typing
  // (same class of bug fixed in the edit dialogs earlier).
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !portfolioQuery.data) return;
    const stored = (portfolioQuery.data.fx_rates as Record<string, number>) ?? {};
    if (Object.keys(stored).length > 0) {
      const asStrings: Record<string, string> = {};
      for (const [cur, rate] of Object.entries(stored)) asStrings[cur] = String(rate);
      setRateInputs(asStrings);
    }
    seededRef.current = true;
  }, [portfolioQuery.data]);

  const persistRates = (next: Record<string, string>) => {
    if (!portfolioId) return;
    const numeric: Record<string, number> = {};
    for (const [cur, raw] of Object.entries(next)) {
      const n = Number(raw);
      if (raw.trim() !== "" && !Number.isNaN(n) && n > 0) numeric[cur] = n;
    }
    updateFxRates.mutate({ id: portfolioId, fxRates: numeric });
  };

  if (!portfolioId) return null;

  const holdings = holdingsQuery.data ?? [];
  const assetClasses = acQuery.data ?? [];
  const isLoading = holdingsQuery.isLoading || acQuery.isLoading;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const queryError = holdingsQuery.error ?? acQuery.error;
  if (queryError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <ErrorBanner context="portfolio data" error={queryError} />
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="font-medium mb-1">Nothing to summarise yet</h3>
          <p className="text-sm text-muted-foreground">
            Add holdings on the Holdings page and they'll roll up here.
          </p>
        </div>
      </div>
    );
  }

  // Per-currency subtotals — always honest, no conversion.
  const currencyTotals = summarizeByCurrency(holdings);
  const foreignCurrencies = currencyTotals
    .map((t) => t.currency)
    .filter((c) => c !== BASE);

  // Parse rate inputs into a numeric map (valid positive numbers only).
  const rates: Record<string, number> = {};
  for (const [cur, raw] of Object.entries(rateInputs)) {
    const n = Number(raw);
    if (raw.trim() !== "" && !Number.isNaN(n) && n > 0) rates[cur] = n;
  }

  const blended = blendedTotals(holdings, rates, BASE);
  const holdingCurrencies = Object.fromEntries(holdings.map((h) => [h.id, h.currency]));

  // Allocation, mapped from asset-class id to name + stable colors.
  const nameById = new Map(assetClasses.map((ac) => [ac.id, ac.name]));
  const slices: AllocationSlice[] = allocationByAssetClass(holdings, rates, BASE).map(
    (a) => ({
      name: nameById.get(a.assetClassId) ?? "Unknown",
      value: a.value,
      percent: a.percent,
    }),
  );
  const colors = assignCategoryColors(slices.map((s) => s.name));

  const groups = groupHoldingsByAssetClass(assetClasses, holdings).filter(
    (g) => g.holdings.length > 0,
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Where your money sits and how it's doing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currencyTotals.map((t) => (
          <CurrencyTotalCard key={t.currency} total={t} />
        ))}
      </div>

      {foreignCurrencies.length > 0 && (
        <BlendPanel
          foreignCurrencies={foreignCurrencies}
          rateInputs={rateInputs}
          setRateInputs={setRateInputs}
          onRateBlur={() => persistRates(rateInputs)}
          blended={blended}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Value over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioProgressionChart
            portfolioId={portfolioId}
            holdingCurrencies={holdingCurrencies}
            rates={rates}
            baseCurrency={BASE}
          />
          {blended.unconvertedCurrencies.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {blended.unconvertedCurrencies.join(", ")} holdings aren't included
              here — set an exchange rate above to fold them in.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Allocation by asset class
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AllocationDonut slices={slices} colors={colors} baseCurrency={BASE} />
          {blended.unconvertedCurrencies.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {blended.unconvertedCurrencies.join(", ")} holdings aren't included
              here — set an exchange rate above to fold them in.
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-medium text-muted-foreground mb-3">
          Holdings
        </h2>
        <div className="space-y-6">
          <HoldingSummaryList groups={groups} />
        </div>
      </div>
    </div>
  );
}

function CurrencyTotalCard({ total }: { total: CurrencyTotal }) {
  const gain = total.profit >= 0;
  const sign = gain ? "+" : "−";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Total · {total.currency}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">
          {formatMoney(total.currentValue, total.currency)}
        </p>
        <div className="mt-2 space-y-0.5 text-sm">
          <p className="text-muted-foreground tabular-nums">
            Invested {formatMoney(total.invested, total.currency)}
          </p>
          <p
            className={`tabular-nums ${
              gain
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {sign}
            {formatMoney(Math.abs(total.profit), total.currency)} ({sign}
            {Math.abs(total.profitPercent).toFixed(2)}%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BlendPanel({
  foreignCurrencies,
  rateInputs,
  setRateInputs,
  onRateBlur,
  blended,
}: {
  foreignCurrencies: string[];
  rateInputs: Record<string, string>;
  setRateInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onRateBlur: () => void;
  blended: BlendedTotals;
}) {
  const complete = blended.unconvertedCurrencies.length === 0;
  const gain = blended.profit >= 0;
  const sign = gain ? "+" : "−";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Combine into PKR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Optional — enter today's rate to fold foreign holdings into one PKR total.
        </p>
        <div className="space-y-2">
          {foreignCurrencies.map((cur) => (
            <div key={cur} className="flex items-center gap-2">
              <Label htmlFor={`rate-${cur}`} className="w-20 shrink-0">
                1 {cur} =
              </Label>
              <Input
                id={`rate-${cur}`}
                type="number"
                min={0}
                step="0.0001"
                placeholder="e.g. 280"
                value={rateInputs[cur] ?? ""}
                onChange={(e) =>
                  setRateInputs((r) => ({ ...r, [cur]: e.target.value }))
                }
                onBlur={onRateBlur}
                className="max-w-[140px]"
              />
              <span className="text-sm text-muted-foreground">PKR</span>
            </div>
          ))}
        </div>
        {complete && (
          <div className="border-t pt-3">
            <p className="text-sm text-muted-foreground">Combined value</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(blended.currentValue, "PKR")}
            </p>
            <p
              className={`text-sm tabular-nums ${
                gain
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {sign}
              {formatMoney(Math.abs(blended.profit), "PKR")} ({sign}
              {Math.abs(blended.profitPercent).toFixed(2)}%)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
