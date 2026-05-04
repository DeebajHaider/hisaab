import { type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ArchiveConfirmDialogProps {
  // What's being archived (e.g., "Groceries" or "Flour")
  name: string;
  // Display variant: "category" or "item" — affects the warning text
  kind: "category" | "item";
  trigger: ReactNode;
  onConfirm: () => void;
  isPending?: boolean;
}

/**
 * Confirmation dialog before archiving a category or item.
 * Uses AlertDialog (more modal/disruptive than Dialog) since this is a
 * destructive-feeling action.
 */
export function ArchiveConfirmDialog({
  name,
  kind,
  trigger,
  onConfirm,
  isPending,
}: ArchiveConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {kind === "category"
              ? "The category will be hidden from the entry form, but past transactions will still show its name. You can unarchive it later."
              : "This item will be hidden when logging new transactions. Past transactions referencing it will still display correctly. You can unarchive it later."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isPending ? "Archiving..." : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}