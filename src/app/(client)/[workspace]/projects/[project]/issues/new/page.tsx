import Link from "next/link";
import { Layout, workspaceTabs } from "@/components/Shell";
import { store } from "@/lib/demo-store";
import { createIssueAction } from "@/app/(client)/_actions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ workspace: string; project: string }>;
}

export default async function NewIssuePage({ params }: Props) {
  const { project: projectSlug } = await params;
  const workspace = store.workspace();
  const project = store.projectBySlug(projectSlug);

  return (
    <Layout
      crumbs={[
        { label: workspace.name, href: `/${workspace.slug}` },
        { label: project.name, href: `/${workspace.slug}/projects/${project.slug}` },
        { label: "New issue" },
      ]}
      tabs={workspaceTabs(workspace.slug, "projects")}
      userName="Henrique"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1.5">New issue</h1>
        <p className="muted">
          Cria uma nova issue em <span className="font-semibold">{project.name}</span>. Será criada
          em <code className="font-mono">status: backlog</code>; transicione manualmente depois.
        </p>
      </div>
      <form
        action={createIssueAction}
        className="grid gap-4"
        style={{ gridTemplateColumns: "1fr 280px" }}
      >
        <div>
          <input type="hidden" name="projectSlug" value={project.slug} />
          <label className="block mb-4">
            <span className="field-label">Title</span>
            <input
              name="title"
              className="form-control"
              required
              placeholder="Curto e descritivo, ex: Add cache layer to issue search"
            />
          </label>
          <label className="block mb-4">
            <span className="field-label">Description</span>
            <textarea
              name="description"
              className="form-control"
              rows={10}
              placeholder="Descreva o problema, contexto, decisão esperada. Markdown OK."
            />
          </label>
          <div className="flex justify-end gap-2">
            <Link
              href={`/${workspace.slug}/projects/${project.slug}`}
              className="btn btn-sm"
            >
              Cancel
            </Link>
            <button type="submit" className="btn btn-sm btn-primary">
              Submit new issue
            </button>
          </div>
        </div>
        <aside>
          <div className="side-section" style={{ paddingTop: 0 }}>
            <div className="side-head">PRIORITY</div>
            <select name="priority" className="form-control" defaultValue="medium">
              <option value="none">none</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
          </div>
          <div className="side-section">
            <div className="side-head">PROJECT</div>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="lang-dot" style={{ background: project.color }} />
              {project.name}
              <span className="counter">{project.key}</span>
            </div>
          </div>
          <div className="side-section">
            <div className="side-head">CONVENTIONS</div>
            <div className="muted text-xs">
              Issue entra como <code className="font-mono">backlog</code>. Status flow:
              backlog → todo → in_progress → in_review → done (requires approver) | canceled.
            </div>
          </div>
        </aside>
      </form>
    </Layout>
  );
}
