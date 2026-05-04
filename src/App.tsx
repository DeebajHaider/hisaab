import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { RequireAuth } from "@/components/auth/require-auth";
import { Landing } from "@/routes/landing";
import { AuthPage } from "@/routes/auth";
import { BudgetsHome } from "@/routes/budgets-home";
import { NotFound } from "@/routes/not-found";

function App() {
  return (
    // ThemeProvider is outermost — every component, including auth pages,
    // needs to know about the theme.
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected — moved from / to /app */}
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <BudgetsHome />
                </RequireAuth>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;