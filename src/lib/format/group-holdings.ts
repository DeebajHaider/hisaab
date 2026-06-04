import type { AssetClass } from "@/queries/use-asset-classes";
import type { Holding } from "@/queries/use-holdings";

export interface HoldingGroup {
  assetClass: AssetClass;
  holdings: Holding[];
}

/**
 * Group holdings under their asset class, preserving the order of the asset
 * classes passed in (the query already sorts them) and sorting holdings by name
 * within each group. Empty groups are kept so callers can decide whether to show
 * them.
 *
 * IMPORTANT: pass ALL asset classes that the holdings might reference, including
 * archived ones — a holding tagged to an archived class would otherwise be
 * silently dropped. The holdings view fetches asset classes with
 * includeArchived=true precisely for this reason.
 */
export function groupHoldingsByAssetClass(
  assetClasses: AssetClass[],
  holdings: Holding[],
): HoldingGroup[] {
  const byClass = new Map<string, Holding[]>();
  for (const ac of assetClasses) byClass.set(ac.id, []);
  for (const h of holdings) byClass.get(h.asset_class_id)?.push(h);

  return assetClasses.map((ac) => ({
    assetClass: ac,
    holdings: (byClass.get(ac.id) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}