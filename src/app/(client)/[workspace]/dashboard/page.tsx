import { Layout, workspaceTabs } from "@/components/Shell";
import { issues, sprints, statusGroup, workspace } from "@/lib/demo";

interface Props {
  params: Promise<{ workspace: string }>;
}

export default async function DashboardPage({ params }: Props) {
  await params;
  const open = issues.filter((i) => statusGroup(i.status) === "open").length;
  const closed = issues.length - open;
  const dist: Record<string, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    canceled: 0,
  };
  issues.forEach((i) => (dist[i.status] = (dist[i.status] ?? 0) + 1));
  const activeSprint = sprints.find((s) => s.status === "active");

  return (
    <Layout
      crumbs={[
        { label: workspace.name, href: `/${workspace.slug}` },
        { label: "Dashboard" },
      ]}
      tabs={workspaceTabs(workspace.slug, "dashboard")}
      userName="Henrique"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1.5">Dashboard</h1>
        <p className="muted">
          Insights agregados via{" "}
          <code className="font-mono text-xs">/api/v1/projects/&lt;id&gt;/reports/*</code>{" "}
          (cycle time, throughput, status distribution) e{" "}
          <code className="font-mono text-xs">/api/v1/sprints/&lt;id&gt;/{`{velocity,burndown}`}</code>.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="Open issues" value={open} />
        <Stat label="Closed issues" value={closed} />
        <Stat label="Active sprint" value={activeSprint?.name ?? "—"} small />
        <Stat
          label="Velocity (S5 → S6)"
          value={`${sprints[0]?.completed}/${sprints[0]?.committed} → ${activeSprint?.completed}/${activeSprint?.committed}`}
          small
        />
      </div>

      {/* status distribution */}
      <div className="box p-4 mb-6">
        <div className="text-sm font-semibold mb-3">Issues by status</div>
        <div
          className="mini-bar mb-3"
          style={{ height: 10, background: "var(--color-neutral-subtle)" }}
        >
          {(["done", "in_review", "in_progress", "todo", "backlog", "canceled"] as const).map(
            (s) =>
              dist[s] ? (
                <span
                  key={s}
                  title={`${s}: ${dist[s]}`}
                  style={{
                    width: `${((dist[s] ?? 0) / issues.length) * 100}%`,
                    background: `var(--color-st-${s.replace("_", "-")})`,
                  }}
                />
              ) : null,
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {(Object.keys(dist) as Array<keyof typeof dist>).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: `var(--color-st-${s.replace("_", "-")})` }}
              />
              <span className="muted capitalize">{s.replace("_", " ")}</span>
              <span className="font-semibold">{dist[s]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* burndown text */}
      <div className="grid grid-cols-2 gap-4">
        <div className="box p-4">
          <div className="text-sm font-semibold mb-2">Cycle time (rolling)</div>
          <div className="text-3xl font-semibold mb-1">3.2 dias</div>
          <div className="muted text-xs">avg · p50 2.5d · p90 6.8d · sample 11</div>
          <div
            className="mt-3 pt-3 muted text-xs"
            style={{ borderTop: "1px solid var(--color-border-muted)" }}
          >
            Fonte: <code className="font-mono">DrizzleReportReader.getProjectCycleTime</code> com{" "}
            <code className="font-mono">PERCENTILE_CONT</code> em Postgres.
          </div>
        </div>
        <div className="box p-4">
          <div className="text-sm font-semibold mb-2">Throughput (últimas 4 semanas)</div>
          <div className="flex items-end gap-2 h-24">
            {[3, 5, 4, 7].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${v * 12}px`,
                    background: "var(--color-success-emphasis)",
                  }}
                  title={`Semana ${i + 1}: ${v}`}
                />
                <div className="muted text-xs mt-1">W{i + 1}</div>
              </div>
            ))}
          </div>
          <div
            className="mt-3 pt-3 muted text-xs"
            style={{ borderTop: "1px solid var(--color-border-muted)" }}
          >
            Fonte: <code className="font-mono">getProjectThroughput</code> · bucketed por semana.
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Stat({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="box p-4">
      <div className="muted text-xs uppercase tracking-wide">{label}</div>
      <div className={small ? "text-base font-semibold mt-2" : "text-3xl font-semibold mt-2"}>
        {value}
      </div>
    </div>
  );
}
