import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-sm w-full text-center space-y-4">
        <FileQuestion className="w-10 h-10 mx-auto text-muted-foreground" />
        <div>
          <p aria-hidden className="text-5xl font-bold tracking-tight text-muted-foreground/30 mb-2">
            404
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This page doesn't exist, or you don't have access to it.
          </p>
        </div>
        <Button asChild>
          <Link to="/app">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
