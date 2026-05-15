import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Settings, Menu, CalendarRange, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { todayISO } from "@/lib/format/date";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useBudget } from "@/queries/use-budget";

/**
 * Layout for everything under /app/budgets/:id.
 * Sidebar nav on desktop, drawer on mobile.
 * Renders matched child routes via <Outlet />.
 */
export function BudgetLayout() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const { data: budget, isLoading, error } = useBudget(budgetId);

  // Loading: skeleton header and sidebar so layout doesn't shift when data lands
  if (isLoading) {
    return <BudgetLayoutSkeleton />;
  }

  // Error or not-found: show a friendly fallback rather than a broken layout
  if (error || !budget) {
    return <BudgetNotFound />;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      <DesktopSidebar budgetId={budget.id} budgetName={budget.name} />
      <MobileTopBar budgetId={budget.id} budgetName={budget.name} />
      <main className="flex-1 min-w-0">
        {/* Outlet renders Day view or Manage view */}
        <Outlet />
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Desktop sidebar — always visible on lg screens
// ----------------------------------------------------------------------------
function DesktopSidebar({
  budgetId,
  budgetName,
}: {
  budgetId: string;
  budgetName: string;
}) {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 border-r border-border/40 flex-col">
      <SidebarHeader budgetName={budgetName} />
      <SidebarNav budgetId={budgetId} />
    </aside>
  );
}

// ----------------------------------------------------------------------------
// Mobile top bar with hamburger that opens a drawer
// ----------------------------------------------------------------------------
function MobileTopBar({
  budgetId,
  budgetName,
}: {
  budgetId: string;
  budgetName: string;
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
          {/* Required for accessibility — Sheet requires a title even if visually hidden */}
          <SheetTitle className="sr-only">Budget navigation</SheetTitle>
          <SidebarHeader budgetName={budgetName} />
          <div onClick={() => setOpen(false)}>
            <SidebarNav budgetId={budgetId} />
          </div>
        </SheetContent>
      </Sheet>
      <span className="font-semibold truncate">{budgetName}</span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Shared sidebar internals
// ----------------------------------------------------------------------------
function SidebarHeader({ budgetName }: { budgetName: string }) {
  return (
    <div className="p-4 border-b border-border/40">
      <Link
        to="/app"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All budgets
      </Link>
      <h2 className="font-semibold tracking-tight truncate">{budgetName}</h2>
    </div>
  );
}

function SidebarNav({ budgetId }: { budgetId: string }) {
  // Today's date in ISO yyyy-mm-dd format, for the default Day-view link.
  const today = todayISO();

  return (
    <nav className="flex-1 p-2 flex flex-col gap-1">
      <NavItem
        to={`/app/budgets/${budgetId}/day/${today}`}
        icon={<Calendar className="w-4 h-4" />}
        label="Day view"
      />
      <NavItem
        to={`/app/budgets/${budgetId}/month`}
        icon={<CalendarRange className="w-4 h-4" />}
        label="Month"
      />
      <NavItem
        to={`/app/budgets/${budgetId}/trends`}
        icon={<TrendingUp className="w-4 h-4" />}
        label="Trends"
      />
      <NavItem
        to={`/app/budgets/${budgetId}/manage`}
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

// ----------------------------------------------------------------------------
// Loading and error states
// ----------------------------------------------------------------------------
function BudgetLayoutSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-border/40 p-4 flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-40" />
        <div className="flex flex-col gap-2 mt-4">
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

function BudgetNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
      <h2 className="text-xl font-semibold mb-2">Budget not found</h2>
      <p className="text-sm text-muted-foreground mb-6">
        This budget doesn't exist, or you don't have access to it.
      </p>
      <Button asChild>
        <Link to="/app">Back to budgets</Link>
      </Button>
    </div>
  );
}