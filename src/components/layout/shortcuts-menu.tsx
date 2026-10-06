import { Keyboard } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { shortcutsForPath } from "@/lib/shortcuts/shortcut-catalog";

/** Desktop-only keyboard-shortcut cheat sheet in the top bar. It lists the
 *  current page's shortcuts first. Also opened with the ? key. */
export function ShortcutsMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pathname } = useLocation();
  const groups = shortcutsForPath(pathname);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="hidden h-9 w-9 md:inline-flex">
          <Keyboard className="h-4 w-4" />
          <span className="sr-only">Keyboard shortcuts</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        {groups.map((group) => (
          <section key={group.heading}>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.heading}
            </h2>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span>{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="min-w-6 rounded border border-border bg-muted px-1.5 py-0.5 text-center font-mono text-xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </PopoverContent>
    </Popover>
  );
}
