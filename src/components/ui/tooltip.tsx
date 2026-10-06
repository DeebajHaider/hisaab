import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * A hover/focus label for a control. Brings its own provider so it works
 * anywhere, and (being hover-driven) never appears on touch screens.
 */
function Tooltip({
  content,
  children,
  side = "bottom",
  delayDuration = 350,
}: {
  content: React.ReactNode
  /** The trigger element; it keeps its own semantics (rendered with asChild). */
  children: React.ReactElement
  side?: "top" | "right" | "bottom" | "left"
  delayDuration?: number
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-50 max-w-xs rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export { Tooltip }
