/* Trackr app entry — router + store + page switch */
(function () {
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const h = React.createElement;

  function App() {
    const route = window.useRoute();
    const store = window.useStore();
    const currentUserId = store.currentUserId;

    let page;
    switch (route.name) {
      case "login":
        page = h(window.PageLogin, null);
        break;
      case "workspace":
        page = h(window.PageWorkspace, { currentUserId });
        break;
      case "project":
        page = h(window.PageProject, { params: route.params, currentUserId });
        break;
      case "issue":
        page = h(window.PageIssue, { params: route.params, currentUserId });
        break;
      case "dashboard":
        page = h(window.PageDashboard, { currentUserId });
        break;
      case "sprints":
        page = h(window.PageSprints, { currentUserId });
        break;
      default:
        page = h(window.PageWorkspace, { currentUserId });
    }
    return page;
  }

  function Root() {
    return h(window.StoreProvider, null, h(App, null));
  }

  const mount = document.getElementById("root");
  ReactDOM.createRoot(mount).render(h(Root, null));
})();
