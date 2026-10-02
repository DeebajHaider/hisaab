import { Link } from "react-router-dom";
import {
  Wallet,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme-provider";
import { useEffect } from "react";
import { clearPendingInvite } from "@/lib/pending-invite";

export function Landing() {
  // Defensive sweep: if someone abandoned an invite flow and ended up
  // back on the landing page, drop the stale token. Prevents it from
  // attaching to whoever signs in next on this tab.
  useEffect(() => {
    clearPendingInvite();
  }, []);
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Header — logo, theme toggle, sign-in button
// ----------------------------------------------------------------------------
function Header() {
  return (
    <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent-text" />
          <span className="font-semibold text-lg tracking-tight">Hisaab</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-accent-solid hover:bg-accent-solid-hover text-white">
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
        <Button variant="ghost" size="icon" className="w-9 h-9">
          {/* Show current icon. Subtle but informative. */}
          {theme === "light" && <Sun className="w-4 h-4" />}
          {theme === "dark" && <Moon className="w-4 h-4" />}
          {theme === "system" && <Monitor className="w-4 h-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="w-4 h-4 mr-2" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="w-4 h-4 mr-2" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="w-4 h-4 mr-2" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ----------------------------------------------------------------------------
// Hero — headline, subheadline, CTA, decorative chart preview
// ----------------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft teal gradient backdrop — subtle, light-mode and dark-mode aware. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-teal-50/60 via-transparent to-transparent dark:from-teal-950/20"
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/60 text-xs font-medium text-teal-800 dark:text-teal-300 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Personal finance, finally readable
        </div>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight mb-6 max-w-3xl mx-auto">
          The budgeting tool that fits how your{" "}
          <span className="text-accent-text">family</span>{" "}
          actually spends.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Hisaab replaces messy spreadsheets with a structured ledger you and
          your family can share. Log expenses by category, track variance, and
          see where the money actually goes.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-accent-solid hover:bg-accent-solid-hover text-white">
            <Link to="/auth">Get started — it's free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#features">See how it works</a>
          </Button>
        </div>

        {/* Mock dashboard preview */}
        <div className="mt-16 max-w-4xl mx-auto">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-2xl shadow-teal-900/5 overflow-hidden">
      <div className="border-b border-border/60 px-4 py-3 flex items-center gap-2 bg-muted/30">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 text-center text-xs text-muted-foreground">
          hisaab.app — May 2026
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <StatCard label="Spent" value="184,250" trend="+12%" trendUp />
        <StatCard label="Income" value="320,000" trend="steady" />
        <StatCard label="Variance" value="135,750" trend="+8%" trendUp accent />
      </div>
      <div className="px-6 pb-6">
        <MiniBars />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
  accent,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent
          ? "border-accent-highlight-border bg-accent-highlight/50"
          : "border-border/60 bg-background"
      }`}
    >
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">PKR {value}</div>
      <div
        className={`text-xs mt-1 ${
          trendUp
            ? "text-teal-700 dark:text-teal-400"
            : "text-muted-foreground"
        }`}
      >
        {trend}
      </div>
    </div>
  );
}

function MiniBars() {
  // Decorative SVG bar chart. Heights chosen to look like real category data.
  const bars = [
    { label: "Groceries", height: 78, color: "fill-teal-500" },
    { label: "Vehicle", height: 52, color: "fill-teal-400" },
    { label: "School", height: 64, color: "fill-teal-500" },
    { label: "Doctor", height: 28, color: "fill-teal-300" },
    { label: "Clothes", height: 41, color: "fill-teal-400" },
    { label: "Misc", height: 22, color: "fill-teal-300" },
  ];
  return (
    <div className="rounded-lg border border-border/60 p-4 bg-background">
      <div className="flex items-end justify-between gap-2 h-24">
        {bars.map((bar) => (
          <div
            key={bar.label}
            className="flex-1 flex flex-col items-center gap-1.5"
          >
            <div
              className={`w-full rounded-sm ${bar.color} dark:opacity-80`}
              style={{ height: `${bar.height}%` }}
            />
            <div className="text-[10px] text-muted-foreground truncate w-full text-center">
              {bar.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Features — symmetric alternating layout
// ----------------------------------------------------------------------------
function Features() {
  return (
    <section
      id="features"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-20 space-y-20"
    >
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
          Built around how budgets actually work
        </h2>
        <p className="text-muted-foreground">
          Not just expense logging. Categories, sub-items, multi-person tracking,
          and roll-ups that mirror the spreadsheet you've been wrestling with.
        </p>
      </div>

      <FeatureRow
        title="Search-first entry"
        description="Type 'flour' — get the right item, the right category, the right unit. Recently-used items rank first. No menu diving when you sit down to enter a week's worth of spending."
        visual={<EntryVisual />}
        reverse={false}
      />
      <FeatureRow
        title="See the month at a glance"
        description="Category breakdowns, percentage contributions, monthly variance, per-person totals — all derived live from your transactions. The roll-ups update as you log."
        visual={<MonthVisual />}
        reverse={true}
      />
      <FeatureRow
        title="Track trends over time"
        description="Monthly spending lines, stacked category bars across months, and per-category drill-downs. Spot the months when vehicle costs spiked or groceries crept up."
        visual={<TrendsVisual />}
        reverse={false}
      />
      <FeatureRow
        title="Built for the whole family"
        description="A shared family budget alongside your private one. Anyone with edit access can log or correct entries. Per-person attribution for things like school fees and pocket money."
        visual={<FamilyVisual />}
        reverse={true}
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
  reverse: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
        reverse ? "lg:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div>
        <h3 className="text-2xl font-semibold tracking-tight mb-3">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-lg shadow-teal-900/5">
        {visual}
      </div>
    </div>
  );
}

// ----- Visual blocks for each feature row -----
function EntryVisual() {
  return (
    <div className="p-6 space-y-3">
      <div className="px-3 py-2 rounded-md border border-accent-highlight-border bg-accent-highlight/50 text-sm">
        <span className="text-muted-foreground">Search:</span>{" "}
        <span className="font-medium">flou</span>
      </div>
      <div className="space-y-1.5 text-sm">
        <DropItem name="Flour" category="Groceries" unit="Kg" highlighted />
        <DropItem name="Cauliflower" category="Meat/Veg/Fruit" />
        <DropItem name="+ Create 'flou' as new item" muted />
      </div>
    </div>
  );
}

function DropItem({
  name,
  category,
  unit,
  highlighted,
  muted,
}: {
  name: string;
  category?: string;
  unit?: string;
  highlighted?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-md text-sm ${
        highlighted
          ? "bg-teal-100/60 dark:bg-teal-950/40 border border-teal-300/60 dark:border-teal-800/60"
          : muted
            ? "text-muted-foreground italic"
            : "border border-transparent"
      }`}
    >
      <span className="font-medium">{name}</span>
      {category && (
        <span className={`text-xs ml-2 ${highlighted ? "text-foreground/70" : "text-muted-foreground"}`}>
          {category}
          {unit && ` · ${unit}`}
        </span>
      )}
    </div>
  );
}

function MonthVisual() {
  const cats = [
    { name: "Groceries", pct: 42, amt: "77,400" },
    { name: "Vehicle", pct: 22, amt: "40,500" },
    { name: "School", pct: 18, amt: "33,200" },
    { name: "Doctor", pct: 8, amt: "14,700" },
    { name: "Misc", pct: 10, amt: "18,450" },
  ];
  return (
    <div className="p-6 space-y-3">
      {cats.map((c) => (
        <div key={c.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{c.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {c.amt} <span className="text-xs">({c.pct}%)</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-teal-500 dark:bg-teal-400"
              style={{ width: `${c.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendsVisual() {
  // Simple decorative SVG line chart.
  const points = [20, 35, 28, 50, 42, 65, 58, 72];
  const max = 80;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <div className="p-6">
      <svg viewBox="0 0 100 50" className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(20 184 166)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(20 184 166)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L 100 50 L 0 50 Z`}
          fill="url(#lineFill)"
        />
        <path
          d={path}
          fill="none"
          stroke="rgb(20 184 166)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((v, i) => {
          const x = (i / (points.length - 1)) * 100;
          const y = 100 - (v / max) * 100;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.5"
              fill="rgb(20 184 166)"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function FamilyVisual() {
  const people = [
    { name: "John", amt: "8,500", color: "bg-teal-500" },
    { name: "Charlie", amt: "12,200", color: "bg-teal-400" },
    { name: "Dave", amt: "6,800", color: "bg-teal-500" },
    { name: "Alice", amt: "9,100", color: "bg-teal-400" },
  ];
  return (
    <div className="p-6 space-y-2">
      <div className="text-xs text-muted-foreground mb-3">
        Pocket Money — May 2026
      </div>
      {people.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-3 px-3 py-2 rounded-md border border-border/60"
        >
          <div
            className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center text-white text-sm font-medium`}
          >
            {p.name[0]}
          </div>
          <div className="flex-1 text-sm font-medium">{p.name}</div>
          <div className="text-sm tabular-nums text-muted-foreground">
            {p.amt}
          </div>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Footer
// ----------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-accent-text" />
          <span className="text-sm text-muted-foreground">
            Hisaab — clearer family finances.
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          
          <a  href="https://github.com"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}