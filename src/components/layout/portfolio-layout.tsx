import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, Coins, Settings, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePortfolio } from "@/queries/use-portfolio";

export function PortfolioLayout() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data: portfolio, isLoading } = usePortfolio(portfolioId);

  if (isLoading) return <PortfolioLayoutSkeleton />;
  if (!portfolio) return <PortfolioNotFound />;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      <DesktopSidebar portfolioId={portfolio.id} portfolioName={portfolio.name} />
      <MobileTopBar portfolioId={portfolio.id} portfolioName={portfolio.name} />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function DesktopSidebar({
  portfolioId,
  portfolioName,
}: {
  portfolioId: string;
  portfolioName: string;
}) {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 border-r border-border/40 flex-col">
      <SidebarHeader portfolioName={portfolioName} />
      <SidebarNav portfolioId={portfolioId} />
    </aside>
  );
}

function MobileTopBar({
  portfolioId,
  portfolioName,
}: {
  portfolioId: string;
  portfolioName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden border-b border-border/40 px-4 py-3 flex items-center gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="w-9 h-9">
            <Menu className="w-5 h-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetTitle className="sr-only">Portfolio navigation</SheetTitle>
          <SidebarHeader portfolioName={portfolioName} />
          <div onClick={() => setOpen(false)}>
            <SidebarNav portfolioId={portfolioId} />
          </div>
        </SheetContent>
      </Sheet>
      <span className="font-semibold truncate">{portfolioName}</span>
    </div>
  );
}

function SidebarHeader({ portfolioName }: { portfolioName: string }) {
  return (
    <div className="p-4 border-b border-border/40">
      <Link
        to="/app/portfolio"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All portfolios
      </Link>
      <h2 className="font-semibold tracking-tight truncate">{portfolioName}</h2>
    </div>
  );
}

function SidebarNav({ portfolioId }: { portfolioId: string }) {
  return (
    <nav className="flex-1 p-2 flex flex-col gap-1">
      <NavItem
        to={`/app/portfolio/${portfolioId}/overview`}
        icon={<LayoutDashboard className="w-4 h-4" />}
        label="Overview"
      />
      <NavItem
        to={`/app/portfolio/${portfolioId}/holdings`}
        icon={<Coins className="w-4 h-4" />}
        label="Holdings"
      />
      <NavItem
        to={`/app/portfolio/${portfolioId}/manage`}
        icon={<Settings className="w-4 h-4" />}
        label="Manage"
      />
    </nav>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-teal-100/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

function PortfolioLayoutSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-border/40 p-4 flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-40" />
        <div className="flex flex-col gap-2 mt-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </main>
    </div>
  );
}

function PortfolioNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
      <h2 className="text-xl font-semibold mb-2">Portfolio not found</h2>
      <p className="text-sm text-muted-foreground mb-6">
        This portfolio doesn't exist, or you don't have access to it.
      </p>
      <Button asChild>
        <Link to="/app/portfolio">Back to portfolios</Link>
      </Button>
    </div>
  );
}