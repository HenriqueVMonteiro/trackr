import Link from "next/link";
import type { ReactNode } from "react";
import {
  BellIcon,
  BookIcon,
  DashboardIcon,
  IterationsIcon,
  LogoIcon,
  PlusIcon,
  ProjectIcon,
} from "./icons";

type Crumb = { label: string; href?: string };
type TabIcon = "projects" | "dashboard" | "sprints";
type Tab = { label: string; icon?: TabIcon; href: string; active?: boolean; count?: number };

function Header({ userName }: { userName?: string }) {
  return (
    <header className="gh-header">
      <div className="gh-header-inner">
        <Link
          className="flex items-center gap-2 font-bold text-base text-white no-underline hover:no-underline"
          href="/trackr"
        >
          <LogoIcon size={28} />
          <span>Trackr</span>
        </Link>
        <form className="gh-search" action="/trackr" method="get">
          <input type="text" name="q" placeholder="Search Trackr…" aria-label="Search" />
        </form>
        <div className="flex-1" />
        <div className="flex items-center gap-3.5 text-white/70">
          <Link
            href="/trackr/projects/trackr/issues/new"
            title="New issue"
            className="p-1 rounded hover:bg-white/10 hover:text-white inline-flex"
          >
            <PlusIcon size={16} />
          </Link>
          <Link
            href="/trackr"
            title="Notifications"
            className="p-1 rounded hover:bg-white/10 hover:text-white inline-flex"
          >
            <BellIcon size={16} />
          </Link>
          {userName && (
            <div
              title={userName}
              className="w-6 h-6 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-semibold"
            >
              {userName[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ContextBar({ crumbs, tabs }: { crumbs: Crumb[]; tabs?: Tab[] }) {
  return (
    <div className="ctx-bar">
      <div className="ctx-bar-inner">
        <div className="flex items-center gap-2 text-base mb-3.5">
          <span className="text-fg-muted text-[color:var(--color-fg-muted)]">
            <BookIcon size={16} />
          </span>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[color:var(--color-fg-subtle)] font-light">/</span>}
              {c.href ? (
                <Link className="text-[color:var(--color-accent-fg)] font-normal" href={c.href}>
                  {c.label}
                </Link>
              ) : (
                <span className="font-semibold text-[color:var(--color-fg-default)]">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </div>
        {tabs && tabs.length > 0 && (
          <nav className="flex gap-1">
            {tabs.map((t, i) => (
              <Link key={i} href={t.href} className={`ctx-tab${t.active ? " active" : ""}`}>
                {t.icon === "projects" && (
                  <span className="text-[color:var(--color-fg-muted)]">
                    <ProjectIcon size={16} />
                  </span>
                )}
                {t.icon === "dashboard" && (
                  <span className="text-[color:var(--color-fg-muted)]">
                    <DashboardIcon size={16} />
                  </span>
                )}
                {t.icon === "sprints" && (
                  <span className="text-[color:var(--color-fg-muted)]">
                    <IterationsIcon size={16} />
                  </span>
                )}
                <span>{t.label}</span>
                {t.count != null && <span className="counter">{t.count}</span>}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

export function Layout({
  children,
  crumbs,
  tabs,
  userName,
  wide,
}: {
  children: ReactNode;
  crumbs?: Crumb[];
  tabs?: Tab[];
  userName?: string;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header userName={userName} />
      {crumbs && <ContextBar crumbs={crumbs} tabs={tabs} />}
      <main>
        <div
          className="mx-auto px-6 pt-6 pb-16"
          style={{ maxWidth: wide ? 1400 : 1280, width: "100%" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

export function workspaceTabs(workspaceSlug: string, active: "projects" | "dashboard" | "sprints"): Tab[] {
  return [
    { label: "Projects", icon: "projects", href: `/${workspaceSlug}`, active: active === "projects" },
    { label: "Dashboard", icon: "dashboard", href: `/${workspaceSlug}/dashboard`, active: active === "dashboard" },
    { label: "Sprints", icon: "sprints", href: `/${workspaceSlug}/sprints`, active: active === "sprints" },
  ];
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`status-pill status-${status}`}>
      <span className="dot" />
      {status.replace("_", " ")}
    </span>
  );
}
