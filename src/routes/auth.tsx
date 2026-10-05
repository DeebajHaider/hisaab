import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
import { oauthRedirectUrl } from "@/lib/auth-providers";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="mr-2 h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

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

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectUrl(window.location.origin, getPendingInvite()),
      },
    });
    // On success the browser navigates away to Google, so only failures return here.
    if (error) {
      setError(error.message);
      setSubmitting(false);
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
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
      {/* Restrained radial glow behind the card — this is the first screen
          anyone sees, worth a touch more presence than a flat background,
          without competing with the form itself. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 50% 35%, color-mix(in oklab, var(--accent-solid) 10%, transparent), transparent)",
        }}
      />

      <div className="relative w-full max-w-sm flex flex-col items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-accent-text" />
          <span className="text-lg font-semibold tracking-tight">Hisaab</span>
        </Link>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </CardTitle>
            <CardDescription>
              {mode === "sign-in"
                ? "Welcome back to Hisaab."
                : "Start tracking your budget."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={submitting}
            >
              <GoogleLogo />
              Continue with Google
            </Button>
            <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          </CardContent>
          <form onSubmit={handleSubmit}>
            {/* CardContent and CardFooter both live inside <form>, so
                they fall outside Card's own flex gap (that only spans
                CardHeader and the <form> as a single child) -- pb-6 here
                is what actually keeps the last field clear of
                CardFooter's top border, which otherwise sits right
                against it. */}
            <CardContent className="flex flex-col gap-5 pb-6">
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
                <PasswordInput
                  id="password"
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
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-accent-solid hover:bg-accent-solid-hover text-white"
                disabled={submitting}
              >
                {submitting
                  ? "Working..."
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Sign up"}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
    </div>
  );
}

