import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

function App() {
  // Just to confirm the client loaded; we'll wire real auth next phase.
  console.log("Supabase client:", supabase);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <h1 className="text-3xl font-bold text-foreground">Hisaab</h1>
      <Button>Click me</Button>
    </div>
  );
}

export default App;