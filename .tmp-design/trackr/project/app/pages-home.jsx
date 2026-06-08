/* Trackr pages: Login + Workspace home. Exposed on window.PageLogin, window.PageWorkspace */
(function () {
  const React = window.React;
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.TrackrData;
  const UI = window.UI;
  const Shell = window.Shell;
  const h = React.createElement;
  const navigate = window.navigate;
  const useStore = window.useStore;

  // ---------- Login ----------
  function PageLogin() {
    const [email, setEmail] = useState("gabriel@trackr.dev");
    const [pw, setPw] = useState("········");
    const submit = (e) => {
      e.preventDefault();
      navigate("/trackr");
    };
    return h(
      "div",
      { className: "login-wrap" },
      h("div", { className: "login-logo" }, h(Shell.Logo, { size: 48, color: "#1f2328" })),
      h(
        "h1",
        { style: { fontWeight: 300, fontSize: 24, marginBottom: 16, textAlign: "center" } },
        "Sign in to Trackr",
      ),
      h(
        "form",
        { className: "login-card", onSubmit: submit },
        h(
          "label",
          { className: "col", style: { marginBottom: 16 } },
          h("span", { className: "field-label" }, "Email address"),
          h("input", {
            className: "form-control",
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            autoFocus: true,
          }),
        ),
        h(
          "label",
          { className: "col", style: { marginBottom: 18 } },
          h(
            "span",
            { className: "row between", style: { marginBottom: 6 } },
            h("span", { className: "field-label", style: { marginBottom: 0 } }, "Password"),
            h("a", { href: "#/login", className: "fs-12", onClick: (e) => e.preventDefault() }, "Forgot password?"),
          ),
          h("input", {
            className: "form-control",
            type: "password",
            value: pw,
            onChange: (e) => setPw(e.target.value),
          }),
        ),
        h("button", { type: "submit", className: "btn btn-primary btn-block" }, "Sign in"),
      ),
      h(
        "div",
        { className: "login-alt" },
        "New to Trackr? ",
        h("a", { href: "#/login", onClick: (e) => e.preventDefault() }, "Create an account"),
      ),
      h(
        "div",
        { className: "muted fs-12", style: { marginTop: 40, marginBottom: 40, textAlign: "center" } },
        "Trackr · Arquitetura de Software · ",
        h("a", { href: "#/login", onClick: (e) => e.preventDefault() }, "Terms"),
        " · ",
        h("a", { href: "#/login", onClick: (e) => e.preventDefault() }, "Privacy"),
        " · ",
        h("a", { href: "#/login", onClick: (e) => e.preventDefault() }, "Docs"),
      ),
    );
  }

  // ---------- Project card row ----------
  function ProjectRow({ project, issues }) {
    const open = issues.filter((i) => D.STATUS_META[i.status].group === "open").length;
    const dist = { backlog: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, canceled: 0 };
    issues.forEach((i) => (dist[i.status] += 1));
    const total = issues.length || 1;
    const order = ["done", "in_review", "in_progress", "todo", "backlog", "canceled"];
    const lastUpdated = issues
      .map((i) => i.timeline[i.timeline.length - 1]?.at)
      .filter(Boolean)
      .sort()
      .pop();
    return h(
      "div",
      { className: "repo-row" },
      h(
        "div",
        { className: "flex-1" },
        h(
          "div",
          { className: "row gap-8", style: { marginBottom: 6 } },
          h("span", { className: "lang-dot", style: { background: project.color } }),
          h("a", { className: "repo-name", href: `#/trackr/projects/${project.slug}` }, project.name),
        ),
        h("div", { className: "muted", style: { maxWidth: 560, marginBottom: 12 } }, project.description),
        h(
          "div",
          { className: "mini-bar", style: { maxWidth: 320, marginBottom: 12 } },
          order.map((s) =>
            dist[s] ? h("span", { key: s, style: { width: (dist[s] / total) * 100 + "%", background: D.STATUS_META[s].hue } }) : null,
          ),
        ),
        h(
          "div",
          { className: "row gap-16 muted fs-12" },
          h("span", { className: "row gap-4" }, h(Icon.issueOpened, { size: 14 }), open + " open"),
          h("span", { className: "row gap-4" }, h(Icon.issueClosed, { size: 14 }), dist.done + " done"),
          lastUpdated ? h("span", null, "Updated ", h(UI.RelativeTime, { iso: lastUpdated })) : null,
        ),
      ),
      h(
        "div",
        { className: "col items-end gap-8" },
        h(UI.AvatarStack, { userIds: [project.leadId, ...D.workspace.memberIds.filter((m) => m !== project.leadId)].slice(0, 3), size: 22 }),
        h("a", { className: "btn btn-sm", href: `#/trackr/projects/${project.slug}` }, "Open"),
      ),
    );
  }

  // ---------- Workspace home ----------
  function PageWorkspace({ currentUserId }) {
    const store = useStore();
    const ws = D.workspace;
    const allOpen = store.issues.filter((i) => D.STATUS_META[i.status].group === "open").length;

    const crumbs = [{ label: "Trackr" }];
    const main = h(
      React.Fragment,
      null,
      // workspace header
      h(
        "div",
        { className: "row between items-start mb-24", style: { flexWrap: "wrap", gap: 16 } },
        h(
          "div",
          null,
          h("h1", { style: { fontSize: 24, marginBottom: 6 } }, ws.name),
          h("div", { className: "muted", style: { maxWidth: 640 } }, ws.description),
        ),
        h(
          "div",
          { className: "row gap-8" },
          h("a", { className: "btn btn-sm", href: "#/trackr/dashboard" }, h(Icon.dashboard, { size: 15 }), "Dashboard"),
          h("button", { className: "btn btn-sm btn-primary" }, h(Icon.plus, { size: 15 }), "New project"),
        ),
      ),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 296px", gap: 32, alignItems: "start" } },
        // projects list
        h(
          "div",
          null,
          h(
            "div",
            { className: "row between", style: { paddingBottom: 8, borderBottom: "1px solid var(--border-default)", marginBottom: 0 } },
            h("h2", { style: { fontSize: 16 } }, "Projects ", h(UI.Counter, null, D.projects.length)),
          ),
          D.projects.map((p) =>
            h(ProjectRow, { key: p.slug, project: p, issues: store.issuesForProject(p.slug) }),
          ),
        ),
        // right rail
        h(
          "aside",
          null,
          h(
            "div",
            { className: "side-section", style: { paddingTop: 0 } },
            h("div", { className: "side-head" }, "ABOUT"),
            h("div", { className: "fs-13", style: { lineHeight: 1.6 } }, "Monolito modular · Clean Architecture por bounded context · 170+ testes de domínio · 9 ADRs."),
          ),
          h(
            "div",
            { className: "side-section" },
            h("div", { className: "side-head" }, "TEAM"),
            h(
              "div",
              { className: "col gap-12" },
              ws.memberIds.map((id) => {
                const m = D.membersById[id];
                return h(
                  "div",
                  { key: id, className: "row gap-8" },
                  h(UI.Avatar, { userId: id, size: 28 }),
                  h(
                    "div",
                    null,
                    h("div", { className: "fs-13 fw-600" }, m.name),
                    h("div", { className: "muted fs-12" }, m.role),
                  ),
                );
              }),
            ),
          ),
          h(
            "div",
            { className: "side-section" },
            h("div", { className: "side-head" }, "AT A GLANCE"),
            h(
              "div",
              { className: "col gap-8 fs-13" },
              h("div", { className: "row between" }, h("span", { className: "muted" }, "Open issues"), h("span", { className: "fw-600" }, allOpen)),
              h("div", { className: "row between" }, h("span", { className: "muted" }, "Projects"), h("span", { className: "fw-600" }, D.projects.length)),
              h("div", { className: "row between" }, h("span", { className: "muted" }, "Active sprint"), h("a", { href: "#/trackr/sprints" }, "Sprint 6")),
            ),
          ),
        ),
      ),
    );

    return h(
      Shell.Layout,
      { currentUserId, crumbs, tabs: Shell.workspaceTabs("projects") },
      main,
    );
  }

  window.PageLogin = PageLogin;
  window.PageWorkspace = PageWorkspace;
})();
