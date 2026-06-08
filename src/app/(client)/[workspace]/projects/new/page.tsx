import Link from "next/link";
import { Layout, workspaceTabs } from "@/components/Shell";
import { getNewProjectPageData } from "@/app/(client)/_data";
import { createProjectAction } from "@/app/(client)/_actions";

export const dynamic = "force-dynamic";

const COLORS = [
  "#0969da",
  "#1f883d",
  "#8250df",
  "#bf8700",
  "#cf222e",
  "#d4a72c",
  "#fd8c73",
  "#218bff",
];

interface Props {
  params: Promise<{ workspace: string }>;
}

export default async function NewProjectPage({ params }: Props) {
  const { workspace: workspaceSlug } = await params;
  const { user, workspace } = await getNewProjectPageData(workspaceSlug);

  return (
    <Layout
      crumbs={[
        { label: workspace.name, href: `/${workspace.slug}` },
        { label: "New project" },
      ]}
      tabs={workspaceTabs(workspace.slug, "projects")}
      userName={user.name}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1.5">Create a new project</h1>
        <p className="muted">
          Um projeto agrupa issues, labels e sprints sob uma key curta (ex: TRK-123).
          Validações mirror das domain entities do core (Project.create).
        </p>
      </div>
      <form
        action={createProjectAction}
        className="grid gap-4"
        style={{ gridTemplateColumns: "1fr 280px" }}
      >
        <input type="hidden" name="workspaceSlug" value={workspace.slug} />
        <div>
          <label className="block mb-4">
            <span className="field-label">Project name</span>
            <input
              name="name"
              className="form-control"
              required
              minLength={2}
              maxLength={100}
              placeholder="Trackr Mobile App"
            />
          </label>
          <label className="block mb-4">
            <span className="field-label">URL slug</span>
            <input
              name="slug"
              className="form-control"
              required
              pattern="[a-z][a-z0-9-]{1,30}"
              title="lowercase kebab-case, começa com letra, 2-31 chars"
              placeholder="trackr-mobile"
            />
            <div className="muted text-xs mt-1.5">
              Aparece nas URLs: <code className="font-mono">/{workspace.slug}/projects/&lt;slug&gt;</code>.
              Lowercase kebab-case.
            </div>
          </label>
          <label className="block mb-4">
            <span className="field-label">Issue key prefix</span>
            <input
              name="key"
              className="form-control"
              required
              pattern="[A-Za-z][A-Za-z0-9]{1,9}"
              title="UPPERCASE alphanumeric, 2-10 chars"
              placeholder="TRKM"
              style={{ textTransform: "uppercase", maxWidth: 200 }}
            />
            <div className="muted text-xs mt-1.5">
              Usado nos números de issue: <code className="font-mono">TRKM-123</code>.
              UPPERCASE, 2-10 caracteres alfanuméricos.
            </div>
          </label>
          <label className="block mb-4">
            <span className="field-label">Description</span>
            <textarea
              name="description"
              className="form-control"
              rows={4}
              placeholder="Para que serve este projeto?"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Link href={`/${workspace.slug}`} className="btn btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-sm btn-primary">
              Create project
            </button>
          </div>
        </div>
        <aside>
          <div className="side-section" style={{ paddingTop: 0 }}>
            <div className="side-head">COLOR</div>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((c, i) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c}
                    defaultChecked={i === 0}
                    className="sr-only peer"
                  />
                  <span
                    className="block w-10 h-10 rounded-full border-2 border-transparent peer-checked:border-[color:var(--color-fg-default)]"
                    style={{ background: c }}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="side-section">
            <div className="side-head">DOMAIN VALIDATION</div>
            <div className="muted text-xs leading-5">
              Mesmas regras de <code className="font-mono">Project.create()</code> no domain:
              name 2-100 chars, slug kebab-case, key UPPERCASE 2-10. Validação tanto no
              client (HTML5 pattern) quanto no Server Action.
            </div>
          </div>
        </aside>
      </form>
    </Layout>
  );
}
