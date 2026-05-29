import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { peopleKeys } from "./people-keys";
import type { Database } from "@/types/db";
import { toast } from "sonner";


// ---------- Create person ----------

interface CreatePersonVars {
  budgetId: string;
  name: string;
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetId, name }: CreatePersonVars) => {
      // No .select() per the project-wide RLS workaround.
      const { error } = await supabase
        .from("people")
        .insert({ budget_id: budgetId, name });
      if (error) throw error;
    },
    onSuccess: (_data, { budgetId }) => {
      // Invalidate at the byBudget root so both archived and active
      // people lists refetch. Cheaper than figuring out which one is
      // currently mounted.
      qc.invalidateQueries({ queryKey: peopleKeys.byBudget(budgetId) });
    },
    onError: (error, _variables) => {
      // Errors deserve longer than the 4s default — give the user time to read.
      toast.error("Couldn't create person.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

// ---------- Update person ----------

interface UpdatePersonVars {
  id: string;
  budgetId: string;
  patch: { name?: string };
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdatePersonVars) => {
      // Explicit field translation, no spreading — typos on the patch
      // object would otherwise go undetected.
      const dbPatch: Database["public"]["Tables"]["people"]["Update"] = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;

      const { error } = await supabase
        .from("people")
        .update(dbPatch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { budgetId }) => {
      qc.invalidateQueries({ queryKey: peopleKeys.byBudget(budgetId) });
    },
    onError: (error, _variables) => {
      // Errors deserve longer than the 4s default — give the user time to read.
      toast.error("Couldn't update person.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

// ---------- Archive / unarchive person ----------
// Soft-delete pattern matching categories and items. We never hard-delete
// because transactions attribute to people by id; archived people still
// resolve correctly in historical transaction lists.

interface ArchivePersonVars {
  id: string;
  budgetId: string;
  archived: boolean;
}

export function useArchivePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: ArchivePersonVars) => {
      const { error } = await supabase
        .from("people")
        .update({ is_archived: archived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { budgetId }) => {
      toast.success("Person archived.");
      qc.invalidateQueries({ queryKey: peopleKeys.byBudget(budgetId) });
    },
    onError: (error, _variables) => {
      // Errors deserve longer than the 4s default — give the user time to read.
      toast.error("Couldn't archive person.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

