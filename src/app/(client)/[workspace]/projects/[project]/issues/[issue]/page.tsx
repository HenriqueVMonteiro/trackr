import Link from "next/link";
import { Layout, StatusPill, workspaceTabs } from "@/components/Shell";
import {
  ClockIcon,
  CommentIcon,
  IssueOpenedIcon,
  PersonIcon,
  PlusIcon,
  TagIcon,
} from "@/components/icons";
import { activity, comments, issues, projects, relative, workspace } from "@/lib/demo";

interface Props {
  params: Promise<{ workspace: string; project: string; issue: string }>;
}

export default async function IssueDetailPage({ params }: Props) {
  const { project: projectSlug, issue: issueId } = await params;
  const project = projects.find((p) => p.slug === projectSlug) ?? projects[0]!;
  const issue = issues.find((i) => i.id === issueId) ?? issues[0]!;

  return (
    <Layout
      crumbs={[
        { label: workspace.name, href: `/${workspace.slug}` },
        { label: project.name, href: `/${workspace.slug}/projects/${project.slug}` },
        { label: `${project.key}-${issue.number}` },
      ]}
      tabs={workspaceTabs(workspace.slug, "projects")}
      userName="Henrique"
    >
      <div className="mb-6 pb-4" style={{ borderBottom: "1px solid var(--color-border-muted)" }}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl font-normal flex-1">
            {issue.title}
            <span className="muted ml-3">#{issue.number}</span>
          </h1>
          <button className="btn btn-sm">Edit</button>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <StatusPill status={issue.status} />
          <span className="muted">
            <span className="font-semibold text-[color:var(--color-fg-default)]">
              {issue.assigneeName ?? "Unassigned"}
            </span>
            {" opened this issue "}
            {relative(issue.createdAt)} · {issue.comments} comments
          </span>
        </div>
      </div>

      <div className="grid gap-8 items-start" style={{ gridTemplateColumns: "1fr 280px" }}>
        {/* main column */}
        <div>
          {/* description */}
          <div className="box mb-4 overflow-hidden">
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{
                background: "var(--color-canvas-subtle)",
                borderBottom: "1px solid var(--color-border-default)",
              }}
            >
              <span className="text-sm font-semibold">
                {issue.assigneeName ?? "Unknown"} <span className="muted font-normal">commented</span>
              </span>
              <span className="muted text-xs">{relative(issue.createdAt)}</span>
            </div>
            <div className="p-4 text-sm leading-6">{issue.description}</div>
          </div>

          {/* comments */}
          {comments.map((c) => (
            <div key={c.id} className="box mb-4 overflow-hidden">
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{
                  background: "var(--color-canvas-subtle)",
                  borderBottom: "1px solid var(--color-border-default)",
                }}
              >
                <span className="text-sm font-semibold">
                  {c.authorName} <span className="muted font-normal">commented</span>
                </span>
                <span className="muted text-xs">{relative(c.at)}</span>
              </div>
              <div className="p-4 text-sm leading-6">{c.body}</div>
            </div>
          ))}

          {/* new comment */}
          <div className="box overflow-hidden mt-6">
            <div
              className="px-4 py-2.5"
              style={{
                background: "var(--color-canvas-subtle)",
                borderBottom: "1px solid var(--color-border-default)",
              }}
            >
              <span className="text-sm font-semibold">Add a comment</span>
            </div>
            <div className="p-4">
              <textarea
                className="form-control"
                rows={4}
                placeholder="Leave a comment"
                defaultValue=""
              />
              <div className="flex justify-end gap-2 mt-3">
                <button className="btn btn-sm" type="button">
                  Close issue
                </button>
                <button className="btn btn-sm btn-primary" type="button">
                  Comment
                </button>
              </div>
            </div>
          </div>

          {/* activity log */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ClockIcon size={14} />
              Activity log
              <span className="counter">{activity.length}</span>
            </h3>
            <div className="box overflow-hidden">
              {activity.map((a) => (
                <div key={a.id} className="activity-item px-4">
                  <div className="activity-dot">
                    {a.action === "transitioned" && <IssueOpenedIcon size={14} />}
                    {a.action === "commented" && <CommentIcon size={14} />}
                    {a.action === "assigned" && <PersonIcon size={14} />}
                    {a.action === "labeled" && <TagIcon size={14} />}
                    {a.action === "created" && <PlusIcon size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-semibold">{a.actor}</span>{" "}
                      <span className="muted">{a.action}</span>{" "}
                      {a.detail && <span className="text-[color:var(--color-fg-default)]">{a.detail}</span>}
                    </div>
                    <div className="muted text-xs">{relative(a.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right rail */}
        <aside>
          <div className="side-section" style={{ paddingTop: 0 }}>
            <div className="side-head">ASSIGNEES</div>
            {issue.assigneeName ? (
              <div className="flex items-center gap-2 text-[13px]">
                <div className="w-6 h-6 rounded-full bg-[color:var(--color-canvas-subtle)] border border-[color:var(--color-border-default)] flex items-center justify-center text-xs font-semibold">
                  {issue.assigneeName[0]}
                </div>
                {issue.assigneeName}
              </div>
            ) : (
              <span className="muted text-[13px]">No one assigned</span>
            )}
          </div>
          <div className="side-section">
            <div className="side-head">LABELS</div>
            <div className="flex flex-wrap gap-1.5">
              {issue.labels.map((l) => (
                <span key={l} className="label">
                  <TagIcon size={11} />
                  {l}
                </span>
              ))}
              {issue.labels.length === 0 && <span className="muted text-[13px]">None yet</span>}
            </div>
          </div>
          <div className="side-section">
            <div className="side-head">STATE TRANSITIONS (GoF: State)</div>
            <div className="flex flex-col gap-1.5 text-xs">
              <Link href="#" className="btn btn-sm justify-start">
                → in_progress
              </Link>
              <Link href="#" className="btn btn-sm justify-start">
                → in_review
              </Link>
              <Link href="#" className="btn btn-sm btn-primary justify-start">
                → done (requires approver)
              </Link>
              <Link href="#" className="btn btn-sm justify-start">
                → canceled
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
