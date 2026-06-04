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
  name: string;
  kind: "category" | "item" | "asset class" | "holding";
  trigger: ReactNode;
  onConfirm: () => void;
  isPending?: boolean;
}

const DESCRIPTIONS: Record<ArchiveConfirmDialogProps["kind"], string> = {
  category:
    "The category will be hidden from the entry form, but past transactions will still show its name. You can unarchive it later.",
  item:
    "This item will be hidden when logging new transactions. Past transactions referencing it will still display correctly. You can unarchive it later.",
  "asset class":
    "This asset class will be hidden when adding new holdings. Existing holdings keep their grouping. You can unarchive it later.",
  holding:
    "This holding will be hidden from your active list, but its records and value history are kept. You can unarchive it later.",
};

/**
 * Confirmation dialog before archiving a category, item, asset class, or holding.
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
          <AlertDialogDescription>{DESCRIPTIONS[kind]}</AlertDialogDescription>
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