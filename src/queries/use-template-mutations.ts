import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";
import { toast } from "sonner";

interface CreateTemplateInput {
  budgetId: string;
  categoryId: string;
  itemId: string;
  label?: string | null;
  amount: number;
  rate?: number | null;
  qty?: number | null;
  personId?: string | null;
  notes?: string | null;
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { count, error: countError } = await supabase
        .from("transaction_templates")
        .select("id", { count: "exact", head: true })
        .eq("budget_id", input.budgetId);

      if (countError) throw countError;

      const { error } = await supabase.from("transaction_templates").insert({
        budget_id: input.budgetId,
        category_id: input.categoryId,
        item_id: input.itemId,
        label: input.label ?? null,
        amount: input.amount,
        rate: input.rate ?? null,
        qty: input.qty ?? null,
        person_id: input.personId ?? null,
        notes: input.notes ?? null,
        sort_order: count ?? 0,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Template created.");
      queryClient.invalidateQueries({ queryKey: ["templates", variables.budgetId] });
    },
    onError: (error) => {
      toast.error("Couldn't create template.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface UpdateTemplateInput {
  id: string;
  budgetId: string;
  patch: {
    categoryId?: string;
    itemId?: string;
    label?: string | null;
    amount?: number;
    rate?: number | null;
    qty?: number | null;
    personId?: string | null;
    notes?: string | null;
  };
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      const dbPatch: Database["public"]["Tables"]["transaction_templates"]["Update"] = {};
      if (input.patch.categoryId !== undefined) dbPatch.category_id = input.patch.categoryId;
      if (input.patch.itemId !== undefined) dbPatch.item_id = input.patch.itemId;
      if (input.patch.label !== undefined) dbPatch.label = input.patch.label;
      if (input.patch.amount !== undefined) dbPatch.amount = input.patch.amount;
      if (input.patch.rate !== undefined) dbPatch.rate = input.patch.rate;
      if (input.patch.qty !== undefined) dbPatch.qty = input.patch.qty;
      if (input.patch.personId !== undefined) dbPatch.person_id = input.patch.personId;
      if (input.patch.notes !== undefined) dbPatch.notes = input.patch.notes;

      const { error } = await supabase
        .from("transaction_templates")
        .update(dbPatch)
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Template updated.");
      queryClient.invalidateQueries({ queryKey: ["templates", variables.budgetId] });
    },
    onError: (error) => {
      toast.error("Couldn't update template.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface ArchiveTemplateInput {
  id: string;
  budgetId: string;
  archived?: boolean;
}

export function useArchiveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ArchiveTemplateInput) => {
      const { error } = await supabase
        .from("transaction_templates")
        .update({ is_archived: input.archived ?? true })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.archived === false ? "Template restored." : "Template archived.",
      );
      queryClient.invalidateQueries({ queryKey: ["templates", variables.budgetId] });
    },
    onError: (error) => {
      toast.error("Couldn't update template.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface DeleteTemplateInput {
  id: string;
  budgetId: string;
}

/**
 * Hard-delete a template. Safe without a confirmation-with-transaction-count
 * dialog (unlike categories/items) — templates are just presets; deleting
 * one never touches transactions already created from it.
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteTemplateInput) => {
      const { error } = await supabase.from("transaction_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Template deleted.");
      queryClient.invalidateQueries({ queryKey: ["templates", variables.budgetId] });
    },
    onError: (error) => {
      toast.error("Couldn't delete template.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}
