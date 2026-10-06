import { useCallback, useEffect, useState } from "react";

/** The non-standard event Chromium fires when the app can be installed. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Lets the app offer its own "Install" action. Only browsers that fire
 * beforeinstallprompt (Chrome, Edge, Android) can; elsewhere `canInstall` stays
 * false and nothing is shown. Safari users use Share, Add to Home Screen.
 */
export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null); // a prompt event can only be used once
  }, [event]);

  return { canInstall: event !== null, install };
}
