import { Layout, workspaceTabs } from "@/components/Shell";
import { getDashboardPageData, statusGroup } from "@/app/(client)/_data";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ workspace: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { workspace: workspaceSlug } = await params;
  const { user, workspace, issues, sprints } = await getDashboardPageData(workspaceSlug);
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

  // Cycle time: average days between createdAt and closedAt for done issues
  const doneWithTime = issues.filter((i) => i.status === "done" && i.closedAt);
  const cycleTimes = doneWithTime.map(
    (i) => (new Date(i.closedAt!).getTime() - new Date(i.createdAt).getTime()) / 86_400_000,
  );
  const avgCycle =
    cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : 0;
  const sorted = [...cycleTimes].sort((a, b) => a - b);
  const p50 = sorted.length > 0 ? (sorted[Math.floor(sorted.length / 2)] ?? 0) : 0;
  const p90 = sorted.length > 0 ? (sorted[Math.floor(sorted.length * 0.9)] ?? sorted[sorted.length - 1] ?? 0) : 0;

  // Throughput: issues closed per week for the last 4 weeks
  const NOW = Date.now();
  const WEEK = 7 * 86_400_000;
  const buckets = [0, 0, 0, 0];
  issues.forEach((i) => {
    if (!i.closedAt) return;
    const ageWeeks = Math.floor((NOW - new Date(i.closedAt).getTime()) / WEEK);
    if (ageWeeks >= 0 && ageWeeks < 4) buckets[3 - ageWeeks] = (buckets[3 - ageWeeks] ?? 0) + 1;
  });
  const maxBucket = Math.max(...buckets, 1);

  return (
    <Layout
      crumbs={[
        { label: workspace.name, href: `/${workspace.slug}` },
        { label: "Dashboard" },
      ]}
      tabs={workspaceTabs(workspace.slug, "dashboard")}
      userName={user.name}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1.5">Dashboard</h1>
        <p className="muted">
          Métricas calculadas em tempo real a partir das issues do workspace. Em produção, as
          mesmas seriam servidas pelos endpoints{" "}
          <code className="font-mono text-xs">/api/v1/projects/&lt;id&gt;/reports/*</code> e{" "}
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
                    width: `${((dist[s] ?? 0) / Math.max(issues.length, 1)) * 100}%`,
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

      {/* cycle time + throughput */}
      <div className="grid grid-cols-2 gap-4">
        <div className="box p-4">
          <div className="text-sm font-semibold mb-2">Cycle time (rolling)</div>
          <div className="text-3xl font-semibold mb-1">{avgCycle.toFixed(1)} dias</div>
          <div className="muted text-xs">
            avg · p50 {p50.toFixed(1)}d · p90 {p90.toFixed(1)}d · sample {doneWithTime.length}
          </div>
          <div
            className="mt-3 pt-3 muted text-xs"
            style={{ borderTop: "1px solid var(--color-border-muted)" }}
          >
            Fonte: <code className="font-mono">DrizzleReportReader.getProjectCycleTime</code>{" "}
            usaria <code className="font-mono">PERCENTILE_CONT</code> em Postgres; aqui calculado
            in-memory.
          </div>
        </div>
        <div className="box p-4">
          <div className="text-sm font-semibold mb-2">Throughput (últimas 4 semanas)</div>
          <div className="flex items-end gap-2 h-24">
            {buckets.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${(v / maxBucket) * 80 + 4}px`,
                    background:
                      v > 0
                        ? "var(--color-success-emphasis)"
                        : "var(--color-neutral-muted)",
                  }}
                  title={`Semana ${i + 1}: ${v}`}
                />
                <div className="muted text-xs mt-1">W{i + 1}</div>
                <div className="muted text-xs">{v}</div>
              </div>
            ))}
          </div>
          <div
            className="mt-3 pt-3 muted text-xs"
            style={{ borderTop: "1px solid var(--color-border-muted)" }}
          >
            Fonte: <code className="font-mono">getProjectThroughput</code> — bucketed por semana
            via <code className="font-mono">date_trunc(&apos;week&apos;, closed_at)</code>.
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
