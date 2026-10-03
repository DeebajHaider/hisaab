import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();

/** Shown while the browser is offline. Uses the same online state TanStack
 *  Query uses to pause saves, so the message matches what actually happens:
 *  changes wait in this tab and go through on reconnect. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true);
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-t border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You're offline. Changes will save when you reconnect, so keep this tab open.</span>
    </div>
  );
}
