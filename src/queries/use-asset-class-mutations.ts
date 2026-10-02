import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { assetClassKeys } from "./asset-class-keys";

export function useCreateAssetClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      portfolioId,
      name,
    }: {
      portfolioId: string;
      name: string;
    }) => {
      // created_by defaults to auth.uid(); is_archived defaults to false.
      const { error } = await supabase
        .from("asset_classes")
        .insert({ portfolio_id: portfolioId, name });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success("Asset class created.");
      qc.invalidateQueries({
        queryKey: assetClassKeys.allForPortfolio(vars.portfolioId),
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't add asset class");
    },
  });
}

export function useUpdateAssetClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
    }: {
      id: string;
      portfolioId: string; // carried for invalidation, not sent to the DB
      name: string;
    }) => {
      const { error } = await supabase
        .from("asset_classes")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success("Asset class renamed.");
      qc.invalidateQueries({
        queryKey: assetClassKeys.allForPortfolio(vars.portfolioId),
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't rename asset class");
    },
  });
}

// Single hook for both archive and restore — pass isArchived. Soft-delete only,
// matching categories: archived classes keep their historical holdings.
export function useSetAssetClassArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      isArchived,
    }: {
      id: string;
      portfolioId: string;
      isArchived: boolean;
    }) => {
      const { error } = await supabase
        .from("asset_classes")
        .update({ is_archived: isArchived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.isArchived ? "Asset class archived." : "Asset class restored.");
      qc.invalidateQueries({
        queryKey: assetClassKeys.allForPortfolio(vars.portfolioId),
      });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't update asset class");
    },
  });
}
