import { Suspense } from "react";
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
import { PortfolioLayout } from "@/components/layout/portfolio-layout";
import { RouteFallback } from "@/components/layout/route-fallback";
import { Toaster } from "@/components/ui/sonner";
import { BudgetRedirect } from "@/routes/budget-redirect";
import { MonthRedirect } from "@/routes/month-redirect";
import {
  AuthPage,
  BudgetSettings,
  BudgetsHome,
  DayView,
  InviteAccept,
  Landing,
  Ledger,
  Manage,
  Members,
  MonthView,
  NotFound,
  PortfolioHoldings,
  PortfolioManage,
  PortfolioOverview,
  PortfoliosHome,
  Settings,
  Targets,
  Trends,
} from "@/routes/lazy-routes";

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
              {/* Outer boundary only catches top-level pages (landing, auth,
                  invite). Layouts have their own around <Outlet /> so the
                  header and sidebar stay put while a page chunk loads. */}
              <Suspense fallback={<RouteFallback />}>
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
                      <Route path="targets" element={<Targets />} />
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