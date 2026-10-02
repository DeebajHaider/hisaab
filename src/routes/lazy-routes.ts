import { lazy, type ComponentType } from "react";

// Every page is its own chunk so the first load only downloads the shell
// plus the page actually being opened.
const loaders = {
  landing: () => import("@/routes/landing"),
  auth: () => import("@/routes/auth"),
  inviteAccept: () => import("@/routes/invite-accept"),
  notFound: () => import("@/routes/not-found"),
  budgetsHome: () => import("@/routes/budgets-home"),
  settings: () => import("@/routes/settings"),
  dayView: () => import("@/routes/day-view"),
  monthView: () => import("@/routes/month-view"),
  ledger: () => import("@/routes/ledger"),
  targets: () => import("@/routes/targets"),
  trends: () => import("@/routes/trends"),
  members: () => import("@/routes/members"),
  manage: () => import("@/routes/manage"),
  budgetSettings: () => import("@/routes/budget-settings"),
  portfoliosHome: () => import("@/routes/portfolios-home"),
  portfolioOverview: () => import("@/routes/portfolio-overview"),
  portfolioHoldings: () => import("@/routes/portfolio-holdings"),
  portfolioManage: () => import("@/routes/portfolio-manage"),
};

function lazyRoute<K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  name: K,
) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

export const Landing = lazyRoute(loaders.landing, "Landing");
export const AuthPage = lazyRoute(loaders.auth, "AuthPage");
export const InviteAccept = lazyRoute(loaders.inviteAccept, "InviteAccept");
export const NotFound = lazyRoute(loaders.notFound, "NotFound");
export const BudgetsHome = lazyRoute(loaders.budgetsHome, "BudgetsHome");
export const Settings = lazyRoute(loaders.settings, "Settings");
export const DayView = lazyRoute(loaders.dayView, "DayView");
export const MonthView = lazyRoute(loaders.monthView, "MonthView");
export const Ledger = lazyRoute(loaders.ledger, "Ledger");
export const Targets = lazyRoute(loaders.targets, "Targets");
export const Trends = lazyRoute(loaders.trends, "Trends");
export const Members = lazyRoute(loaders.members, "Members");
export const Manage = lazyRoute(loaders.manage, "Manage");
export const BudgetSettings = lazyRoute(loaders.budgetSettings, "BudgetSettings");
export const PortfoliosHome = lazyRoute(loaders.portfoliosHome, "PortfoliosHome");
export const PortfolioOverview = lazyRoute(loaders.portfolioOverview, "PortfolioOverview");
export const PortfolioHoldings = lazyRoute(loaders.portfolioHoldings, "PortfolioHoldings");
export const PortfolioManage = lazyRoute(loaders.portfolioManage, "PortfolioManage");

const inAppRoutes = [
  loaders.dayView,
  loaders.budgetsHome,
  loaders.monthView,
  loaders.ledger,
  loaders.targets,
  loaders.manage,
  loaders.trends,
  loaders.members,
  loaders.budgetSettings,
  loaders.settings,
  loaders.portfoliosHome,
  loaders.portfolioOverview,
  loaders.portfolioHoldings,
  loaders.portfolioManage,
];

let prefetched = false;

/** Warm the in-app page chunks once the browser is idle, so navigation
 *  after the first load never waits on a download. */
export function prefetchAppRoutes() {
  if (prefetched) return;
  prefetched = true;
  const run = () => inAppRoutes.forEach((load) => void load().catch(() => {}));
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}
