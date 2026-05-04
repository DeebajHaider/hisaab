import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { RequireAuth } from "@/components/auth/require-auth";
import { AuthPage } from "@/routes/auth";
import { BudgetsHome } from "@/routes/budgets-home";
import { NotFound } from "@/routes/not-found";

function App() {
  return (
    // AuthProvider wraps everything so any component can call useAuth().
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected — redirects to /auth if not signed in */}
          <Route
            path="/"
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
  );
}

export default App;