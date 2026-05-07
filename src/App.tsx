import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected app — outer layout */}
              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<BudgetsHome />} />

                {/* Budget detail — inner layout with sidebar */}
                <Route path="budgets/:budgetId" element={<BudgetLayout />}>
                  <Route index element={<BudgetRedirect />} />
                  <Route path="day/:date" element={<DayView />} />
                  <Route path="manage" element={<Manage />} />
                  <Route path="month" element={<MonthRedirect />} />
                  <Route path="month/:yearMonth" element={<MonthView />} /> 
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;