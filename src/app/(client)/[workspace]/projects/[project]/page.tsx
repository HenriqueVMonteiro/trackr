import Link from "next/link";
import { Layout, StatusPill, workspaceTabs } from "@/components/Shell";
import { CommentIcon, IssueOpenedIcon, PlusIcon, TagIcon } from "@/components/icons";
import { issues, projects, relative, statusGroup, workspace } from "@/lib/demo";

interface Props {
  params: Promise<{ workspace: string; project: string }>;
  searchParams: Promise<{ status?: string; priority?: string }>;
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { project: projectSlug } = await params;
  const sp = await searchParams;
  const project = projects.find((p) => p.slug === projectSlug) ?? projects[0]!;
  const statusFilter = sp.status ? sp.status.split(",") : [];
  const filtered = issues.filter((i) => {
    if (statusFilter.length > 0 && !statusFilter.includes(i.status)) return false;
    if (sp.priority && i.priority !== sp.priority) return false;
    return true;
  });
  const open = filtered.filter((i) => statusGroup(i.status) === "open").length;
  const closed = filtered.length - open;

  return (
    <Layout
      crumbs={[
        { label: workspace.name, href: `/${workspace.slug}` },
        { label: project.name },
      ]}
      tabs={workspaceTabs(workspace.slug, "projects")}
      userName="Henrique"
    >
      <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold mb-1.5 flex items-center gap-3">
            <span className="lang-dot" style={{ background: project.color }} />
            {project.name}
            <span className="counter">{project.key}</span>
          </h1>
          <p className="muted max-w-xl">{project.description}</p>
        </div>
        <button className="btn btn-sm btn-primary">
          <PlusIcon size={15} />
          New issue
        </button>
      </div>

      <div className="box">
        <div
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-border-default)", background: "var(--color-canvas-subtle)" }}
        >
          <Link
            href={`/${workspace.slug}/projects/${project.slug}`}
            className={`flex items-center gap-2 ${statusFilter.length === 0 ? "font-semibold" : "muted"}`}
          >
            <IssueOpenedIcon size={16} />
            {open} Open
          </Link>
          <Link
            href={`/${workspace.slug}/projects/${project.slug}?status=done,canceled`}
            className="flex items-center gap-2 muted hover:text-[color:var(--color-fg-default)]"
          >
            {closed} Closed
          </Link>
          <div className="flex-1" />
          <div className="flex gap-2 text-xs">
            <button className="btn btn-sm">Author</button>
            <button className="btn btn-sm">Label</button>
            <button className="btn btn-sm">Assignee</button>
            <button className="btn btn-sm">Sort</button>
          </div>
        </div>
        <ul>
          {filtered.map((i) => (
            <li
              key={i.id}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <StatusPill status={i.status} />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/${workspace.slug}/projects/${project.slug}/issues/${i.id}`}
                  className="text-[15px] font-semibold text-[color:var(--color-fg-default)] hover:text-[color:var(--color-accent-fg)] hover:no-underline block"
                >
                  {i.title}
                  {i.labels.map((l) => (
                    <span
                      key={l}
                      className="label ml-2"
                      style={{ background: "var(--color-neutral-subtle)" }}
                    >
                      <TagIcon size={11} />
                      {l}
                    </span>
                  ))}
                </Link>
                <div className="muted text-xs mt-1 flex gap-3 items-center">
                  <span>
                    #{i.number} opened {relative(i.createdAt)} by{" "}
                    <span className="text-[color:var(--color-fg-default)]">
                      {i.assigneeName ?? "unassigned"}
                    </span>
                  </span>
                  {i.priority !== "none" && (
                    <span className="counter" style={{ background: "var(--color-attention-subtle)", color: "var(--color-attention-fg)" }}>
                      {i.priority}
                    </span>
                  )}
                </div>
              </div>
              {i.comments > 0 && (
                <div className="flex items-center gap-1 muted text-xs pt-1">
                  <CommentIcon size={14} />
                  {i.comments}
                </div>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-10 text-center muted">No issues match the current filter.</li>
          )}
        </ul>
      </div>
    </Layout>
  );
}
