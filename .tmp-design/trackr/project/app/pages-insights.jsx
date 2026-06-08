/* Trackr pages: Dashboard + Sprints. Exposed on window.PageDashboard, window.PageSprints */
(function () {
  const React = window.React;
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.TrackrData;
  const UI = window.UI;
  const Shell = window.Shell;
  const h = React.createElement;
  const useStore = window.useStore;

  const SCOPES = [
    { id: "all", label: "All projects" },
    { id: "core-domain", label: "Core Domain" },
    { id: "platform", label: "Platform & Infra" },
    { id: "client-ui", label: "Client UI" },
  ];

  function liveDistribution(store, scope) {
    const pool = scope === "all" ? store.issues : store.issuesForProject(scope);
    const counts = { backlog: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, canceled: 0 };
    pool.forEach((i) => (counts[i.status] += 1));
    return { counts, total: pool.length };
  }

  // ---------- Dashboard ----------
  function StatCard({ icon, label, value, sub, color }) {
    return h(
      "div",
      { className: "stat-card" },
      h("div", { className: "stat-label" }, icon ? h(Icon[icon], { size: 15, color: "var(--fg-muted)" }) : null, label),
      h("div", { className: "stat-value", style: color ? { color } : null }, value),
      sub ? h("div", { className: "stat-sub" }, sub) : null,
    );
  }

  function ThroughputChart({ data }) {
    const max = Math.max(...data.map((d) => d.closed + d.canceled), 1);
    return h(
      "div",
      { className: "box" },
      h("div", { className: "box-header row between" }, h("span", null, "Throughput (issues closed / week)"), h("span", { className: "muted fs-12 row gap-12", style: { fontWeight: 400 } }, h("span", { className: "row gap-4" }, h("span", { style: { width: 10, height: 10, borderRadius: 2, background: "var(--st-done)" } }), "Done"), h("span", { className: "row gap-4" }, h("span", { style: { width: 10, height: 10, borderRadius: 2, background: "var(--st-canceled)" } }), "Canceled"))),
      h(
        "div",
        { style: { padding: "20px 16px" } },
        h(
          "div",
          { className: "chart-bars", style: { paddingLeft: 8 } },
          data.map((d, i) =>
            h(
              "div",
              { key: i, className: "chart-col" },
              h(
                "div",
                { className: "col items-center", style: { justifyContent: "flex-end", height: 180, gap: 2 } },
                h("div", { className: "fs-12 fw-600", style: { color: "var(--fg-muted)" } }, d.closed + d.canceled || ""),
                d.canceled ? h("div", { style: { width: 38, height: (d.canceled / max) * 150, background: "var(--st-canceled)", borderRadius: "3px 3px 0 0" } }) : null,
                h("div", { style: { width: 38, height: (d.closed / max) * 150, background: "var(--st-done)", borderRadius: d.canceled ? 0 : "3px 3px 0 0" } }),
              ),
              h("div", { className: "muted fs-12" }, d.week),
            ),
          ),
        ),
      ),
    );
  }

  function StatusDistribution({ dist }) {
    const order = ["backlog", "todo", "in_progress", "in_review", "done", "canceled"];
    const total = dist.total || 1;
    return h(
      "div",
      { className: "box" },
      h("div", { className: "box-header" }, "Status distribution"),
      h(
        "div",
        { style: { padding: 16 } },
        h(
          "div",
          { className: "mini-bar", style: { height: 12, marginBottom: 16 } },
          order.map((s) => (dist.counts[s] ? h("span", { key: s, style: { width: (dist.counts[s] / total) * 100 + "%", background: D.STATUS_META[s].hue } }) : null)),
        ),
        h(
          "div",
          { className: "col gap-8" },
          order.map((s) =>
            h(
              "div",
              { key: s, className: "row between fs-13" },
              h("span", { className: "row gap-8" }, h(UI.StatusIcon, { status: s, size: 14 }), D.STATUS_META[s].label),
              h("span", { className: "row gap-8" }, h("span", { className: "muted" }, total ? Math.round((dist.counts[s] / total) * 100) + "%" : "0%"), h("span", { className: "fw-600", style: { width: 24, textAlign: "right" } }, dist.counts[s])),
            ),
          ),
        ),
      ),
    );
  }

  function PageDashboard({ currentUserId }) {
    const store = useStore();
    const [scope, setScope] = useState("all");
    const rep = D.reports[scope];
    const dist = liveDistribution(store, scope);
    const open = dist.counts.backlog + dist.counts.todo + dist.counts.in_progress + dist.counts.in_review;
    const closedTotal = rep.throughput.reduce((a, b) => a + b.closed, 0);
    const lastWeek = rep.throughput[rep.throughput.length - 1];
    const scopeLabel = SCOPES.find((s) => s.id === scope).label;

    const content = h(
      React.Fragment,
      null,
      h(
        "div",
        { className: "row between items-end mb-24 wrap", style: { gap: 12 } },
        h(
          "div",
          null,
          h("h1", { style: { fontSize: 24, marginBottom: 4 } }, "Dashboard"),
          h("div", { className: "muted fs-13" }, "Reports from ", h("span", { className: "mono" }, "reports.getProject*"), " · cursor on ", scopeLabel),
        ),
        h(
          UI.Dropdown,
          { align: "right", width: 220, trigger: h("button", { className: "btn btn-sm" }, h(Icon.project, { size: 15 }), scopeLabel, h(Icon.triangleDown, { size: 12 })) },
          (close) =>
            h(
              React.Fragment,
              null,
              h("div", { className: "dd-head" }, "Scope"),
              SCOPES.map((s) => h(UI.DdItem, { key: s.id, active: scope === s.id, onClick: () => { setScope(s.id); close(); } }, s.label)),
            ),
        ),
      ),
      h(
        "div",
        { className: "stat-grid mb-24" },
        h(StatCard, { icon: "issueOpened", label: "Open issues", value: open, sub: dist.total + " total in scope" }),
        h(StatCard, { icon: "issueClosed", label: "Closed (window)", value: closedTotal, sub: "last 5 weeks", color: "var(--st-done)" }),
        h(StatCard, { icon: "clock", label: "Avg cycle time", value: rep.cycleTime.avgDays + "d", sub: `p50 ${rep.cycleTime.p50Days}d · p90 ${rep.cycleTime.p90Days}d` }),
        h(StatCard, { icon: "graph", label: "Throughput", value: lastWeek.closed, sub: "closed last week · n=" + rep.cycleTime.sampleSize }),
      ),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" } },
        h(ThroughputChart, { data: rep.throughput }),
        h(StatusDistribution, { dist }),
      ),
      h(
        "div",
        { className: "box mt-24" },
        h("div", { className: "box-header" }, "Cycle time percentiles"),
        h(
          "div",
          { className: "row", style: { padding: "20px 16px", gap: 0 } },
          [
            { k: "Average", v: rep.cycleTime.avgDays },
            { k: "Median (p50)", v: rep.cycleTime.p50Days },
            { k: "p90", v: rep.cycleTime.p90Days },
            { k: "Sample size", v: rep.cycleTime.sampleSize, raw: true },
          ].map((c, i) =>
            h(
              "div",
              { key: i, className: "flex-1 col", style: { borderLeft: i ? "1px solid var(--border-muted)" : "none", paddingLeft: i ? 20 : 0 } },
              h("div", { className: "muted fs-12" }, c.k),
              h("div", { style: { fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px" } }, c.raw ? c.v : c.v + "d"),
            ),
          ),
        ),
      ),
    );

    return h(Shell.Layout, { currentUserId, crumbs: [{ label: "Trackr" }], tabs: Shell.workspaceTabs("dashboard") }, content);
  }

  // ---------- Sprints ----------
  function sprintIssues(sprint, store) {
    const map = Object.fromEntries(store.issues.map((i) => [i.id, i]));
    return sprint.issueIds.map((id) => map[id]).filter(Boolean);
  }

  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  function ActiveSprintCard({ sprint, store }) {
    const items = sprintIssues(sprint, store);
    const committed = items.reduce((a, i) => a + i.points, 0);
    const done = items.filter((i) => i.status === "done").reduce((a, i) => a + i.points, 0);
    const pct = committed ? Math.round((done / committed) * 100) : 0;
    const daysLeft = daysBetween(D.NOW.toISOString(), sprint.endDate);
    return h(
      "div",
      { className: "box mb-24" },
      h(
        "div",
        { style: { padding: "18px 20px", borderBottom: "1px solid var(--border-muted)" } },
        h(
          "div",
          { className: "row between items-start wrap", style: { gap: 12 } },
          h(
            "div",
            null,
            h(
              "div",
              { className: "row gap-8 mb-8" },
              h("span", { className: "state-label", style: { background: "var(--st-in_progress)", height: 24, fontSize: 12 } }, h(Icon.iterations, { size: 14 }), "Active"),
              h("h2", { style: { fontSize: 18 } }, sprint.name),
            ),
            h("div", { className: "muted fs-13", style: { maxWidth: 560 } }, sprint.goal),
          ),
          h(
            "div",
            { className: "col items-end" },
            h("div", { className: "row gap-6 fs-13" }, h(Icon.calendar, { size: 15, color: "var(--fg-muted)" }), D.formatShort(sprint.startDate) + " – " + D.formatShort(sprint.endDate)),
            h("div", { className: "muted fs-12 mt-4" }, daysLeft + " days left"),
          ),
        ),
        h(
          "div",
          { className: "mt-16" },
          h(
            "div",
            { className: "row between fs-13 mb-8" },
            h("span", { className: "fw-600" }, done + " / " + committed + " points done"),
            h("span", { className: "muted" }, "capacity " + sprint.capacityPoints + " · " + pct + "%"),
          ),
          h("div", { className: "mini-bar", style: { height: 10 } }, h("span", { style: { width: pct + "%", background: "var(--st-done)" } }), h("span", { style: { width: Math.max(0, Math.round((committed - done) / sprint.capacityPoints * 100)) + "%", background: "var(--st-in_progress)", opacity: 0.5 } })),
        ),
      ),
      h(
        "div",
        null,
        items.map((i) =>
          h(
            "a",
            { key: i.id, href: `#/trackr/projects/${i.projectSlug}/issues/${i.number}`, className: "issue-row", style: { textDecoration: "none", color: "inherit" } },
            h("div", { style: { paddingTop: 2 } }, h(UI.StatusIcon, { status: i.status, size: 16 })),
            h(
              "div",
              { className: "flex-1", style: { minWidth: 0 } },
              h("div", { className: "fw-600", style: { color: "var(--fg-default)" } }, i.title),
              h("div", { className: "issue-meta" }, D.projectsBySlug[i.projectSlug].name + " · #" + i.number + " · " + D.STATUS_META[i.status].label),
            ),
            h("div", { className: "row gap-12" }, h("span", { className: "muted fs-12 mono" }, i.points + " pt"), h(UI.PriorityIcon, { priority: i.priority, size: 15 }), i.assigneeId ? h(UI.Avatar, { userId: i.assigneeId, size: 20 }) : h("span", { style: { width: 20 } })),
          ),
        ),
      ),
    );
  }

  function SmallSprintCard({ sprint, store }) {
    const items = sprintIssues(sprint, store);
    const committed = items.reduce((a, i) => a + i.points, 0);
    const done = items.filter((i) => i.status === "done").reduce((a, i) => a + i.points, 0);
    const isClosed = sprint.status === "closed";
    return h(
      "div",
      { className: "box", style: { padding: 18 } },
      h(
        "div",
        { className: "row gap-8 mb-8" },
        h("span", { className: "state-label", style: { background: isClosed ? "var(--st-done)" : "var(--st-backlog)", height: 22, fontSize: 11, padding: "0 10px" } }, isClosed ? h(Icon.check, { size: 13 }) : h(Icon.calendar, { size: 13 }), isClosed ? "Closed" : "Planned"),
        h("h3", { style: { fontSize: 15 } }, sprint.name),
      ),
      h("div", { className: "muted fs-13 mb-16", style: { minHeight: 38 } }, sprint.goal),
      h(
        "div",
        { className: "col gap-8 fs-13" },
        h("div", { className: "row between" }, h("span", { className: "muted row gap-6" }, h(Icon.calendar, { size: 14 }), "Dates"), h("span", null, D.formatShort(sprint.startDate) + " – " + D.formatShort(sprint.endDate))),
        h("div", { className: "row between" }, h("span", { className: "muted row gap-6" }, h(Icon.issueOpened, { size: 14 }), "Issues"), h("span", null, items.length)),
        h("div", { className: "row between" }, h("span", { className: "muted row gap-6" }, h(Icon.graph, { size: 14 }), isClosed ? "Velocity" : "Committed"), h("span", { className: "fw-600" }, isClosed ? sprint.velocity + " pts" : committed + " pts")),
      ),
    );
  }

  function PageSprints({ currentUserId }) {
    const store = useStore();
    const active = D.sprints.find((s) => s.status === "active");
    const planned = D.sprints.filter((s) => s.status === "planned");
    const closed = D.sprints.filter((s) => s.status === "closed");

    const content = h(
      React.Fragment,
      null,
      h("h1", { style: { fontSize: 24, marginBottom: 4 } }, "Sprints"),
      h("div", { className: "muted fs-13 mb-24" }, "Cycles with start/end dates, capacity and velocity."),
      active ? h(ActiveSprintCard, { sprint: active, store }) : null,
      h("h2", { style: { fontSize: 16, marginBottom: 12 } }, "Upcoming & past"),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 } },
        planned.map((s) => h(SmallSprintCard, { key: s.id, sprint: s, store })),
        closed.map((s) => h(SmallSprintCard, { key: s.id, sprint: s, store })),
      ),
    );

    return h(Shell.Layout, { currentUserId, crumbs: [{ label: "Trackr" }], tabs: Shell.workspaceTabs("sprints") }, content);
  }

  window.PageDashboard = PageDashboard;
  window.PageSprints = PageSprints;
})();
