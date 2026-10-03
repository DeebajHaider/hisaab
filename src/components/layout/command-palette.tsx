import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  CalendarRange,
  Coins,
  Monitor,
  Moon,
  Plus,
  Receipt,
  Settings,
  SlidersHorizontal,
  Sun,
  Target,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Command,
} from "@/components/ui/command";
import { useTheme } from "@/lib/theme-provider";
import { todayISO } from "@/lib/format/date";
import { useBudgets } from "@/queries/use-budgets";
import { usePortfolios } from "@/queries/use-portfolios";
import {
  resolveShortcut,
  type ShortcutAction,
} from "@/lib/shortcuts/resolve-shortcut";

const SEQUENCE_TIMEOUT_MS = 1500;

function isTypingContext(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return !!el.closest('[role="dialog"], [role="listbox"], [role="combobox"], [role="menu"]');
}

/** Global keyboard shortcuts plus the Ctrl/Cmd+K palette. Mounted once in AppLayout. */
export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const budgetMatch = useMatch("/app/budgets/:budgetId/*");
  const budgetId = budgetMatch?.params.budgetId;
  const pendingG = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const focusNewTransaction = useCallback(() => {
    const focus = () => {
      const input = document.querySelector<HTMLElement>("[data-entry-search]");
      if (!input) return false;
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus({ preventScroll: true });
      return true;
    };
    if (focus() || !budgetId) return;
    navigate(`/app/budgets/${budgetId}/day/${todayISO()}`);
    // The Day view is a lazy chunk and the form waits on data, so retry briefly.
    const startedAt = Date.now();
    const retry = () => {
      if (focus() || Date.now() - startedAt > 3000) return;
      requestAnimationFrame(retry);
    };
    requestAnimationFrame(retry);
  }, [budgetId, navigate]);

  const run = useCallback(
    (action: ShortcutAction) => {
      if (action === "palette") return setOpen((o) => !o);
      if (action === "new") return focusNewTransaction();
      if (!budgetId) return;
      const base = `/app/budgets/${budgetId}`;
      const paths: Record<string, string> = {
        "go:day": `${base}/day/${todayISO()}`,
        "go:month": `${base}/month`,
        "go:ledger": `${base}/ledger`,
        "go:trends": `${base}/trends`,
        "go:settings": `${base}/settings`,
      };
      navigate(paths[action]);
    },
    [budgetId, focusNewTransaction, navigate],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const result = resolveShortcut(pendingG.current, e);
      const typing = isTypingContext(document.activeElement);

      // Only the palette shortcut works while typing or inside a dialog.
      if (typing && result.action !== "palette") {
        pendingG.current = false;
        return;
      }

      pendingG.current = result.pendingG;
      clearTimeout(gTimer.current);
      if (result.pendingG) {
        gTimer.current = setTimeout(() => (pendingG.current = false), SEQUENCE_TIMEOUT_MS);
      }
      if (result.preventDefault) e.preventDefault();
      if (result.action) run(result.action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(gTimer.current);
    };
  }, [run]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="sm:max-w-lg">
      {open && (
        <PaletteContent
          budgetId={budgetId}
          onGo={go}
          onNew={() => {
            setOpen(false);
            // Wait for the dialog to release focus before taking it.
            setTimeout(focusNewTransaction, 50);
          }}
        />
      )}
    </CommandDialog>
  );
}

function Row({ icon, children, hint }: { icon: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <>
      {icon}
      <span className="truncate">{children}</span>
      {hint && <CommandShortcut>{hint}</CommandShortcut>}
    </>
  );
}

function PaletteContent({
  budgetId,
  onGo,
  onNew,
}: {
  budgetId: string | undefined;
  onGo: (path: string) => void;
  onNew: () => void;
}) {
  const { setTheme } = useTheme();
  const budgets = useBudgets().data ?? [];
  const portfolios = usePortfolios().data ?? [];
  const base = budgetId ? `/app/budgets/${budgetId}` : null;
  const currentBudget = budgets.find((b) => b.id === budgetId);

  return (
    <Command className="bg-transparent">
      <CommandInput placeholder="Jump to a page, budget or portfolio…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>

        {base && (
          <>
            <CommandGroup heading={currentBudget ? currentBudget.name : "This budget"}>
              <CommandItem value="new transaction add log" onSelect={onNew}>
                <Row icon={<Plus />} hint="N">New transaction</Row>
              </CommandItem>
              <CommandItem value="day view today" onSelect={() => onGo(`${base}/day/${todayISO()}`)}>
                <Row icon={<Calendar />} hint="G D">Day view</Row>
              </CommandItem>
              <CommandItem value="month" onSelect={() => onGo(`${base}/month`)}>
                <Row icon={<CalendarRange />} hint="G M">Month</Row>
              </CommandItem>
              <CommandItem value="ledger statement" onSelect={() => onGo(`${base}/ledger`)}>
                <Row icon={<Receipt />} hint="G L">Ledger</Row>
              </CommandItem>
              <CommandItem value="targets goals" onSelect={() => onGo(`${base}/targets`)}>
                <Row icon={<Target />}>Targets</Row>
              </CommandItem>
              <CommandItem value="trends charts" onSelect={() => onGo(`${base}/trends`)}>
                <Row icon={<TrendingUp />} hint="G T">Trends</Row>
              </CommandItem>
              <CommandItem value="members invite" onSelect={() => onGo(`${base}/members`)}>
                <Row icon={<Users />}>Members</Row>
              </CommandItem>
              <CommandItem value="manage categories items people" onSelect={() => onGo(`${base}/manage`)}>
                <Row icon={<Settings />}>Manage</Row>
              </CommandItem>
              <CommandItem value="budget settings" onSelect={() => onGo(`${base}/settings`)}>
                <Row icon={<SlidersHorizontal />} hint="G S">Budget settings</Row>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Budgets">
          <CommandItem value="all budgets home" onSelect={() => onGo("/app")}>
            <Row icon={<Wallet />}>All budgets</Row>
          </CommandItem>
          {budgets
            .filter((b) => b.id !== budgetId)
            .map((b) => (
              <CommandItem
                key={b.id}
                value={`budget ${b.name}`}
                onSelect={() => onGo(`/app/budgets/${b.id}/day/${todayISO()}`)}
              >
                <Row icon={<Briefcase />}>{b.name}</Row>
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandGroup heading="Portfolio">
          <CommandItem value="portfolios home" onSelect={() => onGo("/app/portfolio")}>
            <Row icon={<Coins />}>All portfolios</Row>
          </CommandItem>
          {portfolios.map((p) => (
            <CommandItem
              key={p.id}
              value={`portfolio ${p.name}`}
              onSelect={() => onGo(`/app/portfolio/${p.id}/overview`)}
            >
              <Row icon={<Coins />}>{p.name}</Row>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="App">
          <CommandItem value="account settings profile" onSelect={() => onGo("/app/settings")}>
            <Row icon={<UserCog />}>Account settings</Row>
          </CommandItem>
          <CommandItem value="theme light" onSelect={() => setTheme("light")}>
            <Row icon={<Sun />}>Light theme</Row>
          </CommandItem>
          <CommandItem value="theme dark" onSelect={() => setTheme("dark")}>
            <Row icon={<Moon />}>Dark theme</Row>
          </CommandItem>
          <CommandItem value="theme system" onSelect={() => setTheme("system")}>
            <Row icon={<Monitor />}>System theme</Row>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
