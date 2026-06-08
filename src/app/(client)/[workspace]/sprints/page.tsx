import Link from "next/link";
import { Layout, workspaceTabs } from "@/components/Shell";
import { IterationsIcon, PlusIcon } from "@/components/icons";
import { getSprintsPageData } from "@/app/(client)/_data";
import { closeSprintAction, startSprintAction } from "@/app/(client)/_actions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ workspace: string }>;
}

export default async function SprintsPage({ params }: Props) {
  const { workspace: workspaceSlug } = await params;
  const { user, workspace, sprints, issues } = await getSprintsPageData(workspaceSlug);

  return (
    <Layout
      crumbs={[
        { label: workspace.name, href: `/${workspace.slug}` },
        { label: "Sprints" },
      ]}
      tabs={workspaceTabs(workspace.slug, "sprints")}
      userName={user.name}
    >
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1.5">Sprints</h1>
          <p className="muted">
            Ciclos de trabalho. Velocity e burndown servidos pelos endpoints{" "}
            <code className="font-mono text-xs">/api/v1/sprints/&lt;id&gt;/velocity</code> e{" "}
            <code className="font-mono text-xs">/burndown</code>.
          </p>
        </div>
        <Link href={`/${workspace.slug}/sprints/new`} className="btn btn-sm btn-primary">
          <PlusIcon size={15} />
          New sprint
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {sprints.map((s) => {
          const pct = Math.round((s.completed / Math.max(s.committed, 1)) * 100);
          const statusClass =
            s.status === "active"
              ? "status-in_progress"
              : s.status === "closed"
                ? "status-done"
                : "status-backlog";
          return (
            <div key={s.id} className="box p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <IterationsIcon size={16} />
                    {s.name}
                    <span className={`status-pill ${statusClass}`}>
                      <span className="dot" />
                      {s.status}
                    </span>
                  </h2>
                  <div className="muted text-xs mt-1">
                    {new Date(s.startDate).toLocaleDateString("pt-BR")} →{" "}
                    {new Date(s.endDate).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {s.status === "planned" && (
                    <form action={startSprintAction}>
                      <input type="hidden" name="sprintId" value={s.id} />
                      <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                      <button type="submit" className="btn btn-sm btn-primary">
                        Start sprint
                      </button>
                    </form>
                  )}
                  {s.status === "active" && (
                    <form action={closeSprintAction}>
                      <input type="hidden" name="sprintId" value={s.id} />
                      <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                      <button type="submit" className="btn btn-sm">
                        Close sprint
                      </button>
                    </form>
                  )}
                  <div className="text-right">
                    <div className="text-2xl font-semibold">
                      {s.completed}
                      <span className="muted text-base">/{s.committed}</span>
                    </div>
                    <div className="muted text-xs">issues completed</div>
                  </div>
                </div>
              </div>
              <div
                className="mini-bar"
                style={{ background: "var(--color-neutral-subtle)" }}
              >
                <span
                  style={{
                    width: `${pct}%`,
                    background:
                      s.status === "closed"
                        ? "var(--color-success-emphasis)"
                        : "var(--color-accent-emphasis)",
                  }}
                />
              </div>
              <div className="muted text-xs mt-2">{pct}% complete</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-3">Issues no sprint ativo</h3>
        <div className="box overflow-hidden">
          {issues.slice(0, 5).map((i) => (
            <div
              key={i.id}
              className="px-4 py-3 flex items-center gap-3 text-sm"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <span className={`status-pill status-${i.status}`}>
                <span className="dot" />
                {i.status.replace("_", " ")}
              </span>
              <span className="flex-1 font-medium">{i.title}</span>
              <span className="muted text-xs">#{i.number}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
