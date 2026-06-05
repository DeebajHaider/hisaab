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
  onConfirm: () => void;
  isPending?: boolean;
  // Uncontrolled: pass a trigger. Controlled: pass open + onOpenChange (e.g. when
  // opened from a dropdown menu item).
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

export function ArchiveConfirmDialog({
  name,
  kind,
  onConfirm,
  isPending,
  trigger,
  open,
  onOpenChange,
}: ArchiveConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
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
