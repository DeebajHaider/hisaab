import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Tooltip } from "@/components/ui/tooltip"

/** A password field with a button that reveals what has been typed. */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-9", className)} />
      <Tooltip content={visible ? "Hide password" : "Show password"}>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        >
          <Icon className="h-4 w-4" aria-hidden />
        </button>
      </Tooltip>
    </div>
  )
}

export { PasswordInput }
