import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Settings,
  Menu,
  Ellipsis,
  CalendarRange,
  Receipt,
  Target,
  TrendingUp,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import { Suspense, useState } from "react";
import { RouteFallback } from "@/components/layout/route-fallback";
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

export function BudgetLayout() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const { data: budget, isLoading, error } = useBudget(budgetId);
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) return <BudgetLayoutSkeleton />;
  if (error || !budget) return <BudgetNotFound />;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      <DesktopSidebar budgetId={budget.id} budgetName={budget.name} />
      <MobileTopBar
        budgetId={budget.id}
        budgetName={budget.name}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      />
      {/* Room for the phone tab bar so the last content isn't hidden under it. */}
      <main className="flex-1 min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomTabBar budgetId={budget.id} onMore={() => setMenuOpen(true)} />
    </div>
  );
}

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

function MobileTopBar({
  budgetId,
  budgetName,
  open,
  onOpenChange: setOpen,
}: {
  budgetId: string;
  budgetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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

function BottomTabBar({
  budgetId,
  onMore,
}: {
  budgetId: string;
  onMore: () => void;
}) {
  const { pathname } = useLocation();
  const base = `/app/budgets/${budgetId}`;
  const tabs = [
    { to: `${base}/day/${todayISO()}`, prefix: `${base}/day`, label: "Day", icon: Calendar },
    { to: `${base}/month`, prefix: `${base}/month`, label: "Month", icon: CalendarRange },
    { to: `${base}/ledger`, prefix: `${base}/ledger`, label: "Ledger", icon: Receipt },
    { to: `${base}/targets`, prefix: `${base}/targets`, label: "Targets", icon: Target },
  ];
  const onTab = tabs.some((t) => pathname.startsWith(t.prefix));
  const tabCls = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
      active ? "text-accent-text font-medium" : "text-muted-foreground"
    }`;

  return (
    <nav
      aria-label="Budget sections"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150 pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map(({ to, prefix, label, icon: Icon }) => (
        <Link
          key={label}
          to={to}
          aria-current={pathname.startsWith(prefix) ? "page" : undefined}
          className={tabCls(pathname.startsWith(prefix))}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
      <button type="button" onClick={onMore} className={tabCls(!onTab)}>
        <Ellipsis className="h-5 w-5" />
        More
      </button>
    </nav>
  );
}

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
  const today = todayISO();

  return (
    <>
      <nav className="flex-1 p-2 flex flex-col gap-1">
        <NavItem
          to={`/app/budgets/${budgetId}/day/${today}`}
          matchPrefix={`/app/budgets/${budgetId}/day`}
          icon={<Calendar className="w-4 h-4" />}
          label="Day view"
        />
        <NavItem
          to={`/app/budgets/${budgetId}/month`}
          icon={<CalendarRange className="w-4 h-4" />}
          label="Month"
        />
        <NavItem
          to={`/app/budgets/${budgetId}/ledger`}
          icon={<Receipt className="w-4 h-4" />}
          label="Ledger"
        />
        <NavItem
          to={`/app/budgets/${budgetId}/targets`}
          icon={<Target className="w-4 h-4" />}
          label="Targets"
        />
        <NavItem
          to={`/app/budgets/${budgetId}/trends`}
          icon={<TrendingUp className="w-4 h-4" />}
          label="Trends"
        />
        <NavItem
          to={`/app/budgets/${budgetId}/members`}
          icon={<Users className="w-4 h-4" />}
          label="Members"
        />
        <NavItem
          to={`/app/budgets/${budgetId}/manage`}
          icon={<Settings className="w-4 h-4" />}
          label="Manage"
        />
        <NavItem
          to={`/app/budgets/${budgetId}/settings`}
          icon={<SlidersHorizontal className="w-4 h-4" />}
          label="Settings"
        />
      </nav>
      <p className="px-3 py-3 text-[11px] leading-snug text-muted-foreground border-t border-border/40">
        Updates aren't live. Data refreshes when you return to the tab or
        every 30 seconds as you navigate.
      </p>
    </>
  );
}

function NavItem({
  to,
  matchPrefix,
  icon,
  label,
}: {
  to: string;
  /** Treat any path under this prefix as active (Day view's link carries a date). */
  matchPrefix?: string;
  icon: React.ReactNode;
  label: string;
}) {
  const { pathname } = useLocation();
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          matchPrefix ? pathname.startsWith(matchPrefix) : isActive
            ? "bg-accent-soft/60 text-accent-soft-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

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
