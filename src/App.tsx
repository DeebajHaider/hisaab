import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { queryClient } from "@/lib/query-client";
import { ErrorBoundary } from "@/components/error-boundary";
import { RequireAuth } from "@/components/auth/require-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { BudgetLayout } from "@/components/layout/budget-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Landing } from "@/routes/landing";
import { AuthPage } from "@/routes/auth";
import { BudgetsHome } from "@/routes/budgets-home";
import { BudgetRedirect } from "@/routes/budget-redirect";
import { DayView } from "@/routes/day-view";
import { Manage } from "@/routes/manage";
import { BudgetSettings } from "@/routes/budget-settings";
import { NotFound } from "@/routes/not-found";
import { MonthRedirect } from "@/routes/month-redirect";
import { Ledger } from "@/routes/ledger";
import { InviteAccept } from "@/routes/invite-accept";
import { Members } from "@/routes/members";
import { Settings } from "@/routes/settings";
import { Toaster } from "@/components/ui/sonner";
import { PortfoliosHome } from "@/routes/portfolios-home";
import { PortfolioLayout } from "@/components/layout/portfolio-layout";
import { PortfolioManage } from "@/routes/portfolio-manage";

// Lazy-loaded: these four are the only routes that pull in Recharts (the
// heaviest dependency), either directly (Trends, Month view, Portfolio
// overview's charts) or indirectly (Portfolio holdings' expandable
// per-holding history chart). Every other route — including the public
// Landing/Auth pages, which load before anyone's even signed in — never
// needs charting code, so keeping these out of the main bundle is a real
// win, not just a config toggle (confirmed: build.rolldownOptions.output.
// codeSplitting alone had zero effect without an actual import() boundary
// for it to split along).
const MonthView = lazy(() =>
  import("@/routes/month-view").then((m) => ({ default: m.MonthView })),
);
const Trends = lazy(() =>
  import("@/routes/trends").then((m) => ({ default: m.Trends })),
);
const PortfolioOverview = lazy(() =>
  import("@/routes/portfolio-overview").then((m) => ({ default: m.PortfolioOverview })),
);
const PortfolioHoldings = lazy(() =>
  import("@/routes/portfolio-holdings").then((m) => ({ default: m.PortfolioHoldings })),
);

function RouteLoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {/* Catches render errors in the route tree and auth context.
              Providers above this boundary (Theme, Query) are excluded
              — they never crash in practice and need to stay alive for
              the fallback UI to render correctly. */}
          <ErrorBoundary>
            <AuthProvider>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/invite/:token" element={<InviteAccept />} />

                  <Route
                    path="/app"
                    element={
                      <RequireAuth>
                        <AppLayout />
                      </RequireAuth>
                    }
                  >
                    <Route index element={<BudgetsHome />} />
                    <Route path="settings" element={<Settings />} />

                    <Route path="budgets/:budgetId" element={<BudgetLayout />}>
                      <Route index element={<BudgetRedirect />} />
                      <Route path="day/:date" element={<DayView />} />
                      <Route path="manage" element={<Manage />} />
                      <Route path="settings" element={<BudgetSettings />} />
                      <Route path="month" element={<MonthRedirect />} />
                      <Route path="month/:yearMonth" element={<MonthView />} />
                      <Route path="ledger" element={<Ledger />} />
                      <Route path="trends" element={<Trends />} />
                      <Route path="members" element={<Members />} />
                    </Route>

                    <Route path="portfolio">
                      <Route index element={<PortfoliosHome />} />
                      <Route path=":portfolioId" element={<PortfolioLayout />}>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={<PortfolioOverview />} />
                        <Route path="holdings" element={<PortfolioHoldings />} />
                        <Route path="manage" element={<PortfolioManage />} />
                      </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;