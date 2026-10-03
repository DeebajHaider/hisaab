import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Download,
  Moon,
  Monitor,
  RotateCcw,
  Search,
  Smartphone,
  Sun,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme-provider";
import { clearPendingInvite } from "@/lib/pending-invite";
import { cn } from "@/lib/utils";
import { AmbientBackground } from "@/components/landing/ambient-background";
import { HeroPreview } from "@/components/landing/hero-preview";
import { Reveal } from "@/components/landing/reveal";
import {
  EntryVisual,
  FamilyVisual,
  MonthVisual,
  TargetsVisual,
  TrendsVisual,
} from "@/components/landing/feature-visuals";

export function Landing() {
  // Defensive sweep: if someone abandoned an invite flow and ended up
  // back on the landing page, drop the stale token. Prevents it from
  // attaching to whoever signs in next on this tab.
  useEffect(() => {
    clearPendingInvite();
  }, []);

  return (
    <div className="relative isolate min-h-screen bg-background text-foreground">
      <AmbientBackground />
      <Header />
      <Hero />
      <Features />
      <AlsoIncluded />
      <FinalCta />
      <Footer />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Header
// ----------------------------------------------------------------------------
function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-accent-text" />
          <span className="text-lg font-semibold tracking-tight">Hisaab</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-accent-solid text-white hover:bg-accent-solid-hover">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {theme === "light" && <Sun className="h-4 w-4" />}
          {theme === "dark" && <Moon className="h-4 w-4" />}
          {theme === "system" && <Monitor className="h-4 w-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ----------------------------------------------------------------------------
// Hero
// ----------------------------------------------------------------------------
const HEADLINE = ["The", "budgeting", "tool", "that", "fits", "how", "your", "family", "actually", "spends."];

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-32 lg:pt-28">
      <div>
        <div
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent-highlight-border bg-accent-highlight/70 px-3 py-1 text-xs font-medium text-accent-soft-foreground backdrop-blur motion-safe:animate-rise"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 motion-safe:animate-pulse" />
          Personal finance, finally readable
        </div>

        <h1 className="mb-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          {HEADLINE.map((word, i) => (
            <span key={i}>
              {/* The clipping wrapper turns the rise into a mask reveal. */}
              <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
                <span
                  className={cn(
                    "inline-block motion-safe:animate-rise",
                    word === "family" &&
                      "bg-gradient-to-r from-teal-700 via-teal-500 to-teal-700 bg-[length:200%_auto] bg-clip-text text-transparent motion-safe:animate-[rise_0.8s_cubic-bezier(0.2,0.7,0.2,1)_both,shimmer_7s_linear_infinite] dark:from-teal-400 dark:via-emerald-200 dark:to-teal-400",
                  )}
                  style={{ animationDelay: `${150 + i * 75}ms` }}
                >
                  {word}
                </span>
              </span>{" "}
            </span>
          ))}
        </h1>

        <p
          className="mb-9 max-w-xl text-lg leading-relaxed text-muted-foreground motion-safe:animate-rise"
          style={{ animationDelay: "1000ms" }}
        >
          Hisaab replaces messy spreadsheets with a structured ledger you and your family can share.
          Log expenses by category, set targets, and see where the money actually goes.
        </p>

        <div
          className="flex flex-wrap items-center gap-3 motion-safe:animate-rise"
          style={{ animationDelay: "1150ms" }}
        >
          <Button asChild size="lg" className="group h-11 bg-accent-solid px-5 text-base text-white hover:bg-accent-solid-hover">
            <Link to="/auth">
              Get started, it's free
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 bg-background/40 px-5 text-base backdrop-blur">
            <a href="#features">See how it works</a>
          </Button>
        </div>

        <ul
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground motion-safe:animate-rise"
          style={{ animationDelay: "1300ms" }}
        >
          {["Shared family budgets", "Works on your phone", "Light and dark"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-accent-text" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="motion-safe:animate-rise" style={{ animationDelay: "500ms" }}>
        <HeroPreview />
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Features
// ----------------------------------------------------------------------------
function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 space-y-24 px-4 py-16 sm:px-6 sm:py-24">
      <Reveal>
        <p className="mb-3 text-sm font-medium text-accent-text">Features</p>
        <h2 className="mb-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Built around how budgets actually work
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Not just expense logging. Categories, sub-items, targets, multi-person tracking, and
          roll-ups that mirror the spreadsheet you've been wrestling with.
        </p>
      </Reveal>

      <FeatureRow
        title="Search-first entry"
        description="Type 'flour' and get the right item, the right category, the right unit. Recently used items rank first, and anything missing can be added on the spot. No menu diving when you sit down to enter a week's worth of spending."
        visual={<EntryVisual />}
      />
      <FeatureRow
        title="See the month at a glance"
        description="Category breakdowns, percentage contributions, monthly variance, per-person totals, all derived live from your transactions. The roll-ups update as you log."
        visual={<MonthVisual />}
        reverse
      />
      <FeatureRow
        title="Stay on target"
        description="Set a limit for any mix of categories or items over any dates. You'll see how close you are right on the day you're logging, and renew a target with one click when its period ends."
        visual={<TargetsVisual />}
      />
      <FeatureRow
        title="Track trends over time"
        description="Monthly spending lines, stacked category bars across months, and per-category drill-downs. Spot the months when vehicle costs spiked or groceries crept up."
        visual={<TrendsVisual />}
        reverse
      />
      <FeatureRow
        title="Built for the whole family"
        description="A shared family budget alongside your private one. Anyone with edit access can log or correct entries. Per-person attribution for things like school fees and pocket money."
        visual={<FamilyVisual />}
      />
    </section>
  );
}

function FeatureRow({
  title,
  description,
  visual,
  reverse,
}: {
  title: string;
  description: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16",
        reverse && "lg:[&>*:first-child]:order-2",
      )}
    >
      <Reveal>
        <h3 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
        <p className="max-w-lg leading-relaxed text-muted-foreground">{description}</p>
      </Reveal>
      <Reveal delay={120}>
        <div className="glass overflow-hidden rounded-2xl transition-transform duration-500 hover:-translate-y-1">
          {visual}
        </div>
      </Reveal>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Smaller features
// ----------------------------------------------------------------------------
const EXTRAS = [
  { icon: Zap, title: "One-tap templates", text: "Rent, the gym, a regular top-up. Log it in a single tap." },
  { icon: RotateCcw, title: "Undo and log again", text: "Deleted by mistake? Undo it. Same purchase again? One tap." },
  { icon: Search, title: "Searchable ledger", text: "Filter by date, category, item, person or notes, then export to CSV." },
  { icon: Download, title: "Your data is yours", text: "Export everything to a spreadsheet whenever you like." },
  { icon: Smartphone, title: "Made for phones", text: "Swipe between days and add it to your home screen." },
  { icon: Moon, title: "Light and dark", text: "Follows your device, or pick one." },
];

function AlsoIncluded() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal>
        <p className="mb-3 text-sm font-medium text-accent-text">And the details</p>
        <h2 className="mb-10 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          The small things that make daily logging quick
        </h2>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXTRAS.map(({ icon: Icon, title, text }, i) => (
          <Reveal key={title} delay={(i % 3) * 100}>
            <div className="glass group h-full rounded-xl p-5 transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mb-1 font-medium">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Final call to action
// ----------------------------------------------------------------------------
function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
      <Reveal>
        <div className="glass flex flex-col items-start justify-between gap-8 rounded-2xl p-8 sm:p-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Make next month readable.
            </h2>
            <p className="max-w-lg text-muted-foreground">
              Set up your categories once, then log in a few taps a day. Free, and it takes a minute.
            </p>
          </div>
          <Button asChild size="lg" className="group h-12 shrink-0 bg-accent-solid px-6 text-base text-white hover:bg-accent-solid-hover">
            <Link to="/auth">
              Get started
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Footer
// ----------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-accent-text" />
          <span className="text-sm text-muted-foreground">Hisaab: clearer family finances.</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link to="/auth" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <a href="https://github.com" className="transition-colors hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
