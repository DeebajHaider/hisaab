import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { queryClient } from "@/lib/query-client";
import { RequireAuth } from "@/components/auth/require-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { BudgetLayout } from "@/components/layout/budget-layout";
import { Landing } from "@/routes/landing";
import { AuthPage } from "@/routes/auth";
import { BudgetsHome } from "@/routes/budgets-home";
import { BudgetRedirect } from "@/routes/budget-redirect";
import { DayView } from "@/routes/day-view";
import { Manage } from "@/routes/manage";
import { NotFound } from "@/routes/not-found";
import { MonthView } from "@/routes/month-view";
import { MonthRedirect } from "@/routes/month-redirect";
import { Trends } from "@/routes/trends";
import { InviteAccept } from "@/routes/invite-accept";
import { Members } from "@/routes/members";
import { Settings } from "@/routes/settings";
import { Toaster } from "@/components/ui/sonner";
import { PortfoliosHome } from "@/routes/portfolios-home";
import { PortfolioLayout } from "@/components/layout/portfolio-layout";
import { PortfolioHoldings } from "@/routes/portfolio-holdings";
import { PortfolioManage } from "@/routes/portfolio-manage";

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
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
                  <Route path="month" element={<MonthRedirect />} />
                  <Route path="month/:yearMonth" element={<MonthView />} />
                  <Route path="trends" element={<Trends />} />
                  <Route path="members" element={<Members />} />
                </Route>

                <Route path="portfolio">
                  <Route index element={<PortfoliosHome />} />
                  <Route path=":portfolioId" element={<PortfolioLayout />}>
                    <Route index element={<Navigate to="holdings" replace />} />
                    <Route path="holdings" element={<PortfolioHoldings />} />
                    <Route path="manage" element={<PortfolioManage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        {/* Mounted once at app root. Renders nothing until toasts fire. */}
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

