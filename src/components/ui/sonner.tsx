import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/lib/theme-provider";

/**
 * App-wide toast container. Mounted once at the app root in App.tsx.
 *
 * - Position: top-right. Bottom positions would overlap the day-view entry
 *   form on small screens.
 * - Duration: 4s for success, 6s for errors — errors deserve a moment longer.
 * - Theme: read from our ThemeProvider so dark-mode toasts work without a
 *   second source of truth. Sonner accepts "light" | "dark" | "system".
 */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme as "light" | "dark" | "system"}
      position="top-right"
      duration={4000}
      toastOptions={{
        // Errors override the default duration via the second arg to
        // toast.error(); this is just the floor for success/info.
        classNames: {
          // Use semantic tokens so the toasts always blend with the theme.
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      richColors
    />
  );
}
