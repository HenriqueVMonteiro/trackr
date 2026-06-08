/* Trackr shell: Header, Layout, ContextBar. Exposed on window.Shell */
(function () {
  const React = window.React;
  const Icon = window.Icon;
  const D = window.TrackrData;
  const UI = window.UI;
  const h = React.createElement;
  const navigate = window.navigate;

  function Logo({ size = 26, color = "#ffffff" }) {
    return h(
      "svg",
      { width: size, height: size, viewBox: "0 0 32 32", fill: "none", style: { display: "block" } },
      h("circle", { cx: 16, cy: 16, r: 14, stroke: color, strokeWidth: 2, opacity: 0.35 }),
      h("circle", { cx: 16, cy: 16, r: 8.5, stroke: color, strokeWidth: 2, opacity: 0.6 }),
      h("circle", { cx: 16, cy: 16, r: 3, fill: color }),
      h("path", { d: "M16 16 L27 7", stroke: color, strokeWidth: 2.4, strokeLinecap: "round" }),
    );
  }

  function Header({ currentUserId }) {
    const u = D.membersById[currentUserId];
    return h(
      "header",
      { className: "gh-header" },
      h(
        "div",
        { className: "gh-header-inner" },
        h(
          "a",
          { className: "gh-logo", href: "#/trackr" },
          h(Logo, { size: 28 }),
          h("span", null, "Trackr"),
        ),
        h(
          "div",
          { className: "gh-search" },
          h("input", { type: "text", placeholder: "Search Trackr…", "aria-label": "Search" }),
        ),
        h("div", { className: "gh-header-spacer" }),
        h(
          "div",
          { className: "gh-header-actions" },
          h(
            UI.Dropdown,
            {
              align: "right",
              trigger: h("span", { className: "gh-header-icon", title: "Create new" }, h(Icon.plus, { size: 16 }), h(Icon.triangleDown, { size: 12 })),
            },
            (close) =>
              h(
                React.Fragment,
                null,
                h("div", { className: "dd-head" }, "Create"),
                h(UI.DdItem, { icon: h(Icon.issueOpened, { size: 16 }), onClick: close }, "New issue"),
                h(UI.DdItem, { icon: h(Icon.project, { size: 16 }), onClick: close }, "New project"),
                h(UI.DdItem, { icon: h(Icon.iterations, { size: 16 }), onClick: close }, "New sprint"),
              ),
          ),
          h("span", { className: "gh-header-icon", title: "Notifications" }, h(Icon.bell, { size: 16 })),
          h(UI.Avatar, { userId: currentUserId, size: 24 }),
        ),
      ),
    );
  }

  function ContextBar({ crumbs, tabs }) {
    return h(
      "div",
      { className: "ctx-bar" },
      h(
        "div",
        { className: "ctx-bar-inner" },
        h(
          "div",
          { className: "ctx-crumbs" },
          h(Icon.book, { size: 16 }),
          crumbs.map((c, i) =>
            h(
              React.Fragment,
              { key: i },
              i > 0 ? h("span", { className: "ctx-crumb-sep" }, "/") : null,
              c.to
                ? h("a", { className: "ctx-crumb-link", href: c.to }, c.label)
                : h("span", { className: "ctx-crumb-current" }, c.label),
            ),
          ),
        ),
        tabs &&
          h(
            "nav",
            { className: "ctx-tabs" },
            tabs.map((t, i) =>
              h(
                "a",
                { key: i, className: "ctx-tab" + (t.active ? " active" : ""), href: t.to },
                t.icon ? h(Icon[t.icon], { size: 16 }) : null,
                h("span", null, t.label),
                t.count != null ? h(UI.Counter, null, t.count) : null,
              ),
            ),
          ),
      ),
    );
  }

  function Layout({ currentUserId, crumbs, tabs, children, wide }) {
    return h(
      "div",
      { className: "app-root" },
      h(Header, { currentUserId }),
      crumbs ? h(ContextBar, { crumbs, tabs }) : null,
      h(
        "main",
        { className: "route-fade", key: window.location.hash },
        h(
          "div",
          { className: "page-wrap page-pad", style: wide ? { maxWidth: 1400 } : null },
          children,
        ),
      ),
    );
  }

  // Standard workspace-level tabs
  function workspaceTabs(active) {
    return [
      { label: "Projects", icon: "project", to: "#/trackr", active: active === "projects" },
      { label: "Dashboard", icon: "dashboard", to: "#/trackr/dashboard", active: active === "dashboard" },
      { label: "Sprints", icon: "iterations", to: "#/trackr/sprints", active: active === "sprints" },
    ];
  }

  window.Shell = { Header, ContextBar, Layout, Logo, workspaceTabs };
})();
