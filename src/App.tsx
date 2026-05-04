import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthPage } from "@/routes/auth";
import { BudgetsHome } from "@/routes/budgets-home";
import { NotFound } from "@/routes/not-found";

function App() {
  return (
    // BrowserRouter enables client-side routing using the History API.
    // The whole app must be inside this for routing to work.
    <BrowserRouter>
      <Routes>
        {/* Public route — no auth required */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Protected routes — we'll add the auth wrapper in 5.3 */}
        <Route path="/" element={<BudgetsHome />} />

        {/* Catch-all for unmatched URLs */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;