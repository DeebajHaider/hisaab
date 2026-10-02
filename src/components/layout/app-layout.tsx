import { Suspense, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { RouteFallback } from "@/components/layout/route-fallback";
import { prefetchAppRoutes } from "@/routes/lazy-routes";
import { Wallet, Sun, Moon, Monitor, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/format/initials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme-provider";
import { useAuth } from "@/lib/auth-context";


/**
 * Shell for all protected app pages.
 * Header at top, scrollable content via <Outlet />.
 * Renders nothing if user is null (RequireAuth handles that, but defensive).
 */
export function AppLayout() {
  useEffect(() => {
    prefetchAppRoutes();
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      {/* Fixed ambient color field — the thing .glass surfaces frost.
          Without it, backdrop-blur over a flat background blurs nothing. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 900px 600px at 10% -5%, var(--ambient-1), transparent 70%), " +
            "radial-gradient(ellipse 700px 600px at 95% 45%, var(--ambient-2), transparent 70%), " +
            "radial-gradient(ellipse 800px 500px at 30% 105%, var(--ambient-3), transparent 70%)",
        }}
      />
      <AppHeader />
      <main className="relative flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/app" className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-accent-text" />
            <span className="hidden sm:inline font-semibold tracking-tight">Hisaab</span>
          </Link>
          <SectionNav />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function SectionNav() {
  // Two top-level sections. We compute active state from the path rather than
  // leaning on NavLink's matching, because "/app" is a prefix of
  // "/app/portfolio" — a naive NavLink would light up Budgets on the
  // Portfolio page. Budgets is active at /app and inside any budget;
  // Portfolio is active anywhere under /app/portfolio.
  const { pathname } = useLocation();
  const inPortfolio = pathname.startsWith("/app/portfolio");
  const inSettings = pathname.startsWith("/app/settings");
  const inBudgets = !inPortfolio && !inSettings;

  const cls = (active: boolean) =>
    `rounded-md px-2 sm:px-3 py-1.5 text-sm transition-colors ${
      active
        ? "bg-muted font-medium text-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav className="flex items-center gap-1">
      <Link to="/app" className={cls(inBudgets)}>
        Budgets
      </Link>
      <Link to="/app/portfolio" className={cls(inPortfolio)}>
        Portfolio
      </Link>
    </nav>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9">
          {theme === "light" && <Sun className="w-4 h-4" />}
          {theme === "dark" && <Moon className="w-4 h-4" />}
          {theme === "system" && <Monitor className="w-4 h-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="w-4 h-4 mr-2" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="w-4 h-4 mr-2" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="w-4 h-4 mr-2" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();

  // Get initials for the avatar fallback. e.g. "deebaj@example.com" → "D"
  const initial = getInitials({ email: user?.email });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-accent-soft text-accent-soft-foreground text-sm font-medium">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Signed in as</span>
            <span className="text-sm font-medium truncate">{user?.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

