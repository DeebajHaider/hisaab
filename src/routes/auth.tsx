import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPendingInvite } from "@/lib/pending-invite";

type Mode = "sign-in" | "sign-up";

export function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // After a successful sign-in/sign-up, decide where to send the user.
  // Pending invite token in sessionStorage takes priority — that's the
  // whole point of the stash.
  const redirectAfterAuth = () => {
    const pendingToken = getPendingInvite();
    if (pendingToken) {
      // Don't clear sessionStorage here — the /invite/:token page is
      // responsible for clearing after it consumes the token. If we
      // clear here, a refresh on the invite page would lose the context.
      navigate(`/invite/${pendingToken}`, { replace: true });
    } else {
      navigate("/app", { replace: true });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Clear cache before navigating. Belt-and-suspenders against the
        // case where the previous session expired silently and left
        // stale data in the cache.
        queryClient.clear();
        redirectAfterAuth();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // If email confirmation is OFF in Supabase project settings, signUp
        // returns a session immediately and the user is logged in. If it's
        // ON, no session is returned and they need to confirm via email
        // first. data.session is the discriminator.
        if (data.session) {
          queryClient.clear();
          redirectAfterAuth();
        } else {
          setError(
            "Check your email for a confirmation link, then come back and sign in.",
          );
          setMode("sign-in");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "sign-in" ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            {mode === "sign-in"
              ? "Welcome back to Hisaab."
              : "Start tracking your budget."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? "Working..."
                : mode === "sign-in"
                  ? "Sign in"
                  : "Sign up"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                setError(null);
              }}
            >
              {mode === "sign-in"
                ? "Need an account? Sign up"
                : "Have an account? Sign in"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

