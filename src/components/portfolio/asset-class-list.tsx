import { Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssetClassFormDialog } from "@/components/portfolio/asset-class-form-dialog";
import { ArchiveConfirmDialog } from "@/components/manage/archive-confirm-dialog";
import { useSetAssetClassArchived } from "@/queries/use-asset-class-mutations";
import type { AssetClass } from "@/queries/use-asset-classes";

interface AssetClassListProps {
  portfolioId: string;
  assetClasses: AssetClass[];
}

export function AssetClassList({ portfolioId, assetClasses }: AssetClassListProps) {
  return (
    <div className="space-y-2">
      {assetClasses.map((ac) => (
        <AssetClassRow key={ac.id} portfolioId={portfolioId} assetClass={ac} />
      ))}
    </div>
  );
}

function AssetClassRow({
  portfolioId,
  assetClass,
}: {
  portfolioId: string;
  assetClass: AssetClass;
}) {
  const setArchived = useSetAssetClassArchived();
  const archived = assetClass.is_archived;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <span
        className={`font-medium truncate ${
          archived ? "text-muted-foreground line-through" : ""
        }`}
      >
        {assetClass.name}
      </span>
      {archived && (
        <Badge variant="secondary" className="text-xs font-normal">
          Archived
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-1">
        {archived ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            disabled={setArchived.isPending}
            onClick={() =>
              setArchived.mutate({
                id: assetClass.id,
                portfolioId,
                isArchived: false,
              })
            }
          >
            <ArchiveRestore className="w-3.5 h-3.5" />
            <span className="sr-only">Restore {assetClass.name}</span>
          </Button>
        ) : (
          <>
            <AssetClassFormDialog
              portfolioId={portfolioId}
              existing={assetClass}
              trigger={
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="sr-only">Edit {assetClass.name}</span>
                </Button>
              }
            />
            <ArchiveConfirmDialog
              name={assetClass.name}
              kind="asset class"
              isPending={setArchived.isPending}
              onConfirm={() =>
                setArchived.mutate({
                  id: assetClass.id,
                  portfolioId,
                  isArchived: true,
                })
              }
              trigger={
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Archive className="w-3.5 h-3.5" />
                  <span className="sr-only">Archive {assetClass.name}</span>
                </Button>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
