import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const TEAL = "oklch(0.6 0.118 184.704)";
const SKY = "oklch(0.72 0.15 230)";
const EMERALD = "oklch(0.67 0.17 152)";

function Blob({ color, className }: { color: string; className: string }) {
  return (
    <div
      className={cn(
        "absolute rounded-full [--blob:22%] dark:[--blob:30%] will-change-transform",
        className,
      )}
      style={
        {
          background: `radial-gradient(closest-side, color-mix(in oklab, ${color} var(--blob), transparent), transparent)`,
        } as CSSProperties
      }
    />
  );
}

/** Slowly drifting colour fields behind the page. Glass surfaces need
 *  something behind them to frost, and these give them something that moves. */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Blob
        color={TEAL}
        className="-left-[15%] -top-[20%] h-[75vh] w-[85vw] max-w-[1000px] motion-safe:animate-drift-a"
      />
      <Blob
        color={SKY}
        className="-right-[20%] top-[18%] h-[70vh] w-[70vw] max-w-[900px] opacity-70 motion-safe:animate-drift-b"
      />
      <Blob
        color={EMERALD}
        className="-bottom-[25%] left-[5%] h-[70vh] w-[80vw] max-w-[1000px] opacity-60 motion-safe:animate-drift-a"
      />
    </div>
  );
}
