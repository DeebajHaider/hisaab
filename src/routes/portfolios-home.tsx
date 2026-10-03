import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, AlertCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PortfolioFormDialog } from "@/components/portfolio/portfolio-form-dialog";
import { DeleteConfirmDialog } from "@/components/transactions/delete-confirm-dialog";
import { usePortfolios, type Portfolio } from "@/queries/use-portfolios";
import { useDeletePortfolio } from "@/queries/use-portfolio-mutations";

export function PortfoliosHome() {
  const { data: portfolios, isLoading, error } = usePortfolios();
  const deletePortfolio = useDeletePortfolio();

  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [deleting, setDeleting] = useState<Portfolio | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Your portfolios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track what you own and how it's doing. Private to you.
          </p>
        </div>
        <PortfolioFormDialog
          trigger={
            <Button className="bg-accent-solid hover:bg-accent-solid-hover text-white">
              New portfolio
            </Button>
          }
        />
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={(error as Error).message} />}
      {portfolios && portfolios.length === 0 && <EmptyState />}
      {portfolios && portfolios.length > 0 && (
        <PortfolioGrid
          portfolios={portfolios}
          onRename={setEditing}
          onDelete={setDeleting}
        />
      )}

      {/* Rename — controlled dialog driven by the card menu */}
      {editing && (
        <PortfolioFormDialog
          existing={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      {/* Delete — generic confirm dialog from Phase 3 */}
      {deleting && (
        <DeleteConfirmDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
          title="Delete portfolio?"
          description={`"${deleting.name}" and everything in it will be permanently removed.`}
          isPending={deletePortfolio.isPending}
          onConfirm={async () => {
            await deletePortfolio.mutateAsync({ id: deleting.id });
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 p-6 h-32 bg-muted/30 animate-pulse"
        />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
      <div>
        <p className="font-medium">Couldn't load portfolios</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <p className="text-muted-foreground mb-2">No portfolios yet.</p>
      <p className="text-sm text-muted-foreground">
        Click <strong className="text-foreground">New portfolio</strong> to create your first one.
      </p>
    </div>
  );
}

function PortfolioGrid({
  portfolios,
  onRename,
  onDelete,
}: {
  portfolios: Portfolio[];
  onRename: (p: Portfolio) => void;
  onDelete: (p: Portfolio) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {portfolios.map((p) => (
        <Card
          key={p.id}
          className="relative h-full transition-colors hover:border-accent-border-hover"
        >
          {/* The link covers the whole card; the menu sits above it in the
              corner and isn't inside the link, so opening it never navigates. */}
          <Link to={`/app/portfolio/${p.id}`} className="block">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <span className="block truncate pr-8">{p.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Created{" "}
                  {new Date(p.created_at).toLocaleDateString("en-PK", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Link>

          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 sm:w-7 sm:h-7">
                  <MoreVertical className="w-4 h-4" />
                  <span className="sr-only">Portfolio actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onRename(p)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => onDelete(p)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  );
}
