import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { queryClient } from "@/lib/query-client";
import { RequireAuth } from "@/components/auth/require-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Landing } from "@/routes/landing";
import { AuthPage } from "@/routes/auth";
import { BudgetsHome } from "@/routes/budgets-home";
import { NotFound } from "@/routes/not-found";

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public — no layout */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected app routes — wrapped in RequireAuth + AppLayout */}
              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                {/* index = renders at exactly /app */}
                <Route index element={<BudgetsHome />} />
                {/* Future routes go here:
                <Route path="budgets/:id/day/:date" element={<DayView />} />
                <Route path="budgets/:id/month/:yyyy-mm" element={<MonthView />} />
                ... */}
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