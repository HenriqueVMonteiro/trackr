/* Trackr page: Project issue list with filters. Exposed on window.PageProject */
(function () {
  const React = window.React;
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.TrackrData;
  const UI = window.UI;
  const Shell = window.Shell;
  const h = React.createElement;
  const useStore = window.useStore;

  function projectTabs(slug, openCount) {
    return [
      { label: "Issues", icon: "issueOpened", count: openCount, to: `#/trackr/projects/${slug}`, active: true },
      { label: "Dashboard", icon: "dashboard", to: "#/trackr/dashboard" },
      { label: "Sprints", icon: "iterations", to: "#/trackr/sprints" },
    ];
  }

  function FilterMenu({ label, children, width }) {
    return h(
      UI.Dropdown,
      {
        align: "right",
        width: width || 240,
        trigger: h(
          "button",
          { className: "list-header-tab" },
          h("span", null, label),
          h(Icon.triangleDown, { size: 12 }),
        ),
      },
      children,
    );
  }

  function IssueRow({ issue }) {
    const meta = D.STATUS_META[issue.status];
    const created = issue.timeline.find((t) => t.kind === "created");
    const author = D.membersById[issue.createdById];
    const commentCount = issue.timeline.filter((t) => t.type === "comment").length;
    return h(
      "div",
      { className: "issue-row" },
      h("div", { style: { paddingTop: 3 } }, h(UI.StatusIcon, { status: issue.status, size: 16 })),
      h(
        "div",
        { className: "flex-1", style: { minWidth: 0 } },
        h(
          "div",
          { className: "row gap-8 wrap", style: { alignItems: "baseline" } },
          h(
            "a",
            {
              className: "issue-title-link",
              href: `#/trackr/projects/${issue.projectSlug}/issues/${issue.number}`,
              style: issue.status === "canceled" ? { textDecoration: "line-through", color: "var(--fg-muted)" } : null,
            },
            issue.title,
          ),
          issue.labels.map((l) => h(UI.Label, { key: l, id: l, small: true })),
        ),
        h(
          "div",
          { className: "issue-meta row gap-6 wrap" },
          h("span", null, "#" + issue.number),
          h("span", null, "·"),
          h("span", null, D.STATUS_META[issue.status].label),
          h("span", null, "·"),
          h("span", null, "opened ", h(UI.RelativeTime, { iso: issue.createdAt }), " by ", author.login),
        ),
      ),
      h(
        "div",
        { className: "row gap-12", style: { paddingTop: 2 } },
        h("span", { title: D.PRIORITY_META[issue.priority].label }, h(UI.PriorityIcon, { priority: issue.priority, size: 16 })),
        issue.assigneeId
          ? h(UI.Avatar, { userId: issue.assigneeId, size: 20 })
          : h("span", { style: { width: 20 } }),
        commentCount
          ? h(
              "a",
              { href: `#/trackr/projects/${issue.projectSlug}/issues/${issue.number}`, className: "row gap-4 muted fs-12" },
              h(Icon.comment, { size: 14 }),
              commentCount,
            )
          : h("span", { style: { width: 26 } }),
      ),
    );
  }

  function PageProject({ params, currentUserId }) {
    const store = useStore();
    const project = D.projectsBySlug[params.slug];
    const all = store.issuesForProject(params.slug);
    const [group, setGroup] = useState("open");
    const [assignee, setAssignee] = useState(null);
    const [priority, setPriority] = useState(null);
    const [label, setLabel] = useState(null);
    const [q, setQ] = useState("");

    if (!project) return h("div", null, "Project not found");

    const openCount = all.filter((i) => D.STATUS_META[i.status].group === "open").length;
    const closedCount = all.length - openCount;

    let list = all.filter((i) => D.STATUS_META[i.status].group === group);
    if (assignee) list = list.filter((i) => i.assigneeId === assignee);
    if (priority) list = list.filter((i) => i.priority === priority);
    if (label) list = list.filter((i) => i.labels.includes(label));
    if (q.trim()) list = list.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()));
    // sort: open by priority desc then number; closed by recency
    const rank = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
    list = [...list].sort((a, b) => rank[b.priority] - rank[a.priority] || a.number - b.number);

    const memberIds = D.workspace.memberIds;
    const usedLabels = [...new Set(all.flatMap((i) => i.labels))];

    const filtersActive = assignee || priority || label || q.trim();

    const crumbs = [{ label: "Trackr", to: "#/trackr" }, { label: project.name }];

    const content = h(
      React.Fragment,
      null,
      // top toolbar
      h(
        "div",
        { className: "row between mb-16", style: { gap: 12, flexWrap: "wrap" } },
        h(
          "div",
          { className: "row gap-8" },
          h("span", { className: "lang-dot", style: { background: project.color, width: 14, height: 14 } }),
          h("h1", { style: { fontSize: 20 } }, project.name),
        ),
        h(
          "div",
          { className: "row gap-8" },
          h("button", { className: "btn btn-sm" }, h(Icon.tag, { size: 15 }), "Labels"),
          h("button", { className: "btn btn-sm btn-primary" }, h(Icon.plus, { size: 15 }), "New issue"),
        ),
      ),
      // search bar
      h(
        "div",
        { className: "filter-bar" },
        h(
          "div",
          { className: "filter-search" },
          h(Icon.search, { size: 16, color: "var(--fg-muted)" }),
          h("input", {
            value: q,
            onChange: (e) => setQ(e.target.value),
            placeholder: `is:issue is:${group}`,
          }),
        ),
      ),
      // list header
      h(
        "div",
        { className: "list-header" },
        h(
          "button",
          { className: "list-header-tab" + (group === "open" ? " active" : ""), onClick: () => setGroup("open") },
          h(Icon.issueOpened, { size: 16, color: group === "open" ? "var(--fg-default)" : "var(--fg-muted)" }),
          openCount + " Open",
        ),
        h(
          "button",
          { className: "list-header-tab" + (group === "closed" ? " active" : ""), onClick: () => setGroup("closed") },
          h(Icon.check, { size: 16, color: group === "closed" ? "var(--fg-default)" : "var(--fg-muted)" }),
          closedCount + " Closed",
        ),
        h("div", { className: "flex-1" }),
        h(
          "div",
          { className: "row gap-16" },
          // Assignee filter
          h(FilterMenu, { label: "Assignee" }, (close) =>
            h(
              React.Fragment,
              null,
              h("div", { className: "dd-head" }, "Filter by assignee"),
              h(UI.DdItem, { active: !assignee, onClick: () => { setAssignee(null); close(); } }, "Anyone"),
              memberIds.map((id) =>
                h(
                  UI.DdItem,
                  { key: id, active: assignee === id, onClick: () => { setAssignee(id); close(); }, icon: h(UI.Avatar, { userId: id, size: 20 }) },
                  D.membersById[id].login,
                ),
              ),
            ),
          ),
          // Label filter
          h(FilterMenu, { label: "Label" }, (close) =>
            h(
              React.Fragment,
              null,
              h("div", { className: "dd-head" }, "Filter by label"),
              h(UI.DdItem, { active: !label, onClick: () => { setLabel(null); close(); } }, "Any label"),
              usedLabels.map((l) =>
                h(
                  UI.DdItem,
                  { key: l, active: label === l, onClick: () => { setLabel(l); close(); } },
                  h(UI.Label, { id: l, small: true }),
                ),
              ),
            ),
          ),
          // Priority filter
          h(FilterMenu, { label: "Priority" }, (close) =>
            h(
              React.Fragment,
              null,
              h("div", { className: "dd-head" }, "Filter by priority"),
              h(UI.DdItem, { active: !priority, onClick: () => { setPriority(null); close(); } }, "Any priority"),
              ["urgent", "high", "medium", "low", "none"].map((p) =>
                h(
                  UI.DdItem,
                  { key: p, active: priority === p, onClick: () => { setPriority(p); close(); }, icon: h(UI.PriorityIcon, { priority: p, size: 16 }) },
                  D.PRIORITY_META[p].label,
                ),
              ),
            ),
          ),
        ),
      ),
      // rows
      h(
        "div",
        { className: "box", style: { borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 } },
        list.length
          ? list.map((i) => h(IssueRow, { key: i.id, issue: i }))
          : h(
              "div",
              { className: "empty-state" },
              h(Icon.issueOpened, { size: 24, color: "var(--fg-subtle)" }),
              h("div", { className: "mt-8 fw-600", style: { color: "var(--fg-default)" } }, "No issues match your filters"),
              filtersActive
                ? h("button", { className: "btn btn-sm mt-16", onClick: () => { setAssignee(null); setPriority(null); setLabel(null); setQ(""); } }, "Clear filters")
                : null,
            ),
      ),
    );

    return h(
      Shell.Layout,
      { currentUserId, crumbs, tabs: projectTabs(params.slug, openCount) },
      content,
    );
  }

  window.PageProject = PageProject;
})();
