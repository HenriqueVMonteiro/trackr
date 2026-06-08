/* Trackr page: Issue detail. Exposed on window.PageIssue */
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

  // ---------- Comment card ----------
  function CommentCard({ actorId, at, body, isAuthor }) {
    return h(
      "div",
      { className: "tl-comment-card" },
      h(
        "div",
        { className: "tl-comment-head" },
        h("span", { className: "fw-600", style: { color: "var(--fg-default)" } }, D.membersById[actorId].login),
        h("span", { className: "muted" }, "commented ", h(UI.RelativeTime, { iso: at })),
        h("div", { className: "flex-1" }),
        isAuthor ? h("span", { className: "label", style: { borderColor: "var(--border-default)", color: "var(--fg-muted)" } }, "Author") : null,
        h("span", { className: "muted", style: { display: "inline-flex" } }, h(Icon.kebab, { size: 16 })),
      ),
      h("div", { className: "tl-comment-body" }, h(UI.Markdown, { paragraphs: body })),
    );
  }

  // ---------- Event row ----------
  function EventRow({ e }) {
    const actor = D.membersById[e.actorId];
    let icon = h(Icon.dotFill, { size: 14 });
    let content = null;
    if (e.kind === "status") {
      icon = h(UI.StatusIcon, { status: e.to, size: 16 });
      content = h(
        React.Fragment,
        null,
        h("b", null, actor.login),
        " moved this from ",
        h("b", null, D.STATUS_META[e.from].label),
        " to ",
        h("b", null, D.STATUS_META[e.to].label),
        " · ",
        h(UI.RelativeTime, { iso: e.at }),
      );
    } else if (e.kind === "assigned") {
      icon = h(Icon.person, { size: 14 });
      content = h(React.Fragment, null, h("b", null, actor.login), e.who === e.actorId ? " self-assigned this" : [" assigned ", h("b", { key: "w" }, D.membersById[e.who].login)], " · ", h(UI.RelativeTime, { iso: e.at }));
    } else if (e.kind === "unassigned") {
      icon = h(Icon.person, { size: 14 });
      content = h(React.Fragment, null, h("b", null, actor.login), " removed the assignee · ", h(UI.RelativeTime, { iso: e.at }));
    } else if (e.kind === "priority") {
      icon = h(UI.PriorityIcon, { priority: e.to, size: 14 });
      content = h(React.Fragment, null, h("b", null, actor.login), " set priority to ", h("b", null, D.PRIORITY_META[e.to].label), " · ", h(UI.RelativeTime, { iso: e.at }));
    } else if (e.kind === "labeled" || e.kind === "unlabeled") {
      icon = h(Icon.tag, { size: 14 });
      content = h(React.Fragment, null, h("b", null, actor.login), e.kind === "labeled" ? " added the " : " removed the ", h(UI.Label, { id: e.label, small: true }), " label · ", h(UI.RelativeTime, { iso: e.at }));
    } else if (e.kind === "approver") {
      icon = h(Icon.check, { size: 14 });
      content = h(React.Fragment, null, h("b", null, actor.login), " set ", h("b", null, D.membersById[e.who].login), " as approver · ", h(UI.RelativeTime, { iso: e.at }));
    } else {
      content = h(React.Fragment, null, h("b", null, actor.login), " updated this · ", h(UI.RelativeTime, { iso: e.at }));
    }
    return h(
      "div",
      { className: "tl-item" },
      h("div", { className: "tl-badge", style: { width: 22, height: 22, left: 17 } }, icon),
      h("div", { className: "tl-event" }, content),
    );
  }

  // ---------- Sidebar section with gear dropdown ----------
  function SideSection({ title, children, menu }) {
    return h(
      "div",
      { className: "side-section" },
      h(
        "div",
        { className: "side-head" },
        h("span", null, title),
        menu
          ? h(UI.Dropdown, { align: "right", width: 240, trigger: h("button", { title: "Edit" }, h(Icon.gear, { size: 16 })) }, menu)
          : null,
      ),
      children,
    );
  }

  // ---------- Transition toolbar ----------
  function TransitionBar({ issue, store }) {
    const allowed = D.allowedTransitions(issue);
    return h(
      "div",
      { className: "box", style: { marginBottom: 16 } },
      h(
        "div",
        { className: "row gap-12 wrap", style: { padding: "12px 16px" } },
        h(UI.StatusBadge, { status: issue.status, lg: true }),
        h(Icon.arrowRight, { size: 16, color: "var(--fg-subtle)" }),
        allowed.length === 0
          ? h("span", { className: "muted fs-13" }, "Terminal state — no transitions available.")
          : allowed.map((t) =>
              h(
                "button",
                {
                  key: t.to,
                  className: "btn btn-sm" + (t.to === "done" ? " btn-primary" : t.to === "canceled" ? " btn-danger" : ""),
                  disabled: t.disabled,
                  title: t.reason || "",
                  onClick: t.disabled ? undefined : () => store.transition(issue.id, t.to),
                },
                h(UI.StatusIcon, { status: t.to, size: 14, color: t.to === "done" ? "#fff" : undefined }),
                D.STATUS_META[t.to].label,
              ),
            ),
      ),
      allowed.some((t) => t.disabled)
        ? h(
            "div",
            { style: { padding: "10px 16px", borderTop: "1px solid var(--border-muted)", background: "var(--attention-subtle)", borderRadius: "0 0 var(--radius) var(--radius)" }, className: "row gap-8 fs-13" },
            h(Icon.lock, { size: 14, color: "var(--attention-fg)" }),
            h("span", null, allowed.find((t) => t.disabled).reason, " Set an approver in the sidebar to enable ", h("b", null, "Done"), "."),
          )
        : null,
    );
  }

  // ---------- Add comment ----------
  function AddComment({ issue, store, currentUserId }) {
    const [text, setText] = useState("");
    const submit = () => {
      store.addComment(issue.id, text);
      setText("");
    };
    return h(
      "div",
      { className: "tl-item", style: { paddingBottom: 0 } },
      h("div", { className: "tl-badge", style: { width: 30, height: 30, left: 12, top: 0, padding: 0, border: "none", background: "transparent" } }, h(UI.Avatar, { userId: currentUserId, size: 30 })),
      h(
        "div",
        { className: "tl-comment-card" },
        h(
          "div",
          { style: { padding: 12 } },
          h("textarea", {
            className: "form-control",
            rows: 4,
            placeholder: "Leave a comment",
            value: text,
            onChange: (e) => setText(e.target.value),
          }),
          h(
            "div",
            { className: "row between mt-8" },
            h("span", { className: "muted fs-12 row gap-4" }, h(Icon.smiley, { size: 14 }), "Markdown supported"),
            h(
              "div",
              { className: "row gap-8" },
              h("button", { className: "btn btn-sm btn-primary", disabled: !text.trim(), onClick: submit }, h(Icon.comment, { size: 14 }), "Comment"),
            ),
          ),
        ),
      ),
    );
  }

  // ---------- Page ----------
  function PageIssue({ params, currentUserId }) {
    const store = useStore();
    const issue = store.getIssue(params.slug, params.num);
    const project = D.projectsBySlug[params.slug];
    if (!issue || !project) {
      return h(Shell.Layout, { currentUserId, crumbs: [{ label: "Trackr", to: "#/trackr" }] }, h("div", { className: "empty-state" }, "Issue not found."));
    }
    const openCount = store.issuesForProject(params.slug).filter((i) => D.STATUS_META[i.status].group === "open").length;
    const author = D.membersById[issue.createdById];
    const events = issue.timeline.filter((t) => t.kind !== "created");
    const sprint = D.sprints.find((s) => s.issueIds.includes(issue.id));

    const crumbs = [
      { label: "Trackr", to: "#/trackr" },
      { label: project.name, to: `#/trackr/projects/${project.slug}` },
      { label: "#" + issue.number },
    ];

    // sidebar menus
    const assigneeMenu = (close) =>
      h(
        React.Fragment,
        null,
        h("div", { className: "dd-head" }, "Assign up to one person"),
        D.workspace.memberIds.map((id) =>
          h(UI.DdItem, { key: id, active: issue.assigneeId === id, icon: h(UI.Avatar, { userId: id, size: 20 }), sub: D.membersById[id].name, onClick: () => { store.setAssignee(issue.id, issue.assigneeId === id ? null : id); close(); } }, D.membersById[id].login),
        ),
      );
    const approverMenu = (close) =>
      h(
        React.Fragment,
        null,
        h("div", { className: "dd-head" }, "Required to mark as Done"),
        D.workspace.memberIds.map((id) =>
          h(UI.DdItem, { key: id, active: issue.approverId === id, icon: h(UI.Avatar, { userId: id, size: 20 }), onClick: () => { store.setApprover(issue.id, issue.approverId === id ? null : id); close(); } }, D.membersById[id].login),
        ),
      );
    const priorityMenu = (close) =>
      h(
        React.Fragment,
        null,
        h("div", { className: "dd-head" }, "Set priority"),
        ["urgent", "high", "medium", "low", "none"].map((p) =>
          h(UI.DdItem, { key: p, active: issue.priority === p, icon: h(UI.PriorityIcon, { priority: p, size: 16 }), onClick: () => { store.setPriority(issue.id, p); close(); } }, D.PRIORITY_META[p].label),
        ),
      );
    const labelMenu = () =>
      h(
        React.Fragment,
        null,
        h("div", { className: "dd-head" }, "Apply labels"),
        D.labels.map((l) =>
          h(UI.DdItem, { key: l.id, active: issue.labels.includes(l.id), onClick: () => store.toggleLabel(issue.id, l.id) }, h(UI.Label, { id: l.id, small: true })),
        ),
      );

    const sidebar = h(
      "aside",
      null,
      h(
        SideSection,
        { title: "Assignees", menu: assigneeMenu },
        issue.assigneeId
          ? h("div", { className: "row gap-8" }, h(UI.Avatar, { userId: issue.assigneeId, size: 20 }), h("span", { className: "fs-13 fw-600" }, D.membersById[issue.assigneeId].login))
          : h("span", { className: "side-empty" }, "No one — assign yourself"),
      ),
      h(
        SideSection,
        { title: "Approver", menu: approverMenu },
        issue.approverId
          ? h("div", { className: "row gap-8" }, h(UI.Avatar, { userId: issue.approverId, size: 20 }), h("span", { className: "fs-13 fw-600" }, D.membersById[issue.approverId].login))
          : h("span", { className: "side-empty", style: issue.status === "in_review" ? { color: "var(--attention-fg)" } : null }, issue.status === "in_review" ? "Required to close — none set" : "No approver"),
      ),
      h(
        SideSection,
        { title: "Labels", menu: labelMenu },
        issue.labels.length
          ? h("div", { className: "row gap-6 wrap" }, issue.labels.map((l) => h(UI.Label, { key: l, id: l })))
          : h("span", { className: "side-empty" }, "None yet"),
      ),
      h(
        SideSection,
        { title: "Priority", menu: priorityMenu },
        h(UI.PriorityTag, { priority: issue.priority }),
      ),
      h(
        SideSection,
        { title: "Project" },
        h("div", { className: "row gap-8" }, h("span", { className: "lang-dot", style: { background: project.color } }), h("a", { href: `#/trackr/projects/${project.slug}`, className: "fs-13" }, project.name)),
      ),
      sprint
        ? h(
            SideSection,
            { title: "Sprint" },
            h("a", { href: "#/trackr/sprints", className: "row gap-8 fs-13" }, h(Icon.iterations, { size: 15, color: "var(--fg-muted)" }), sprint.name),
          )
        : null,
      h(
        SideSection,
        { title: "Estimate" },
        h("span", { className: "fs-13" }, issue.points + " story points"),
      ),
    );

    const main = h(
      "div",
      null,
      h(TransitionBar, { issue, store }),
      h(
        "div",
        { className: "timeline", style: { position: "relative" } },
        h("div", { className: "tl-rail" }),
        // description card
        h(
          "div",
          { className: "tl-item" },
          h("div", { className: "tl-badge", style: { width: 30, height: 30, left: 12, top: 0, padding: 0, border: "none", background: "transparent" } }, h(UI.Avatar, { userId: issue.createdById, size: 30 })),
          h(CommentCard, { actorId: issue.createdById, at: issue.createdAt, body: issue.description, isAuthor: true }),
        ),
        // timeline events + comments
        events.map((t, idx) =>
          t.type === "comment"
            ? h(
                "div",
                { key: idx, className: "tl-item" },
                h("div", { className: "tl-badge", style: { width: 30, height: 30, left: 12, top: 0, padding: 0, border: "none", background: "transparent" } }, h(UI.Avatar, { userId: t.actorId, size: 30 })),
                h(CommentCard, { actorId: t.actorId, at: t.at, body: t.body, isAuthor: t.actorId === issue.createdById }),
              )
            : h(EventRow, { key: idx, e: t }),
        ),
        // add comment
        h(AddComment, { issue, store, currentUserId }),
      ),
    );

    const commentCount = issue.timeline.filter((t) => t.type === "comment").length;

    const content = h(
      React.Fragment,
      null,
      // title
      h(
        "div",
        { style: { borderBottom: "1px solid var(--border-muted)", paddingBottom: 16, marginBottom: 16 } },
        h(
          "div",
          { className: "row between items-start gap-12" },
          h(
            "h1",
            { style: { fontSize: 28, fontWeight: 400, lineHeight: 1.25 } },
            issue.title,
            " ",
            h("span", { className: "muted", style: { fontWeight: 300 } }, "#" + issue.number),
          ),
          h("button", { className: "btn btn-sm" }, h(Icon.pencil, { size: 14 }), "Edit"),
        ),
        h(
          "div",
          { className: "row gap-12 mt-8 wrap" },
          h(UI.StatusBadge, { status: issue.status, lg: true }),
          h(
            "span",
            { className: "muted fs-13" },
            h("b", { style: { color: "var(--fg-default)" } }, author.login),
            " opened this ",
            h(UI.RelativeTime, { iso: issue.createdAt }),
            " · ",
            commentCount,
            " comment" + (commentCount === 1 ? "" : "s"),
          ),
        ),
      ),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 296px", gap: 32, alignItems: "start" } },
        main,
        sidebar,
      ),
    );

    return h(Shell.Layout, { currentUserId, crumbs, tabs: projectTabs(params.slug, openCount) }, content);
  }

  window.PageIssue = PageIssue;
})();
