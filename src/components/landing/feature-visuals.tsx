import { cn } from "@/lib/utils";
import { useInView } from "@/lib/use-in-view";
import { useTyped } from "@/lib/use-typed";
import { Reveal } from "./reveal";

// ----- Search-first entry: the query types itself, then results appear -----
export function EntryVisual() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const typed = useTyped("flou", seen);
  const done = typed === "flou";

  return (
    <div ref={ref} className="space-y-3 p-6">
      <div className="rounded-md border border-accent-highlight-border bg-accent-highlight/60 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Search:</span>{" "}
        <span className="font-medium">{typed}</span>
        <span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-accent-text motion-safe:animate-pulse" />
      </div>
      <div
        className={cn(
          "space-y-1.5 text-sm transition-all duration-500",
          done ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <DropItem name="Flour" category="Groceries" unit="Kg" highlighted />
        <DropItem name="Cauliflower" category="Meat/Veg/Fruit" />
        <DropItem name="+ Add “flou” as a new item" muted />
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
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        highlighted
          ? "border-accent-highlight-border bg-accent-highlight/70"
          : muted
            ? "border-transparent italic text-muted-foreground"
            : "border-transparent",
      )}
    >
      <span className="font-medium">{name}</span>
      {category && (
        <span className={cn("ml-2 text-xs", highlighted ? "text-foreground/70" : "text-muted-foreground")}>
          {category}
          {unit && ` · ${unit}`}
        </span>
      )}
    </div>
  );
}

// ----- Month at a glance: category bars fill in -----
export function MonthVisual() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const cats = [
    { name: "Groceries", pct: 42, amt: "77,400" },
    { name: "Vehicle", pct: 22, amt: "40,500" },
    { name: "School", pct: 18, amt: "33,200" },
    { name: "Doctor", pct: 8, amt: "14,700" },
    { name: "Misc", pct: 10, amt: "18,450" },
  ];
  return (
    <div ref={ref} className="space-y-3 p-6">
      {cats.map((c, i) => (
        <div key={c.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{c.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {c.amt} <span className="text-xs">({c.pct}%)</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-teal-500 transition-[width] duration-1000 ease-out motion-reduce:transition-none dark:bg-teal-400"
              style={{ width: seen ? `${c.pct}%` : "0%", transitionDelay: `${i * 110}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ----- Targets: progress fills to green / amber / red -----
export function TargetsVisual() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const targets = [
    { name: "Gym", used: "PKR 1,000 of 9,000", pct: 11, bar: "bg-emerald-500", note: "11% used", noteCls: "text-emerald-600 dark:text-emerald-400" },
    { name: "Food each month", used: "PKR 3,400 of 4,000", pct: 85, bar: "bg-amber-500", note: "85% used", noteCls: "text-amber-600 dark:text-amber-400" },
    { name: "Fuel", used: "PKR 6,000 of 4,000", pct: 100, bar: "bg-red-500", note: "PKR 2,000 over", noteCls: "text-red-600 dark:text-red-400" },
  ];
  return (
    <div ref={ref} className="space-y-3 p-6">
      {targets.map((t, i) => (
        <div key={t.name} className="rounded-lg border border-border/50 bg-background/40 px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{t.name}</span>
            <span className={cn("text-xs font-medium tabular-nums", t.noteCls)}>{t.note}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none", t.bar)}
              style={{ width: seen ? `${t.pct}%` : "0%", transitionDelay: `${i * 160}ms` }}
            />
          </div>
          <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">{t.used}</p>
        </div>
      ))}
    </div>
  );
}

// ----- Trends: the line draws itself -----
export function TrendsVisual() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const points = [20, 35, 28, 50, 42, 65, 58, 72];
  const max = 80;
  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * 100,
    y: 50 - (v / max) * 50,
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <div ref={ref} className="p-6">
      <svg viewBox="0 0 100 50" className="block h-32 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="landing-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(20 184 166)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(20 184 166)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L 100 50 L 0 50 Z`}
          fill="url(#landing-line-fill)"
          className="transition-opacity duration-1000 delay-700 motion-reduce:transition-none"
          style={{ opacity: seen ? 1 : 0 }}
        />
        <path
          d={path}
          pathLength={1}
          fill="none"
          stroke="rgb(20 184 166)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="transition-[stroke-dashoffset] duration-[1600ms] ease-out motion-reduce:transition-none"
          style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1 }}
        />
      </svg>
      <div className="relative -mt-32 h-32 pointer-events-none">
        {coords.map((c, i) => (
          <span
            key={i}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500 ring-2 ring-background transition-all duration-500 motion-reduce:transition-none"
            style={{
              left: `${c.x}%`,
              top: `${(c.y / 50) * 100}%`,
              opacity: seen ? 1 : 0,
              transform: `translate(-50%, -50%) scale(${seen ? 1 : 0})`,
              transitionDelay: `${300 + i * 170}ms`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

// ----- Family: rows slide in one by one -----
export function FamilyVisual() {
  const people = [
    { name: "John", amt: "8,500", color: "bg-teal-500" },
    { name: "Charlie", amt: "12,200", color: "bg-teal-400" },
    { name: "Dave", amt: "6,800", color: "bg-teal-500" },
    { name: "Alice", amt: "9,100", color: "bg-teal-400" },
  ];
  return (
    <div className="space-y-2 p-6">
      <div className="mb-3 text-xs text-muted-foreground">Pocket Money — May 2026</div>
      {people.map((p, i) => (
        <Reveal key={p.name} delay={i * 110}>
          <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/40 px-3 py-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white ${p.color}`}>
              {p.name[0]}
            </div>
            <div className="flex-1 text-sm font-medium">{p.name}</div>
            <div className="text-sm tabular-nums text-muted-foreground">{p.amt}</div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
