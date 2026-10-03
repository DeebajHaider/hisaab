import { Check } from "lucide-react";
import { useCountUp } from "@/lib/use-count-up";

/** The hero's product mock: a glass dashboard whose numbers count up and
 *  whose bars grow on load, with two floating chips that echo real features. */
export function HeroPreview() {
  return (
    <div className="relative">
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 text-center text-xs text-muted-foreground">
            hisaab.app — May 2026
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 sm:p-5">
          <Stat label="Spent" value={184250} trend="+12%" delay={700} />
          <Stat label="Income" value={320000} trend="steady" delay={820} />
          <Stat label="Variance" value={135750} trend="+8%" delay={940} accent />
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <Bars />
        </div>
      </div>

      <FloatingChip
        className="-left-3 -bottom-5 sm:-left-8"
        enterDelay={1500}
        floatDelay="0s"
      >
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <div>
          <div className="text-xs font-medium">Food each month</div>
          <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[85%] rounded-full bg-amber-500" />
          </div>
        </div>
        <span className="text-xs font-medium tabular-nums text-amber-600 dark:text-amber-400">
          85%
        </span>
      </FloatingChip>

      <FloatingChip
        className="-right-2 -top-5 sm:-right-6"
        enterDelay={1900}
        floatDelay="-3.5s"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-solid text-white">
          <Check className="h-3 w-3" />
        </span>
        <div className="text-xs">
          <span className="font-medium">Petrol</span>
          <span className="text-muted-foreground"> · PKR 4,250 saved</span>
        </div>
        <span className="text-xs font-medium text-accent-text">Undo</span>
      </FloatingChip>
    </div>
  );
}

function FloatingChip({
  children,
  className,
  enterDelay,
  floatDelay,
}: {
  children: React.ReactNode;
  className: string;
  enterDelay: number;
  floatDelay: string;
}) {
  // Entrance and float are on separate elements: both animate transform.
  return (
    <div
      className={`absolute ${className} motion-safe:animate-pop`}
      style={{ animationDelay: `${enterDelay}ms` }}
    >
      <div
        className="glass flex items-center gap-2.5 rounded-xl px-3 py-2 motion-safe:animate-float"
        style={{ animationDelay: floatDelay }}
      >
        {children}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  trend,
  delay,
  accent,
}: {
  label: string;
  value: number;
  trend: string;
  delay: number;
  accent?: boolean;
}) {
  const shown = useCountUp(value, true, 1500, delay);
  return (
    <div
      className={`rounded-lg border p-3 sm:p-4 ${
        accent
          ? "border-accent-highlight-border bg-accent-highlight/60"
          : "border-border/50 bg-background/40"
      }`}
    >
      <div className="mb-1 text-[11px] text-muted-foreground sm:text-xs">{label}</div>
      <div className="whitespace-nowrap text-sm font-semibold tabular-nums tracking-tight sm:text-lg">
        <span className="mr-1 hidden text-xs font-normal text-muted-foreground sm:inline">PKR</span>
        {shown.toLocaleString("en-US")}
      </div>
      <div
        className={`mt-1 text-[11px] sm:text-xs ${
          trend.startsWith("+") ? "text-accent-text" : "text-muted-foreground"
        }`}
      >
        {trend}
      </div>
    </div>
  );
}

const BARS = [
  { label: "Groceries", height: 78, color: "bg-teal-500" },
  { label: "Vehicle", height: 52, color: "bg-teal-400" },
  { label: "School", height: 64, color: "bg-teal-500" },
  { label: "Doctor", height: 28, color: "bg-teal-300" },
  { label: "Clothes", height: 41, color: "bg-teal-400" },
  { label: "Misc", height: 22, color: "bg-teal-300" },
];

function Bars() {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-4">
      <div className="flex h-28 items-end justify-between gap-2">
        {BARS.map((bar, i) => (
          <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className={`w-full origin-bottom rounded-sm ${bar.color} dark:opacity-85 motion-safe:animate-grow`}
              style={{ height: `${bar.height}%`, animationDelay: `${800 + i * 90}ms` }}
            />
            <div className="w-full truncate text-center text-[10px] text-muted-foreground">
              {bar.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
