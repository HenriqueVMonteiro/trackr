/* Trackr router + store. Exposes window.useRoute, window.navigate, window.Store */
(function () {
  const React = window.React;
  const { useState, useEffect, useContext, createContext, useCallback } = React;
  const D = window.TrackrData;
  const h = React.createElement;

  // ---------- Router ----------
  function parseHash() {
    let hash = window.location.hash.replace(/^#/, "");
    if (!hash || hash === "/") return { name: "login", params: {} };
    const seg = hash.split("/").filter(Boolean);
    // seg[0] = workspace
    if (seg[0] === "login") return { name: "login", params: {} };
    const ws = seg[0];
    if (seg.length === 1) return { name: "workspace", params: { ws } };
    if (seg[1] === "dashboard") return { name: "dashboard", params: { ws } };
    if (seg[1] === "sprints") return { name: "sprints", params: { ws } };
    if (seg[1] === "projects" && seg[2]) {
      const slug = seg[2];
      if (seg[3] === "issues" && seg[4]) {
        return { name: "issue", params: { ws, slug, num: seg[4] } };
      }
      return { name: "project", params: { ws, slug } };
    }
    return { name: "workspace", params: { ws } };
  }

  function useRoute() {
    const [route, setRoute] = useState(parseHash());
    useEffect(() => {
      const onHash = () => {
        setRoute(parseHash());
        window.scrollTo(0, 0);
      };
      window.addEventListener("hashchange", onHash);
      return () => window.removeEventListener("hashchange", onHash);
    }, []);
    return route;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  // ---------- Store ----------
  const StoreContext = createContext(null);

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function StoreProvider({ children }) {
    const [issues, setIssues] = useState(() => deepClone(D.issues));
    const [currentUserId] = useState("u_gabriel");

    const nowIso = () => window.TrackrData.NOW.toISOString();

    const mutate = useCallback((issueId, fn) => {
      setIssues((prev) =>
        prev.map((i) => {
          if (i.id !== issueId) return i;
          const copy = deepClone(i);
          fn(copy);
          return copy;
        }),
      );
    }, []);

    const actions = {
      transition(issueId, to) {
        mutate(issueId, (i) => {
          const from = i.status;
          i.status = to;
          i.timeline.push({ type: "event", kind: "status", actorId: currentUserId, at: nowIso(), from, to });
        });
      },
      setAssignee(issueId, userId) {
        mutate(issueId, (i) => {
          if (i.assigneeId === userId) return;
          i.assigneeId = userId;
          i.timeline.push({
            type: "event",
            kind: userId ? "assigned" : "unassigned",
            actorId: currentUserId,
            at: nowIso(),
            who: userId,
          });
        });
      },
      setApprover(issueId, userId) {
        mutate(issueId, (i) => {
          if (i.approverId === userId) return;
          i.approverId = userId;
          i.timeline.push({ type: "event", kind: "approver", actorId: currentUserId, at: nowIso(), who: userId });
        });
      },
      setPriority(issueId, p) {
        mutate(issueId, (i) => {
          if (i.priority === p) return;
          i.priority = p;
          i.timeline.push({ type: "event", kind: "priority", actorId: currentUserId, at: nowIso(), to: p });
        });
      },
      toggleLabel(issueId, labelId) {
        mutate(issueId, (i) => {
          const has = i.labels.includes(labelId);
          i.labels = has ? i.labels.filter((l) => l !== labelId) : [...i.labels, labelId];
          i.timeline.push({
            type: "event",
            kind: has ? "unlabeled" : "labeled",
            actorId: currentUserId,
            at: nowIso(),
            label: labelId,
          });
        });
      },
      addComment(issueId, text) {
        const body = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
        if (!body.length) return;
        mutate(issueId, (i) => {
          i.timeline.push({ type: "comment", actorId: currentUserId, at: nowIso(), body });
        });
      },
    };

    const getIssue = (slug, num) =>
      issues.find((i) => i.projectSlug === slug && i.number === Number(num));
    const issuesForProject = (slug) => issues.filter((i) => i.projectSlug === slug);

    const value = { issues, currentUserId, getIssue, issuesForProject, ...actions };
    return h(StoreContext.Provider, { value }, children);
  }

  function useStore() {
    return useContext(StoreContext);
  }

  window.useRoute = useRoute;
  window.navigate = navigate;
  window.StoreProvider = StoreProvider;
  window.useStore = useStore;
})();
