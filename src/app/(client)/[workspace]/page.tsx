import Link from "next/link";
import { Layout, workspaceTabs } from "@/components/Shell";
import { DashboardIcon, IssueClosedIcon, IssueOpenedIcon, PlusIcon } from "@/components/icons";
import { store } from "@/lib/demo-store";
import { relative, statusGroup } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const workspace = store.workspace();
  const projects = store.projects();
  const team = store.team();
  const issues = store.issues();
  const allOpen = issues.filter((i) => statusGroup(i.status) === "open").length;

  return (
    <Layout
      crumbs={[{ label: workspace.name }]}
      tabs={workspaceTabs(workspace.slug, "projects")}
      userName="Henrique"
    >
      <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold mb-1.5">{workspace.name}</h1>
          <p className="muted max-w-xl">{workspace.description}</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-sm" href={`/${workspace.slug}/dashboard`}>
            <DashboardIcon size={15} />
            Dashboard
          </Link>
          <Link className="btn btn-sm" href={`/${workspace.slug}/projects/new`}>
            <PlusIcon size={15} />
            New project
          </Link>
          <Link
            className="btn btn-sm btn-primary"
            href={`/${workspace.slug}/projects/${projects[0]?.slug ?? "trackr"}/issues/new`}
          >
            <PlusIcon size={15} />
            New issue
          </Link>
        </div>
      </div>

      <div className="grid gap-8 items-start" style={{ gridTemplateColumns: "1fr 296px" }}>
        <div>
          <div
            className="flex justify-between pb-2"
            style={{ borderBottom: "1px solid var(--color-border-default)" }}
          >
            <h2 className="text-base font-semibold">
              Projects <span className="counter">{projects.length}</span>
            </h2>
          </div>
          {projects.map((p) => {
            const projIssues = store.issuesForProject(p.slug);
            const open = projIssues.filter((i) => statusGroup(i.status) === "open").length;
            const done = projIssues.filter((i) => i.status === "done").length;
            const lastUpdated = projIssues
              .map((i) => i.updatedAt)
              .sort()
              .reverse()[0];
            return (
              <div className="repo-row" key={p.slug}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="lang-dot" style={{ background: p.color }} />
                    <Link href={`/${workspace.slug}/projects/${p.slug}`} className="repo-name">
                      {p.name}
                    </Link>
                    <span className="counter">{p.key}</span>
                  </div>
                  <div className="muted mb-3 max-w-xl">{p.description}</div>
                  <div className="flex gap-4 text-xs muted">
                    <span className="flex items-center gap-1">
                      <IssueOpenedIcon size={14} />
                      {open} open
                    </span>
                    <span className="flex items-center gap-1">
                      <IssueClosedIcon size={14} />
                      {done} done
                    </span>
                    {lastUpdated && <span>Updated {relative(lastUpdated)}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link className="btn btn-sm" href={`/${workspace.slug}/projects/${p.slug}`}>
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <aside>
          <div className="side-section" style={{ paddingTop: 0 }}>
            <div className="side-head">ABOUT</div>
            <div className="text-[13px] leading-6">
              Monolito modular · Clean Architecture · 358 testes verde · 9 ADRs · padrões GoF:
              State, Composite, Memento, Observer, Adapter, Factory Method, Strategy, Decorator.
            </div>
          </div>
          <div className="side-section">
            <div className="side-head">TEAM</div>
            <div className="flex flex-col gap-3">
              {team.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[color:var(--color-canvas-subtle)] border border-[color:var(--color-border-default)] flex items-center justify-center text-xs font-semibold">
                    {m.name[0]}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold">{m.name}</div>
                    <div className="muted text-xs">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="side-section">
            <div className="side-head">AT A GLANCE</div>
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <span className="muted">Open issues</span>
                <span className="font-semibold">{allOpen}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Projects</span>
                <span className="font-semibold">{projects.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Active sprint</span>
                <Link href={`/${workspace.slug}/sprints`}>Sprint 6</Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
